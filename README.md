# Road Inspector Bot

An autonomous road inspection robot with real-time video streaming, IMU-based orientation sensing, and web-based remote control interface.

## Overview

Road Inspector Bot is a Raspberry Pi + Arduino mobile robot platform designed for automated road surface inspection. It combines:

- **Arduino-based motor control** with IMU (MPU-9250) for precise movement and heading awareness
- **Raspberry Pi-based vision system** with live MJPEG video streaming
- **Flask web server** providing a responsive dashboard for real-time control and monitoring
- **Server-Sent Events (SSE)** for live IMU telemetry (accelerometer, gyroscope, compass heading)

## System Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Raspberry Pi                        │
│  ┌─────────────────────────────────────────────┐    │
│  │         vision_control_server.py            │    │
│  │  ┌──────────┐  ┌──────────┐  ┌───────────┐ │    │
│  │  │  Camera  │  │  Flask   │  │  IMU SSE  │ │    │
│  │  │  MJPEG   │  │  Server  │  │  Stream   │ │    │
│  │  └────┬─────┘  └────┬─────┘  └─────┬─────┘ │    │
│  │       │             │              │         │    │
│  └───────┼─────────────┼──────────────┼─────────┘    │
│          │             │              │              │
│          │      USB Serial (115200)   │              │
│          └─────────────┼──────────────┘              │
└────────────────────────┼─────────────────────────────┘
                         │
┌────────────────────────┼─────────────────────────────┐
│                    Arduino Mega                        │
│  ┌─────────────────────┼───────────────────────────┐  │
│  │   motor_imu_controller.ino                       │  │
│  │  ┌──────────────┐  ┌──────────────────────────┐ │  │
│  │  │ Motor Driver │  │  MPU-9250 IMU (I2C)     │ │  │
│  │  │ BTS7960      │  │  - Accelerometer         │ │  │
│  │  │ - Left Motor │  │  - Gyroscope             │ │  │
│  │  │ - Right Motor│  │  - Magnetometer (Compass)│ │  │
│  │  └──────────────┘  └──────────────────────────┘ │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## Features

### Motor Control
- **Differential drive** with independent left/right motor channels
- **Smooth ramping** for acceleration/deceleration (50 steps over 800ms)
- **Emergency stop** with immediate motor cutoff
- **IMU-assisted heading control** — relative 90° left/right turns
- **Dynamic speed adjustment** via `SET_SPEED` command without changing direction

### IMU Telemetry
- **MPU-9250 9-axis sensor** (accelerometer + gyroscope + magnetometer)
- **Configurable streaming** from 2 Hz to 50 Hz (adjustable interval)
- **One-shot reads** for on-demand sensor snapshots
- **Compass heading calculation** from magnetometer data
- **Real-time visualization**: compass gauge, accelerometer rolling chart

### Vision System
- **Live MJPEG streaming** at 320x240 @ 20 FPS (configurable)
- **V4L2 hardware acceleration** with MJPG/YUYV fallback
- **Multi-threaded capture + encode pipeline** for low latency
- **Snapshot endpoint** for single-frame capture
- **Configurable JPEG quality** for bandwidth tuning

### Web Dashboard
- **Responsive mobile-friendly UI** with dark theme
- **Live video feed** embedded in control panel
- **Speed slider** with real-time motor speed adjustment
- **Directional control pad** (forward, backward, left/right turns, emergency stop)
- **IMU visualization panel** with compass needle and accel history graph
- **System status endpoint** with FPS, connection, and subscriber metrics

## Hardware Requirements

| Component | Description |
|-----------|-------------|
| **Arduino Mega** | Motor, encoder, and IMU real-time controller |
| **MPU-9250 IMU Module** | 9-axis sensor via I2C (SDA=20, SCL=21 on Mega) |
| **Motor Driver** | BTS7960 (IBT-2) x2 |
| **DC Motors x2** | Differential drive configuration |
| **Raspberry Pi** | Raspberry Pi 5 recommended (runs vision server) |
| **USB Camera** | UVC-compatible (e.g., Raspberry Pi Camera Module via USB adapter) |
| **Power Supply** | Appropriate for motors and Arduino/Pi |

### Wiring Diagram

**Arduino Motor Connections:**
```
Left Motor (M1):
  RPWM → Pin 5
  LPWM → Pin 6
  R_EN → Pin 7
  L_EN → Pin 8

Right Motor (M2):
  RPWM → Pin 9
  LPWM → Pin 10
  R_EN → Pin 11
  L_EN → Pin 12

MPU-9250 IMU (I2C):
   SDA → Pin 20 (Mega)
   SCL → Pin 21 (Mega)
  VCC → 3.3V
  GND → GND
```

**Raspberry Pi ↔ Arduino:**
```
Pi USB → Arduino USB-B (serial communication @ 115200 baud)
```

## Software Dependencies

### Arduino (motor_imu_controller.ino)
- [FaBo9Axis_MPU9250 Library](https://github.com/FaBoPlatform/FaBo9AXIS-MPU9250-Library) — Install via Arduino Library Manager
- Standard Arduino Wire library (included in Arduino IDE)

### Raspberry Pi (vision_control_server.py)
- Python 3.7+
- OpenCV (`opencv-python`)
- Flask (`flask`)
- PySerial (`pyserial`)
- Pi Camera or USB webcam with V4L2 support

**Install Python dependencies:**
```bash
pip3 install opencv-python flask pyserial
```

## Installation

### 1. Arduino Setup

1. Install the **FaBo9Axis_MPU9250** library via Arduino IDE → Sketch → Include Library → Manage Libraries
2. Upload `motor_imu_controller/motor_imu_controller.ino` to your Arduino Mega
3. Open Serial Monitor (115200 baud) to verify initialization:
   ```
   configuring 9axis...
   configured FaBo 9Axis I2C Brick
   Ready.
   ```

### 2. Raspberry Pi Setup

1. Clone this repository:
   ```bash
   git clone <repository-url>
   cd road-inspector-bot
   ```

2. Install dependencies:
   ```bash
   pip3 install opencv-python flask pyserial
   ```

3. Ensure camera is detected:
   ```bash
   v4l2-ctl --list-devices
   ```

4. Run the vision control server:
   ```bash
   python3 vision_control_server.py
   ```

5. Access the web dashboard:
   ```
   http://<raspberry-pi-ip>:8080/
   ```

## Usage

### Serial Command Reference

Send commands to the Arduino via serial (115200 baud, 8N1):

| Command | Description |
|---------|-------------|
| `FORWARD <0-255>` | Move forward with ramp-up to specified speed |
| `BACKWARD <0-255>` | Move backward with ramp-up to specified speed |
| `SET_SPEED <0-255>` | Update current motor speed without changing direction |
| `TURN_LEFT_90 <1-255>` | Relative left 90° turn using compass heading |
| `TURN_RIGHT_90 <1-255>` | Relative right 90° turn using compass heading |
| `STOP` | Stop motors |
| `S` | Emergency stop (immediate cutoff) |
| `CMD,<v_m/s>,<omega_rad/s>` | Differential-drive command for autonomy stack |
| `PID_SET,<kp>,<ki>,<kd>` | Update wheel PID gains at runtime (`kp>0, ki>=0, kd>=0`) |
| `PID_GET` | Read current wheel PID gains |
| `IMU_STREAM [interval_ms]` | Start continuous IMU data streaming (default: 100ms / 10 Hz) |
| `IMU_STOP` | Stop IMU streaming |
| `IMU_READ` | One-shot IMU data read |
| `ENC_RESET` | Reset encoder counters |

**Example Serial Commands:**
```
FORWARD 150
SET_SPEED 200
TURN_LEFT_90 100
CMD,0.50,0.20
PID_SET,210.0,32.0,2.8
PID_GET
IMU_STREAM 50
S
```

### Web Dashboard

Access the dashboard at `http://<pi-ip>:8080/`

**Motor Control Panel:**
- **Speed Slider:** Adjust speed from 40-255 in real-time
- **Direction Buttons:** Forward/Backward use closed-loop `CMD,v,omega` (`omega=0`), Left/Right remain 90° heading turns
- **Emergency Button:** Immediate motor cutoff

**IMU Panel:**
- **Start/Stop Stream:** Toggle continuous IMU telemetry
- **Read Once:** Single IMU data snapshot
- **Frequency Selector:** 2 Hz, 5 Hz, 10 Hz, or 20 Hz
- **Compass Gauge:** Visual heading indicator
- **Accel Chart:** Real-time accelerometer history graph

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main dashboard UI |
| `/stream` | GET | MJPEG video stream (use in `<img>` tag) |
| `/snapshot` | GET | Single JPEG frame |
| `/imu` | GET | Server-Sent Events (SSE) stream for IMU data |
| `/imu/snapshot` | GET | Latest IMU reading as JSON |
| `/pid` | GET | Latest PID gains cache (`kp`, `ki`, `kd`) |
| `/pid` | POST | Update PID gains (`{"kp":..., "ki":..., "kd":...}`) |
| `/status` | GET | System status (FPS, connections, etc.) |
| `/cmd` | POST | Send serial command to Arduino |

**Example API Usage:**
```bash
# Send motor command
curl -X POST http://<pi-ip>:8080/cmd -H "Content-Type: application/json" -d '{"cmd":"CMD,0.55,0.00"}'

# Get IMU snapshot
curl http://<pi-ip>:8080/imu/snapshot

# Set PID gains
curl -X POST http://<pi-ip>:8080/pid -H "Content-Type: application/json" -d '{"kp":210.0,"ki":32.0,"kd":2.8}'

# Check system status
curl http://<pi-ip>:8080/status

# View video stream (open in browser)
http://<pi-ip>:8080/stream
```

## Configuration

### Adjustable Parameters

**In `motor_imu_controller.ino`:**
```cpp
const int RAMP_STEPS = 50;              // Number of ramp steps for smooth acceleration
const unsigned long RAMP_TIME = 800;    // Total ramp time in milliseconds
unsigned long imuInterval = 100;        // Default IMU streaming interval (ms)
const float TURN_HEADING_TOL = 5.0;     // Heading tolerance in degrees for turn-to-heading
unsigned long turnTimeout = 10000;      // Turn timeout in milliseconds
```

**In `vision_control_server.py`:**
```python
CAMERA_INDEX  = 0        # V4L2 camera device index
WIDTH         = 320      # Video frame width
HEIGHT        = 240      # Video frame height
FPS           = 20       # Target frames per second
JPEG_QUALITY  = 65       # JPEG compression quality (0-100)
PORT          = 8080     # Flask server port
HOST          = "0.0.0.0"# Bind address
SERIAL_PORT   = "/dev/ttyACM0"  # Arduino serial port
SERIAL_BAUD   = 115200   # Serial baud rate
```

## Troubleshooting

### Arduino Issues

| Problem | Solution |
|---------|----------|
| `device error` on startup | Check I2C wiring (SDA/SCL), verify MPU-9250 is powered |
| Motors don't respond | Verify enable pins (R_EN/L_EN) are HIGH, check PWM pin connections |
| Heading readings unstable | Calibrate magnetometer, ensure no magnetic interference nearby |
| Serial communication fails | Confirm baud rate (115200), check USB connection |

### Raspberry Pi Issues

| Problem | Solution |
|---------|----------|
| `Cannot open /dev/video0` | Verify camera is connected, check `v4l2-ctl --list-devices` |
| `Serial unavailable` | Ensure Arduino is connected, check `ls /dev/ttyACM*` or `ls /dev/ttyUSB*` |
| Low FPS | Reduce resolution, lower JPEG quality, or increase server resources |
| IMU data not updating | Verify serial connection, check Arduino is streaming (`IMU_STREAM`) |

### General Tips
- **Auto-reconnect:** The serial reader thread automatically reconnects if the connection drops
- **SSE auto-recovery:** The IMU SSE stream auto-reconnects every 2 seconds if disconnected
- **Camera fallback:** If MJPG fails, the server automatically tries YUYV format

## Project Structure

```
road-inspector-bot/
├── motor_imu_controller/
│   └── motor_imu_controller.ino    # Arduino firmware (motor + IMU + encoders)
├── Encoder_draft1/
│   └── Encoder_draft1.ino          # Legacy standalone encoder test
├── vision_control_server.py    # Raspberry Pi server (vision + web UI + serial bridge)
├── QWEN.md                     # Project memory / system context
└── README.md                   # This file
```

## IMU Data Format

**Serial CSV Format:**
```
IMU,ax,ay,az,gx,gy,gz,heading,enc1_delta,enc2_delta,dt_ms,enc1_total,enc2_total
```
- `ax, ay, az`: Accelerometer (g-force, 3 decimal places)
- `gx, gy, gz`: Gyroscope (°/s, 3 decimal places)
- `heading`: Compass heading (degrees, 2 decimal places, 0-360°)
- `enc1_delta, enc2_delta`: Encoder tick deltas since previous IMU packet
- `dt_ms`: Packet delta-time in milliseconds
- `enc1_total, enc2_total`: Absolute encoder counts since reset

**SSE Stream Format:**
```
data: 0.123,-0.456,9.812,0.010,-0.020,0.005,180.50,12,11,50,1012,1006,240.00,220.00,1,8.33

```

## Safety Considerations

- **Emergency Stop:** Always use `S` command for immediate motor cutoff in emergencies
- **Turn Timeout:** Heading-based turns timeout after 10 seconds to prevent infinite spinning
- **Serial Resilience:** Server automatically handles serial disconnections and reconnections
- **Camera Buffer:** V4L2 buffer size set to 1 to minimize latency

## Future Enhancements

- [ ] Computer vision-based road defect detection (cracks, potholes)
- [ ] GPS integration for geo-tagged inspection data
- [ ] EKF local/global localisation integration (`ekf_local.py`, `ekf_global.py`)
- [ ] Autonomous patrol patterns with waypoint navigation
- [ ] Data logging with timestamped IMU + video synchronization
- [ ] Battery voltage monitoring and low-power alerts
- [ ] Obstacle detection and avoidance

## License

This project is provided as-is for educational and research purposes.

## Acknowledgments

- [FaBo Platform](https://fabo.io/) for the MPU-9250 Arduino library
- OpenCV community for computer vision libraries
- Flask framework contributors

## Support

For issues, questions, or contributions, please open an issue in the repository.
