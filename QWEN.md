# Road Inspector Bot — Project Memory

## Grad Project — System Context

### Project overview
Autonomous mobile robot for road inspection and maintenance, graduation project at MSA University, Faculty of Engineering, Mechatronics department.

The robot has three core tasks:
1. Detect potholes and cracks in the road surface using a downward-facing camera + YOLO
2. Paint/reline faded road markings (physical actuator on the robot)
3. Navigate autonomously along a road path using sensor fusion

---

### Hardware stack (confirmed)

**Compute:**
- Raspberry Pi 5 — main computer, runs all high-level logic, Python on Raspberry Pi OS (no ROS 2, no Ubuntu)
- Arduino Mega — real-time controller, connected to RPi via USB serial at 115200 baud

**Sensors:**
- MPU-9250 IMU — connected to Arduino Mega via I2C (pins 20/21), using FaBo9Axis_MPU9250 library, confirmed working
- NEO-M8N GPS — connected to RPi via UART
- Wheel encoders ×2 — quadrature, connected to Arduino interrupt pins (ENC1_A=2, ENC1_B=4, ENC2_A=3, ENC2_B=13)
- Webcam — connected to RPi via USB, used for road inspection (pothole/crack detection via YOLO), streaming via V4L2

**Actuation:**
- BTS7960 (IBT-2) motor drivers ×2 — left and right
- DC motors ×2 — differential drive configuration
- Road line painting actuator (physical mechanism, not yet implemented in software)

**Power:**
- 12V battery → BTS7960 B+/B−
- 5V BEC → Arduino and RPi logic
- Single common GND across all boards

---

### Software stack (current state)

**Confirmed working files in repo (branch: feature/encoder-imu-gps-control):**

`motor_imu_controller.ino` (Arduino Mega):
- IMU streaming at configurable rate (default 100ms, target 20ms/50Hz)
- Encoder ISRs with atomic snapshot and delta calculation
- Non-blocking ramp state machine for FORWARD/BACKWARD
- Non-blocking turn state machine using magnetometer heading (90° turns)
- BTS7960 motor control primitives
- Serial protocol — sends: IMU,ax,ay,az,gx,gy,gz,heading,enc1_delta,enc2_delta,dt_ms
- Serial protocol — receives: CMD,v_linear,omega | FORWARD n | BACKWARD n | STOP | S | IMU_STREAM n | IMU_STOP | ENC_RESET | TURN_LEFT_90 n | TURN_RIGHT_90 n

`vision_control_server.py` (RPi, Python):
- Flask web server on port 8080
- MJPEG camera stream via /stream endpoint
- Serial bridge — reads IMU packets, parses them, reconnects on failure
- SSE (Server-Sent Events) push to browser dashboard via /imu endpoint
- JSON snapshot via /imu/snapshot
- Cyberpunk-styled live dashboard UI with compass, accel chart, encoder ticks
- /cmd endpoint accepts POST to send arbitrary commands to Arduino
- /status endpoint for system health
- /pose endpoint (to be added) — exposes EKF estimated pose

---

### Planned additions (not yet implemented)

`ekf_local.py`:
- Extended Kalman Filter, 50Hz
- State vector: [x, y, theta, v, omega]
- Fuses encoder velocity + IMU gyro Z (yaw rate overrides encoder-derived omega)
- Outputs clean odometry in local /odom frame
- Uses filterpy library

`ekf_global.py`:
- Extended Kalman Filter, 5Hz
- Fuses ekf_local output + GPS UTM position
- Corrects accumulated drift
- Outputs pose in global /map frame

`gps_reader.py`:
- Reads NMEA sentences from /dev/ttyAMA0
- Parses $GNGGA for lat/lon
- Converts to UTM using utm library
- Feeds ekf_global at 1–5Hz

`pure_pursuit.py`:
- Regulated Pure Pursuit path tracker, 10Hz
- Takes waypoint array + current /map pose
- Outputs CMD,v_linear,omega to Arduino via serial
- Target robot speed: ~1 m/s

YOLO inference (not yet started):
- Downward-facing camera detects potholes and cracks
- Model: YOLOv11n (lightweight, suitable for RPi 5)
- Triggers painting actuator when road line fading detected

---

### Serial protocol (finalized)

**Arduino → RPi (every 20ms):**
```
IMU,ax,ay,az,gx,gy,gz,heading,enc1_delta,enc2_delta,dt_ms
```

**RPi → Arduino (on demand from Pure Pursuit):**
```
CMD,v_linear_ms,omega_rads
```

Units: v in m/s, omega in rad/s
Arduino converts using:
```
vL = (v - omega * WHEELBASE/2) / WHEEL_RADIUS
vR = (v + omega * WHEELBASE/2) / WHEEL_RADIUS
```
then scales to PWM 0–255

**Robot physical parameters (to be measured and tuned):**
- TICKS_PER_REV: needs measurement (rotate wheel 1 full turn, count ticks)
- WHEEL_RADIUS: ~0.05m (needs verification)
- WHEELBASE: ~0.30m centre-to-centre (needs verification)
- MAX_RAD_S: no-load wheel angular velocity at PWM=255 (needs measurement)

---

### Known bugs to fix in current code

**Arduino `motor_imu_controller.ino`:**
- Line ~371: `rampDir = dir` used before `dir` is assigned in FORWARD/BACKWARD handler — add `int dir = (dirStr == "FORWARD") ? 1 : -1;` before it
- IMU packet missing dt_ms field — needs to be added as 11th field
- CMD,v,omega handler not yet implemented — needs setForwardDiff(), setBackwardDiff(), and CMD parser
- IMU streaming not auto-started on boot — needs imuStreaming=true and imuInterval=20 in setup()

**RPi `vision_control_server.py`:**
- _parse_imu expects 10 fields — update to 11 once Arduino sends dt_ms
- EKF not wired in yet — needs ekf_local import and update call inside _parse_imu
- /pose endpoint not yet added
- math import missing for /pose degrees conversion

---

### Architecture summary

**Sensor layer:**
```
NEO-M8N → RPi UART → gps_reader.py → ekf_global.py
MPU-9250 → Arduino I2C → serial packet → ekf_local.py
Encoders → Arduino ISR → serial packet → ekf_local.py
```

**Fusion layer:**
```
ekf_local.py (50Hz) → local pose estimate
ekf_global.py (5Hz) → global pose with GPS correction
```

**Control layer:**
```
pure_pursuit.py (10Hz) → CMD,v,omega → Arduino serial
Arduino PID (future) → independent wheel speed control
```

**Perception layer:**
```
Webcam → YOLO inference → pothole/crack detection + painting trigger
```

**UI layer:**
```
vision_control_server.py → Flask dashboard → browser
```

---

### Tech preferences and constraints
- Python only on RPi side (no ROS 2, no Ubuntu, stays on RPi OS)
- C++ on Arduino side
- No external navigation stack — all algorithms implemented from scratch
- Libraries allowed: filterpy, utm, pyserial, flask, opencv-python, FaBo9Axis_MPU9250
- USB serial between RPi and Arduino (not hardware UART) — acceptable latency at 1m/s
- Applied, system-level thinking preferred over theoretical explanations
- British English

---

## Legacy Details (Superseded)

### Old Serial Data Format (10-field, deprecated)
```
IMU,ax,ay,az,gx,gy,gz,heading,enc1_delta,enc2_delta
```

### Old Hardware (Superseded)
- Arduino Uno → now Arduino Mega
- L298N/L293D motor drivers → now BTS7960 (IBT-2)
- Raspberry Pi 3B+/4 → now Raspberry Pi 5
- Encoder model YT06-OP-600B-2M (600 PPR) → PPR needs re-measurement on actual hardware

### Old Pin Mapping (Arduino Uno, superseded by Mega)
| Pin | Function |
|-----|----------|
| 2 | ENC1_A (INT0) |
| 3 | ENC2_A (INT1) |
| 4 | ENC1_B |
| 5 | LEFT_RPWM |
| 6 | LEFT_LPWM |
| 7 | LEFT_R_EN |
| 8 | LEFT_L_EN |
| 9 | RIGHT_RPWM |
| 10 | RIGHT_LPWM |
| 11 | RIGHT_R_EN |
| 12 | RIGHT_L_EN |
| 13 | ENC2_B |
| A4 | MPU-9250 SDA (I2C) |
| A5 | MPU-9250 SCL (I2C) |

### Old Key Serial Commands (Superseded)
- `SET_SPEED <0-255>` — live speed adjustment (replaced by CMD,v,omega)

---

## Notes
- `.github/` workflows (Qwen Code internal) are gitignored
- `Encoder_draft1/` is the original standalone encoder test file (kept for reference)
- Original `motor_imu_controller.ino` was root-level; now in `motor_imu_controller/` subfolder
- Branch `main` — stable (original manual control)
- Branch `feature/encoder-imu-gps-control` — active development (non-blocking state machine + encoders + EKF + GPS)
