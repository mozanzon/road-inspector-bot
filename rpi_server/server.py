import asyncio
import websockets
import serial
import threading
import json
import time

# Configuration
SERIAL_PORT = '/dev/ttyACM0' # Or /dev/ttyUSB0
BAUD_RATE = 115200
WS_PORT = 8765

latest_data = '{"yaw": 0.0, "pitch": 0.0, "roll": 0.0}'

def serial_reader():
    """Reads data from the Arduino continuously."""
    global latest_data
    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        print(f"[SERIAL] Connected to {SERIAL_PORT} @ {BAUD_RATE}")
        while True:
            if ser.in_waiting > 0:
                line = ser.readline().decode('utf-8').strip()
                # Extremely primitive validation of JSON structure
                if line.startswith('{') and line.endswith('}'):
                    latest_data = line
    except serial.SerialException as e:
        print(f"[SERIAL] Error: {e}")
        print("[SERIAL] Will run with dummy data for testing.")
        
        # Test mode if no serial device is connected
        yaw = 0
        while True:
            yaw = (yaw + 1) % 360
            latest_data = f'{{"yaw": {yaw}, "pitch": 0.0, "roll": 0.0}}'
            time.sleep(0.02)

async def ws_handler(websocket):
    """Handles WebSocket connections and broadcasts the latest serial data."""
    # Note: Using `websocket.remote_address` or similar works in older websockets,
    # in websockets 11+ the param is just `websocket` for handler.
    print(f"[WS] Client connected")
    try:
        while True:
            await websocket.send(latest_data)
            await asyncio.sleep(0.02) # 50 Hz rate
    except websockets.exceptions.ConnectionClosed:
        print("[WS] Client disconnected")

async def main():
    # Start the serial reading loop in a background thread
    threading.Thread(target=serial_reader, daemon=True).start()
    
    # Start WebSocket Server
    async with websockets.serve(ws_handler, "0.0.0.0", WS_PORT):
        print(f"[WS] Server started on ws://0.0.0.0:{WS_PORT}")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nShutting down server.")
