#!/usr/bin/env python3
"""Fast Raspberry Pi bridge for Arduino telemetry and camera streaming."""

import argparse
import asyncio
import base64
import json
import logging
import os
import threading
import time
from collections import deque
from datetime import datetime

import cv2
import serial
import websockets

# Serial port auto-detection order: USB first, then GPIO UART
ARDUINO_PORT_CANDIDATES = ["/dev/ttyUSB0", "/dev/ttyAMA0"]


def detect_arduino_port(preferred=None):
    """Return the first available Arduino serial port.

    Priority:
      1. The port explicitly passed via --arduino-port (if it exists)
      2. /dev/ttyUSB0  (Uno via USB)
      3. /dev/ttyAMA0  (Uno via GPIO UART / Pi native UART)
    """
    candidates = ([preferred] if preferred else []) + ARDUINO_PORT_CANDIDATES
    seen = set()
    for port in candidates:
        if port and port not in seen:
            seen.add(port)
            if os.path.exists(port):
                logger.info("Auto-detected Arduino port: %s", port)
                return port
    logger.warning(
        "No Arduino port found in %s. Defaulting to %s.",
        candidates,
        ARDUINO_PORT_CANDIDATES[0],
    )
    return ARDUINO_PORT_CANDIDATES[0]

WHEEL_TRACK_M = 0.57
MAX_LINEAR_MS = 1.0

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[logging.FileHandler("robot_bridge.log"), logging.StreamHandler()],
)
logger = logging.getLogger("robot_bridge")


def clamp(value, low, high):
    return max(low, min(high, value))


def motor_command_to_arduino(data):
    """Translate frontend messages to the Arduino sketch protocol."""
    cmd_type = data.get("type")

    if cmd_type == "motor":
        left_pwm = clamp(int(data.get("left", 0)), -255, 255)
        right_pwm = clamp(int(data.get("right", 0)), -255, 255)
        left_ms = (left_pwm / 255.0) * MAX_LINEAR_MS
        right_ms = (right_pwm / 255.0) * MAX_LINEAR_MS
        v = (left_ms + right_ms) / 2.0
        omega = (right_ms - left_ms) / WHEEL_TRACK_M
        return f"CMD,{v:.3f},{omega:.3f}"

    if cmd_type == "movement":
        action = str(data.get("action", "")).lower()
        speed = clamp(int(data.get("speed", 200)), 0, 255)
        if action == "forward":
            return f"FORWARD {speed}"
        if action == "backward":
            return f"BACKWARD {speed}"
        if action == "left":
            return f"TURN_LEFT_90 {max(speed, 1)}"
        if action == "right":
            return f"TURN_RIGHT_90 {max(speed, 1)}"

    if cmd_type == "stop":
        return "STOP"

    if cmd_type == "status":
        return "TELEMETRY_READ"

    if cmd_type == "raw":
        raw = str(data.get("command", "")).strip()
        return raw or None

    return None


class ArduinoReader:
    def __init__(self, port="/dev/ttyUSB0", baudrate=115200, timeout=0.05):
        self.port = port
        self.baudrate = baudrate
        self.timeout = timeout
        self.serial = None
        self.running = False
        self.data_buffer = deque(maxlen=25)
        self.lock = threading.Lock()
        self.write_lock = threading.Lock()

    def connect(self):
        try:
            # If the configured port doesn't exist, try the fallback automatically
            if not os.path.exists(self.port):
                fallback = detect_arduino_port(self.port)
                logger.warning(
                    "Port %s not found. Trying %s instead.", self.port, fallback
                )
                self.port = fallback
            self.serial = serial.Serial(self.port, self.baudrate, timeout=self.timeout)
            time.sleep(2)
            self.serial.reset_input_buffer()
            self.running = True
            logger.info("Connected to Arduino on %s", self.port)
            self.send_command("TELEMETRY_STREAM 100")
            return True
        except Exception as exc:
            logger.error("Failed to connect to Arduino: %s", exc)
            return False

    def start_reading(self):
        threading.Thread(target=self._read_loop, daemon=True).start()

    def _read_loop(self):
        while self.running:
            try:
                if not self.serial:
                    time.sleep(0.05)
                    continue

                raw = self.serial.readline()
                if not raw:
                    continue

                line = raw.decode("utf-8", errors="ignore").strip()
                if line:
                    parsed = self._parse_line(line)
                    with self.lock:
                        self.data_buffer.append(
                            {
                                "timestamp": datetime.now().isoformat(),
                                "raw": line,
                                "parsed": parsed,
                            }
                        )
            except Exception as exc:
                logger.warning("Arduino read error: %s", exc)
                time.sleep(0.1)

    @staticmethod
    def _parse_line(line):
        if line.startswith("TELEMETRY,"):
            parts = line.split(",")
            if len(parts) >= 14:
                return {
                    "type": "telemetry",
                    "heading": float(parts[1]),
                    "x": float(parts[2]),
                    "y": float(parts[3]),
                    "theta": float(parts[4]),
                    "lat": float(parts[5]),
                    "lon": float(parts[6]),
                    "enc_left_delta": int(parts[7]),
                    "enc_right_delta": int(parts[8]),
                    "dt_ms": int(parts[9]),
                    "speed_mps": float(parts[10]),
                    "dash_cm": float(parts[11]),
                    "gap_cm": float(parts[12]),
                }

        if line.startswith("ERROR:"):
            return {"type": "error", "message": line[6:].strip()}

        if line.startswith("ACK:"):
            return {"type": "ack", "message": line[4:].strip()}

        return {"type": "status", "message": line}

    def send_command(self, cmd):
        if not cmd:
            return False
        try:
            with self.write_lock:
                if self.serial and self.serial.is_open:
                    self.serial.write((cmd + "\n").encode("utf-8"))
                    return True
        except Exception as exc:
            logger.error("Failed to send command '%s': %s", cmd, exc)
        return False

    def get_latest_data(self):
        with self.lock:
            return self.data_buffer[-1] if self.data_buffer else None

    def stop(self):
        self.running = False
        if self.serial:
            self.serial.close()


class CameraCapture:
    def __init__(self, camera_id=0, width=640, height=480, fps=20, jpeg_quality=65):
        self.camera_id = camera_id
        self.width = width
        self.height = height
        self.fps = fps
        self.jpeg_quality = jpeg_quality
        self.cap = None
        self.current_frame = None
        self.lock = threading.Lock()
        self.running = False

    def initialize(self):
        self.cap = cv2.VideoCapture(self.camera_id)
        if not self.cap.isOpened():
            logger.error("Failed to open camera %s", self.camera_id)
            return False

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        self.cap.set(cv2.CAP_PROP_FPS, self.fps)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
        self.running = True
        logger.info("Camera initialized: %sx%s@%sfps", self.width, self.height, self.fps)
        return True

    def start_capturing(self):
        threading.Thread(target=self._capture_loop, daemon=True).start()

    def _capture_loop(self):
        delay = 1.0 / max(self.fps, 1)
        while self.running and self.cap:
            ok, frame = self.cap.read()
            if ok:
                with self.lock:
                    self.current_frame = frame
            else:
                time.sleep(0.1)
                continue
            time.sleep(delay * 0.25)

    def get_encoded_frame(self):
        with self.lock:
            frame = self.current_frame
        if frame is None:
            return None
        ok, buffer = cv2.imencode(
            ".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), self.jpeg_quality]
        )
        if not ok:
            return None
        return base64.b64encode(buffer).decode("ascii")

    def release(self):
        self.running = False
        if self.cap:
            self.cap.release()


class RobotBridge:
    def __init__(
        self,
        arduino_port="/dev/ttyUSB0",
        websocket_host="0.0.0.0",
        websocket_port=8765,
        camera_id=0,
        width=640,
        height=480,
        fps=20,
        jpeg_quality=65,
    ):
        self.arduino = ArduinoReader(arduino_port)
        self.camera = CameraCapture(camera_id, width, height, fps, jpeg_quality)
        self.websocket_host = websocket_host
        self.websocket_port = websocket_port
        self.clients = set()
        self.running = False
        self.loop_fps = deque(maxlen=30)

    def initialize(self):
        logger.info("Initializing Robot Bridge")
        if not self.arduino.connect():
            return False
        if not self.camera.initialize():
            return False

        self.arduino.start_reading()
        self.camera.start_capturing()
        self.running = True
        return True

    async def handle_client(self, websocket):
        self.clients.add(websocket)
        logger.info("Client connected. Total: %s", len(self.clients))
        try:
            async for message in websocket:
                await self.handle_message(message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.discard(websocket)
            logger.info("Client disconnected. Total: %s", len(self.clients))

    async def handle_message(self, message):
        try:
            command = motor_command_to_arduino(json.loads(message))
            if command:
                self.arduino.send_command(command)
            else:
                logger.warning("Unsupported command: %s", message)
        except json.JSONDecodeError:
            logger.warning("Invalid JSON received: %s", message)
        except Exception as exc:
            logger.error("Message handling error: %s", exc)

    async def broadcast_data(self):
        frame_count = 0
        frame_time = time.time()

        while self.running:
            started = time.time()
            latest = self.arduino.get_latest_data()
            payload = {
                "timestamp": datetime.now().isoformat(),
                "arduino": latest["parsed"] if latest else None,
                "stats": {
                    "connected_clients": len(self.clients),
                    "loop_fps": sum(self.loop_fps) / len(self.loop_fps) if self.loop_fps else 0,
                    "inference_fps": 0,
                },
            }

            clients = tuple(self.clients)
            if clients:
                frame = self.camera.get_encoded_frame()
                if frame:
                    payload["frame"] = frame

                message = json.dumps(payload, separators=(",", ":"))
                results = await asyncio.gather(
                    *(client.send(message) for client in clients), return_exceptions=True
                )
                for client, result in zip(clients, results):
                    if isinstance(result, Exception):
                        self.clients.discard(client)

            frame_count += 1
            elapsed = time.time() - frame_time
            if elapsed >= 1.0:
                self.loop_fps.append(frame_count / elapsed)
                frame_count = 0
                frame_time = time.time()

            await asyncio.sleep(max(0.0, 0.05 - (time.time() - started)))

    async def start_websocket_server(self):
        logger.info("WebSocket server listening on ws://%s:%s", self.websocket_host, self.websocket_port)
        async with websockets.serve(
            self.handle_client,
            self.websocket_host,
            self.websocket_port,
            ping_interval=20,
            ping_timeout=20,
            max_queue=1,
        ):
            await self.broadcast_data()

    async def run(self):
        if not self.initialize():
            logger.error("Bridge initialization failed")
            return

        try:
            await self.start_websocket_server()
        finally:
            self.shutdown()

    def shutdown(self):
        self.running = False
        self.arduino.stop()
        self.camera.release()
        logger.info("Bridge shutdown complete")


def main():
    parser = argparse.ArgumentParser(description="Robot Bridge - Raspberry Pi 5")
    parser.add_argument(
        "--arduino-port",
        default=None,
        help="Arduino serial port (default: auto-detect /dev/ttyUSB0 then /dev/ttyAMA0)",
    )
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--camera", type=int, default=0)
    parser.add_argument("--width", type=int, default=640)
    parser.add_argument("--height", type=int, default=480)
    parser.add_argument("--fps", type=int, default=20)
    parser.add_argument("--jpeg-quality", type=int, default=65)
    args = parser.parse_args()

    arduino_port = detect_arduino_port(args.arduino_port)

    bridge = RobotBridge(
        arduino_port=arduino_port,
        websocket_host=args.host,
        websocket_port=args.port,
        camera_id=args.camera,
        width=args.width,
        height=args.height,
        fps=args.fps,
        jpeg_quality=args.jpeg_quality,
    )
    asyncio.run(bridge.run())


if __name__ == "__main__":
    main()
