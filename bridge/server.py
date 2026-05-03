import asyncio
import json
import logging
import base64
import time
import os
import cv2
import numpy as np
import onnxruntime as ort
import serial
import serial.tools.list_ports
import websockets

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("RPi_Server")

# Configuration
WS_PORT = 8080
SERIAL_BAUD = 115200
MODEL_PATH = "../model/best.onnx"

class RobotServer:
    def __init__(self):
        self.serial_conn = None
        self.clients = set()
        self.ai_enabled = False
        self.camera = None
        self.ort_session = None
        self.telemetry = {
            "battery": 0, "signal": 100, "cpu": 0, "memory": 0,
            "temperature": 0, "uptime": 0, "leftMotorRPM": 0,
            "rightMotorRPM": 0, "paintLevel": 100, "distanceTraveled": 0,
            "cracksDetected": 0, "potholesDetected": 0
        }
        self.start_time = time.time()
        
        # Connect to Serial
        self.connect_serial()
        
        # Init Camera
        self.init_camera()
        
        # Init ONNX Model
        self.init_model()

    def connect_serial(self):
        ports = list(serial.tools.list_ports.comports())
        for p in ports:
            if "USB" in p.description or "ACM" in p.device or "CH340" in p.description:
                try:
                    self.serial_conn = serial.Serial(p.device, SERIAL_BAUD, timeout=0.1)
                    logger.info(f"Connected to Arduino on {p.device}")
                    return
                except Exception as e:
                    logger.error(f"Failed to connect to {p.device}: {e}")
        logger.warning("Could not find Arduino serial port. Running in simulation mode for serial.")

    def init_camera(self):
        try:
            self.camera = cv2.VideoCapture(0)
            if not self.camera.isOpened():
                logger.warning("Could not open USB camera (index 0).")
                self.camera = None
            else:
                self.camera.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                self.camera.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                logger.info("USB Camera initialized.")
        except Exception as e:
            logger.error(f"Camera error: {e}")

    def init_model(self):
        if os.path.exists(MODEL_PATH):
            try:
                self.ort_session = ort.InferenceSession(MODEL_PATH)
                logger.info("ONNX Model loaded successfully.")
            except Exception as e:
                logger.error(f"Error loading ONNX model: {e}")
        else:
            logger.warning(f"Model not found at {MODEL_PATH}")

    async def read_serial(self):
        while True:
            if self.serial_conn and self.serial_conn.in_waiting:
                try:
                    line = self.serial_conn.readline().decode('utf-8').strip()
                    if line.startswith('{'):
                        # Parse JSON from Arduino
                        data = json.loads(line)
                        # Broadcast to UI
                        await self.broadcast(json.dumps({
                            "type": "telemetry_update",
                            "data": data
                        }))
                except Exception as e:
                    logger.error(f"Serial read error: {e}")
            await asyncio.sleep(0.05)

    def process_frame(self, frame):
        detections = []
        if self.ai_enabled and self.ort_session is not None:
            # Basic YOLO preprocessing (640x640)
            img = cv2.resize(frame, (640, 640))
            img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            img = img.transpose((2, 0, 1)).astype(np.float32) / 255.0
            img = np.expand_dims(img, axis=0)

            try:
                # Run inference
                outputs = self.ort_session.run(None, {self.ort_session.get_inputs()[0].name: img})
                output = outputs[0][0] # shape [25200, 7] roughly for YOLOv5/8
                
                # Simple parsing (dummy boxes for demo, actual parsing depends on specific YOLO version)
                # In real scenario, implement NMS here.
                # For demonstration, we just simulate detections if confidence > threshold
                # Assuming outputs are [x, y, w, h, conf, cls1, cls2]
                for det in output[:10]: # Look at first few for demo
                    conf = det[4]
                    if conf > 0.5:
                        x, y, w, h = det[0], det[1], det[2], det[3]
                        cls_id = int(np.argmax(det[5:]))
                        detections.append({
                            "type": "crack" if cls_id == 0 else "pothole",
                            "x": float((x - w/2) / 640 * 100),
                            "y": float((y - h/2) / 640 * 100),
                            "width": float(w / 640 * 100),
                            "height": float(h / 640 * 100),
                            "confidence": float(conf * 100)
                        })
                        if cls_id == 0: self.telemetry["cracksDetected"] += 1
                        else: self.telemetry["potholesDetected"] += 1
                        
            except Exception as e:
                pass # Fail silently on inference errors to maintain video stream

        return detections

    async def stream_video(self):
        while True:
            if self.camera:
                ret, frame = self.camera.read()
                if ret:
                    detections = self.process_frame(frame)
                    
                    # Encode frame to JPEG
                    _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
                    frame_b64 = base64.b64encode(buffer.tobytes()).decode('utf-8')
                    
                    msg = json.dumps({
                        "type": "video_frame",
                        "frame": frame_b64,
                        "detections": detections
                    })
                    await self.broadcast(msg)
            await asyncio.sleep(0.1) # 10 FPS to save bandwidth

    async def broadcast(self, message):
        if self.clients:
            await asyncio.gather(*[client.send(message) for client in self.clients])

    async def handle_client(self, websocket):
        self.clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.clients)}")
        try:
            async for message in websocket:
                data = json.loads(message)
                cmd_type = data.get("type")
                
                if cmd_type == "command":
                    # Forward to Arduino
                    cmd = data.get("cmd", "")
                    logger.info(f"Sending command to Arduino: {cmd}")
                    if self.serial_conn:
                        self.serial_conn.write(f"{cmd}\n".encode('utf-8'))
                        
                elif cmd_type == "toggle_ai":
                    self.ai_enabled = data.get("enabled", False)
                    logger.info(f"AI Detection {'Enabled' if self.ai_enabled else 'Disabled'}")
                    
        except websockets.exceptions.ConnectionClosed:
            pass
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
        finally:
            self.clients.remove(websocket)
            logger.info("Client disconnected.")

    async def start(self):
        server = await websockets.serve(self.handle_client, "0.0.0.0", WS_PORT)
        logger.info(f"WebSocket Server running on ws://0.0.0.0:{WS_PORT}")
        
        await asyncio.gather(
            self.read_serial(),
            self.stream_video(),
            server.wait_closed()
        )

if __name__ == "__main__":
    robot_server = RobotServer()
    asyncio.run(robot_server.start())
