#!/usr/bin/env python3
"""
Raspberry Pi 5 Bridge - Arduino Data & Camera Stream
Connects Arduino via Serial, captures camera feed, 
and sends data to React app via WebSocket
"""

import asyncio
import json
import time
import threading
import logging
import base64
import platform
from collections import deque
from datetime import datetime
from pathlib import Path

import cv2
import numpy as np
import serial
import websockets

WHEEL_TRACK_M = 0.57
MAX_LINEAR_MS = 1.0

# ==================== LOGGING SETUP ====================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('robot_bridge.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


DEFAULT_ARDUINO_PORTS = ['/dev/ttyAMA10', '/dev/ttyAMA0', '/dev/ttyUSB0', '/dev/ttyACM0', '/dev/ttyACM10']


def parse_serial_ports(value):
    """Accept a single port or comma-separated fallback list."""
    if isinstance(value, (list, tuple)):
        return [str(port).strip() for port in value if str(port).strip()]
    return [port.strip() for port in str(value).split(',') if port.strip()]


class ArduinoReader:
    """Handles serial communication with Arduino"""
    
    def __init__(self, port=None, baudrate=115200, timeout=1):
        self.ports = parse_serial_ports(port or DEFAULT_ARDUINO_PORTS)
        self.port = self.ports[0]
        self.baudrate = baudrate
        self.timeout = timeout
        self.serial = None
        self.running = False
        self.data_buffer = deque(maxlen=100)
        self.lock = threading.Lock()
        
    def connect(self):
        """Establish serial connection"""
        for port in self.ports:
            try:
                self.serial = serial.Serial(port, self.baudrate, timeout=self.timeout)
                self.port = port
                time.sleep(2)  # Wait for Arduino to initialize
                self.running = True
                logger.info(f"Connected to Arduino on {self.port}")
                return True
            except Exception as e:
                logger.warning(f"Could not connect to Arduino on {port}: {e}")
                self.serial = None
        logger.error(f"Failed to connect to Arduino on any configured port: {', '.join(self.ports)}")
        return False
    
    def start_reading(self):
        """Start reading thread"""
        thread = threading.Thread(target=self._read_loop, daemon=True)
        thread.start()
        
    def _read_loop(self):
        """Continuously read from Arduino"""
        while self.running:
            try:
                if self.serial and self.serial.in_waiting:
                    line = self.serial.readline().decode('utf-8').strip()
                    if line:
                        with self.lock:
                            self.data_buffer.append({
                                'timestamp': datetime.now().isoformat(),
                                'raw': line,
                                'parsed': self._parse_line(line)
                            })
                        logger.debug(f"Arduino: {line}")
            except Exception as e:
                logger.error(f"Error reading from Arduino: {e}")
                time.sleep(0.1)
    
    def _parse_line(self, line):
        """Parse Arduino output lines"""
        data = {}
        try:
            if line.startswith('STATUS|'):
                data['type'] = 'status'
                parts = line.split('|')[1:]
                for part in parts:
                    if '=' not in part:
                        continue
                    key, value = part.split('=', 1)
                    data[key] = self._parse_value(value)
                if 'heading' in data:
                    data['yaw'] = data['heading']
                if 'speed' in data:
                    data['linearVelocity'] = data['speed']

            elif line.startswith('TELEMETRY,'):
                data = self._parse_legacy_telemetry(line)

            elif line.startswith('DATA:COMPASS'):
                parts = line.split('|')[1:]
                data['type'] = 'compass'
                for part in parts:
                    if '=' in part:
                        key, value = part.split('=', 1)
                        data[key] = self._parse_value(value)
                        
            elif line.startswith('DATA:ENCODER'):
                parts = line.split('|')[1:]
                data['type'] = 'encoder'
                for part in parts:
                    if '=' in part:
                        key, value = part.split('=', 1)
                        data[key] = self._parse_value(value)
                            
            elif line.startswith('ACK:'):
                data['type'] = 'ack'
                data['message'] = line.replace('ACK:', '')
                
            elif line.startswith('ERROR:'):
                data['type'] = 'error'
                data['message'] = line.replace('ERROR:', '')
                
            elif line.startswith('STATUS:'):
                data['type'] = 'status'
                parts = line.split('|')[1:]
                for part in parts:
                    if '=' in part:
                        key, value = part.split('=', 1)
                        data[key] = self._parse_value(value)
        except Exception as e:
            logger.warning(f"Failed to parse line '{line}': {e}")
        
        return data

    @staticmethod
    def _parse_value(value):
        """Parse Arduino key/value fields into bool, int, or float."""
        value = value.strip()
        if value in ('true', 'false'):
            return value == 'true'
        try:
            as_float = float(value)
            if as_float.is_integer():
                return int(as_float)
            return as_float
        except ValueError:
            return value

    def _parse_legacy_telemetry(self, line):
        """Parse older TELEMETRY CSV packets if an older sketch is flashed."""
        fields = line.split(',')
        data = {'type': 'status'}
        if len(fields) >= 13:
            data.update({
                'heading': float(fields[1]),
                'yaw': float(fields[1]),
                'odom_x': float(fields[2]),
                'odom_y': float(fields[3]),
                'odom_theta': float(fields[4]),
                'lat': float(fields[5]),
                'lng': float(fields[6]),
                'de1': int(fields[7]),
                'de2': int(fields[8]),
                'dt_ms': int(fields[9]),
                'speed': float(fields[10]),
                'dash_cm': float(fields[11]),
                'gap_cm': float(fields[12]),
            })
        return data
    
    def send_command(self, cmd):
        """Send command to Arduino"""
        try:
            if self.serial:
                self.serial.write((cmd + '\n').encode('utf-8'))
                logger.info(f"Sent command: {cmd}")
                return True
        except Exception as e:
            logger.error(f"Failed to send command: {e}")
        return False
    
    def get_latest_data(self):
        """Get latest sensor data"""
        with self.lock:
            if self.data_buffer:
                return list(self.data_buffer)[-10:]  # Last 10 entries
        return []
    
    def stop(self):
        """Stop reading and close connection"""
        self.running = False
        if self.serial:
            self.serial.close()


class CameraCapture:
    """Handles camera capture"""
    
    def __init__(self, camera_id=0, width=640, height=480, fps=30):
        self.camera_id = camera_id
        self.width = width
        self.height = height
        self.fps = fps
        self.cap = None
        self.current_frame = None
        self.lock = threading.Lock()
        self.running = False
        self.backend = None
        self.last_error = None
        self.frames_captured = 0
        self.frames_encoded = 0
        self.last_frame_at = None
        
    def initialize(self):
        """Initialize camera"""
        if self._initialize_webcam():
            return True
        logger.error(f"Failed to initialize camera: {self.last_error}")
        return False

    def _camera_source(self):
        """Allow --camera 0 or --camera /dev/video0."""
        if isinstance(self.camera_id, str) and self.camera_id.isdigit():
            return int(self.camera_id)
        return self.camera_id

    def _open_capture(self, source, backend):
        if backend is None:
            return cv2.VideoCapture(source)
        return cv2.VideoCapture(source, backend)

    def _initialize_webcam(self):
        """Initialize a USB webcam through OpenCV/V4L2."""
        source = self._camera_source()
        backends = []
        if platform.system().lower() == 'linux':
            backends.append(('opencv-v4l2', cv2.CAP_V4L2))
        backends.append(('opencv', None))

        errors = []
        for backend_name, backend_id in backends:
            if self._try_webcam_backend(source, backend_name, backend_id):
                return True
            errors.append(self.last_error)

        self.last_error = '; '.join([err for err in errors if err]) or f"Could not open webcam {source}"
        return False

    def _try_webcam_backend(self, source, backend_name, backend_id):
        """Try one OpenCV backend and wait briefly for the first real frame."""
        try:
            self.cap = self._open_capture(source, backend_id)
            if not self.cap.isOpened():
                self.last_error = f"{backend_name} could not open webcam {source}"
                self.cap.release()
                self.cap = None
                return False

            self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*'MJPG'))
            self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
            self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
            self.cap.set(cv2.CAP_PROP_FPS, self.fps)
            self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

            frame = None
            deadline = time.time() + 3.0
            while time.time() < deadline:
                ok, candidate = self.cap.read()
                if ok and candidate is not None and candidate.size > 0:
                    frame = candidate
                    break
                time.sleep(0.05)

            if frame is None:
                self.last_error = f"{backend_name} opened webcam {source} but did not return frames after 3s"
                self.cap.release()
                self.cap = None
                return False

            with self.lock:
                self.current_frame = frame
            self.backend = backend_name
            self.running = True
            self.frames_captured = 1
            self.last_frame_at = datetime.now().isoformat()
            logger.info(f"Webcam initialized with {backend_name}: source={source} {self.width}x{self.height}@{self.fps}fps")
            return True
        except Exception as e:
            self.last_error = f"{backend_name} webcam error: {e}"
            if self.cap:
                self.cap.release()
                self.cap = None
            return False
    
    def start_capturing(self):
        """Start capture thread"""
        thread = threading.Thread(target=self._capture_loop, daemon=True)
        thread.start()
    
    def _capture_loop(self):
        """Continuously capture frames"""
        failure_count = 0
        while self.running:
            try:
                frame = None
                if self.backend in ('opencv', 'opencv-v4l2') and self.cap:
                    ret, frame = self.cap.read()
                    if not ret:
                        frame = None

                if frame is not None and frame.size > 0:
                    failure_count = 0
                    self.last_error = None
                    self.frames_captured += 1
                    self.last_frame_at = datetime.now().isoformat()
                    with self.lock:
                        self.current_frame = frame
                else:
                    failure_count += 1
                    self.last_error = f"Failed to capture frame from {self.backend or 'unknown'} camera"
                    if failure_count % 30 == 1:
                        logger.warning(self.last_error)
                    time.sleep(0.1)
            except Exception as e:
                failure_count += 1
                self.last_error = f"Camera capture error: {e}"
                if failure_count % 30 == 1:
                    logger.warning(self.last_error)
                time.sleep(0.1)
    
    def get_frame(self):
        """Get current frame"""
        with self.lock:
            if self.current_frame is not None:
                return self.current_frame.copy()
        return None
    
    def release(self):
        """Release camera"""
        self.running = False
        if self.cap:
            self.cap.release()

    def status(self):
        """Get camera status for clients."""
        with self.lock:
            has_frame = self.current_frame is not None
        return {
            'camera_connected': self.running and self.cap is not None,
            'camera_backend': self.backend,
            'camera_has_frame': has_frame,
            'camera_error': self.last_error,
            'camera_source': str(self.camera_id),
            'camera_frames_captured': self.frames_captured,
            'camera_frames_encoded': self.frames_encoded,
            'camera_last_frame_at': self.last_frame_at,
        }


class RobotBridge:
    """Main bridge connecting all components"""
    
    def __init__(self, arduino_port=None, websocket_host='0.0.0.0', websocket_port=8765):
        self.arduino = ArduinoReader(arduino_port)
        self.camera = CameraCapture()
        self.websocket_host = websocket_host
        self.websocket_port = websocket_port
        self.clients = set()
        self.running = False
        self.loop_fps = deque(maxlen=30)
        
    def initialize(self):
        """Initialize all components"""
        logger.info("Initializing Robot Bridge...")
        
        if not self.arduino.connect():
            logger.error("Failed to initialize Arduino")
            return False
        
        camera_ready = self.camera.initialize()
        if not camera_ready:
            logger.error("Camera unavailable; bridge will continue without video frames")
        
        self.arduino.start_reading()
        if camera_ready:
            self.camera.start_capturing()
        self.running = True
        
        logger.info("Robot Bridge initialized successfully")
        return True
    
    async def handle_client(self, websocket, path):
        """Handle WebSocket client connection"""
        self.clients.add(websocket)
        logger.info(f"Client connected. Total: {len(self.clients)}")
        
        try:
            async for message in websocket:
                await self.handle_message(message, websocket)
        except websockets.exceptions.ConnectionClosed:
            logger.info("Client disconnected")
        finally:
            self.clients.discard(websocket)
    
    async def handle_message(self, message, websocket):
        """Handle incoming message from client"""
        try:
            data = json.loads(message)
            cmd_type = data.get('type')
            
            if cmd_type == 'motor':
                # Format: {'type': 'motor', 'left': 200, 'right': 150}
                left = max(-255, min(255, float(data.get('left', 0))))
                right = max(-255, min(255, float(data.get('right', 0))))
                left_ms = (left / 255.0) * MAX_LINEAR_MS
                right_ms = (right / 255.0) * MAX_LINEAR_MS
                v = (left_ms + right_ms) / 2.0
                omega = (right_ms - left_ms) / WHEEL_TRACK_M
                self.arduino.send_command(f"CMD,{v:.3f},{omega:.3f}")
                
            elif cmd_type == 'movement':
                # Format: {'type': 'movement', 'action': 'forward', 'speed': 200}
                action = data.get('action', '').lower()
                speed = max(0, min(255, int(data.get('speed', 200))))
                command_map = {
                    'forward': f"FORWARD {speed}",
                    'backward': f"BACKWARD {speed}",
                    'left': f"TURN_LEFT_90 {speed}",
                    'right': f"TURN_RIGHT_90 {speed}",
                }
                command = command_map.get(action)
                if command:
                    self.arduino.send_command(command)
                    
            elif cmd_type == 'stop':
                self.arduino.send_command("STOP")
                
            elif cmd_type == 'status':
                self.arduino.send_command("STATUS")
                
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON received: {message}")
        except Exception as e:
            logger.error(f"Error handling message: {e}")
    
    async def broadcast_data(self):
        """Broadcast sensor and data to all clients"""
        frame_count = 0
        frame_time = time.time()
        
        while self.running:
            try:
                # Get sensor data
                arduino_data = self.arduino.get_latest_data()
                
                # Capture and process frame
                frame = self.camera.get_frame()
                
                if frame is not None:
                    # Encode frame
                    ok, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                    if ok:
                        self.camera.frames_encoded += 1
                        frame_base64 = base64.b64encode(buffer).decode()
                    else:
                        self.camera.last_error = "OpenCV failed to JPEG-encode webcam frame"
                        frame_base64 = None
                else:
                    frame_base64 = None
                
                # Prepare broadcast data
                broadcast_data = {
                    'timestamp': datetime.now().isoformat(),
                    'arduino': arduino_data[-1]['parsed'] if arduino_data else None,
                    'stats': {
                        'connected_clients': len(self.clients),
                        'loop_fps': sum(self.loop_fps) / len(self.loop_fps) if self.loop_fps else 0,
                        **self.camera.status(),
                    }
                }
                
                # Add frame only if there are clients
                if self.clients and frame_base64:
                    broadcast_data['frame'] = frame_base64
                
                # Broadcast to all clients
                if self.clients:
                    message = json.dumps(broadcast_data, default=str)
                    await asyncio.gather(
                        *[client.send(message) for client in self.clients],
                        return_exceptions=True
                    )
                
                # Calculate FPS
                frame_count += 1
                elapsed = time.time() - frame_time
                if elapsed >= 1.0:
                    self.loop_fps.append(frame_count / elapsed)
                    frame_count = 0
                    frame_time = time.time()
                
                await asyncio.sleep(0.05)  # ~20 FPS
                
            except Exception as e:
                logger.error(f"Error in broadcast loop: {e}")
                await asyncio.sleep(1)
    
    async def start_websocket_server(self):
        """Start WebSocket server"""
        logger.info(f"Starting WebSocket server on ws://{self.websocket_host}:{self.websocket_port}")
        
        async with websockets.serve(self.handle_client, self.websocket_host, self.websocket_port):
            await self.broadcast_data()
    
    async def run(self):
        """Run the bridge"""
        if not self.initialize():
            logger.error("Failed to initialize bridge")
            return
        
        try:
            await self.start_websocket_server()
        except KeyboardInterrupt:
            logger.info("Shutting down...")
        finally:
            self.shutdown()
    
    def shutdown(self):
        """Clean shutdown"""
        self.running = False
        self.arduino.stop()
        self.camera.release()
        logger.info("Bridge shutdown complete")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Robot Bridge - Raspberry Pi 5')
    parser.add_argument(
        '--arduino-port',
        default=','.join(DEFAULT_ARDUINO_PORTS),
        help='Arduino serial port or comma-separated fallback list',
    )
    parser.add_argument('--host', default='0.0.0.0', help='WebSocket host')
    parser.add_argument('--port', type=int, default=8765, help='WebSocket port')
    parser.add_argument('--camera', default='0', help='Webcam index or path, e.g. 0 or /dev/video0')
    
    args = parser.parse_args()
    
    bridge = RobotBridge(
        arduino_port=args.arduino_port,
        websocket_host=args.host,
        websocket_port=args.port
    )
    
    bridge.camera.camera_id = args.camera
    
    asyncio.run(bridge.run())


if __name__ == '__main__':
    main()
