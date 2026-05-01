# RoadGuard Pi Bridge Server

This is the Python WebSocket server that runs on the Raspberry Pi. It acts as the bridge between the React frontend, the Arduino Mega, the USB Webcam, and the ONNX AI models.

## Features
- **WebSocket Server**: Exposes port `8080` for the React web app.
- **Serial Communication**: Automatically finds the Arduino on `/dev/ttyUSB0` or similar and forwards commands (`FORWARD`, `STOP`, `PAINT_ON`).
- **USB Webcam**: Captures frames using OpenCV (`cv2.VideoCapture(0)`).
- **ONNX AI Inference**: Runs `model/best.onnx` to detect cracks and potholes. AI can be toggled on/off via the app.

## Setup on Raspberry Pi

1. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```
   *(Note: For Raspberry Pi, `onnxruntime` and `opencv-python` might require some apt dependencies like `libgl1-mesa-glx` or building from wheels depending on the OS version).*

2. **Connect Hardware**:
   - Plug the Arduino into a USB port.
   - Plug the USB Webcam into a USB port.
   - Ensure the ONNX models are placed in the `../model/` folder relative to this script.

3. **Run the server**:
   ```bash
   python server.py
   ```

4. **Connect the App**:
   - Open the React web app.
   - On the "Connection" tab, enter the IP address of the Raspberry Pi.
   - Port is `8080`.
   - Click Connect.

## Communication Protocol

### From App to Pi
- **Drive Commands**: `{"type": "command", "cmd": "FORWARD"}`
- **Toggle AI**: `{"type": "toggle_ai", "enabled": true}`

### From Pi to App
- **Video & AI Detections**: 
  ```json
  {
    "type": "video_frame",
    "frame": "<base64_jpg>",
    "detections": [
      {"type": "crack", "x": 10.5, "y": 20.0, "width": 5.0, "height": 5.0, "confidence": 95.5}
    ]
  }
  ```
- **Telemetry**: 
  ```json
  {
    "type": "telemetry_update",
    "data": {
       "encL": 100,
       "encR": 102,
       "pitch": 0.5,
       "roll": -0.2,
       "yaw": 90.0,
       "compass": 90.0,
       "battery": 85
    }
  }
  ```
