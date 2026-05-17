import asyncio
import base64
import json
import logging
import threading
import time
import cv2
import websockets
import argparse

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("camera_bridge")

class CameraStreamer:
    def __init__(self, host, port, camera_index=0, width=640, height=480, fps=15):
        self.host = host
        self.port = port
        self.camera_index = camera_index
        self.width = width
        self.height = height
        self.fps = fps
        
        self.clients = set()
        self.running = False
        self.latest_frame_b64 = None
        self.lock = threading.Lock()

    def start_camera_thread(self):
        self.running = True
        threading.Thread(target=self._camera_loop, daemon=True).start()

    def _camera_loop(self):
        # Try to open the camera (DirectShow is often faster on Windows)
        cap = cv2.VideoCapture(self.camera_index)
        if not cap.isOpened():
            logger.error(f"Failed to open camera index {self.camera_index}. Try a different --camera index.")
            return
            
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        cap.set(cv2.CAP_PROP_FPS, self.fps)
        
        delay = 1.0 / self.fps
        logger.info(f"Camera {self.camera_index} opened successfully, streaming at ~{self.fps} FPS")

        while self.running:
            start_time = time.time()
            ret, frame = cap.read()
            
            if ret and frame is not None:
                # Resize if needed
                if frame.shape[1] != self.width or frame.shape[0] != self.height:
                    frame = cv2.resize(frame, (self.width, self.height))
                    
                # Encode to JPEG
                ok, encoded = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 60])
                if ok:
                    with self.lock:
                        self.latest_frame_b64 = base64.b64encode(encoded).decode("ascii")
            else:
                logger.warning("Failed to read frame from camera")
                time.sleep(1)
            
            # Control frame rate
            elapsed = time.time() - start_time
            if elapsed < delay:
                time.sleep(delay - elapsed)

        cap.release()

    async def handle_client(self, websocket, path=None):
        self.clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.clients)}")
        try:
            # Keep connection open, ignore incoming messages
            async for _ in websocket:
                pass
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            self.clients.discard(websocket)
            logger.info(f"Client disconnected. Total clients: {len(self.clients)}")

    async def broadcast_loop(self):
        while self.running:
            frame_b64 = None
            with self.lock:
                frame_b64 = self.latest_frame_b64

            if frame_b64 and self.clients:
                payload = {
                    "frame": frame_b64
                }
                message = json.dumps(payload)
                
                # Send to all clients concurrently
                results = await asyncio.gather(
                    *[asyncio.wait_for(client.send(message), timeout=1.0) for client in self.clients],
                    return_exceptions=True
                )
                
                # Clean up failed clients
                for client, result in zip(list(self.clients), results):
                    if isinstance(result, Exception):
                        self.clients.discard(client)

            await asyncio.sleep(1.0 / self.fps)

    async def run(self):
        self.start_camera_thread()
        logger.info(f"Starting WebSocket server on ws://{self.host}:{self.port}")
        
        # Start WebSocket Server
        async with websockets.serve(self.handle_client, self.host, self.port):
            await self.broadcast_loop()


def main():
    parser = argparse.ArgumentParser(description="Standalone Camera WebSocket Streamer (No Arduino)")
    parser.add_argument("--host", default="0.0.0.0", help="WebSocket server host")
    parser.add_argument("--port", type=int, default=8765, help="WebSocket server port")
    parser.add_argument("--camera", type=int, default=1, help="Camera index (default 1 for external, use 0 for built-in)")
    parser.add_argument("--width", type=int, default=640, help="Frame width")
    parser.add_argument("--height", type=int, default=480, help="Frame height")
    parser.add_argument("--fps", type=int, default=15, help="Target frames per second")
    args = parser.parse_args()

    streamer = CameraStreamer(
        host=args.host,
        port=args.port,
        camera_index=args.camera,
        width=args.width,
        height=args.height,
        fps=args.fps
    )
    
    try:
        asyncio.run(streamer.run())
    except KeyboardInterrupt:
        logger.info("Server stopped.")

if __name__ == "__main__":
    main()
