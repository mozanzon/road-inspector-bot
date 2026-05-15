# Quick Start Guide - Robot Bridge System

Complete robot control system with Arduino, Raspberry Pi 5, and React frontend.

## What's Included

### 1. Arduino Code (`Arduino/motor_imu_controller_v2/motor_imu_controller_v2.ino`)
- **Features**: 
  - Differential drive motor control
  - QMC5883L compass sensor
  - Dual encoders for odometry
  - Interrupt-based encoder counting
  - Serial command protocol
- **Commands**: CMD, FORWARD, BACKWARD, TURN_LEFT_90, TURN_RIGHT_90, STOP, STATUS

### 2. Raspberry Pi Bridge (`robot_bridge_rpi5.py`)
- **Components**:
  - Arduino serial reader with parsing
  - Camera capture (USB or CSI)
  - YOLO v8 AI inference
  - WebSocket server for React
  - Real-time data streaming
- **Output**: JSON over WebSocket with detections, sensor data, and video frame

### 3. React Integration
- **Service** (`RobotBridgeService.ts`): Low-level WebSocket communication
- **Hook** (`useRobotBridge.ts`): React hook for easy component integration
- **Component** (`RobotDashboard.tsx`): Complete UI example

### 4. Documentation
- `PROTOCOL_DOCUMENTATION.md`: Detailed message formats
- `pi_bridge/SETUP_GUIDE.md`: Raspberry Pi 5 installation steps

---

## 30-Second Setup

### On Raspberry Pi 5

```bash
# Clone/setup project
cd ~/robot_bridge
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run bridge
python robot_bridge_rpi5.py --arduino-port /dev/ttyAMA10,/dev/ttyAMA0,/dev/ttyUSB0 --host 0.0.0.0
```

### In React App

```tsx
import { useRobotBridge } from '@/hooks/useRobotBridge';

export function MyComponent() {
  const { moveForward, stop, frame, detections } = useRobotBridge({
    host: '192.168.x.x', // Your RPi IP
    port: 8765,
  });

  return (
    <>
      {frame && <img src={`data:image/jpeg;base64,${frame}`} />}
      <button onClick={() => moveForward(200)}>Forward</button>
      <button onClick={stop}>Stop</button>
    </>
  );
}
```

---

## Pin Layout

### Arduino Mega

```
Left Motor (M1):
  PIN 5  - PWM Output (RPWM)
  PIN 6  - PWM Output (LPWM)
  PIN 7  - Enable
  PIN 8  - Enable

Right Motor (M2):
  PIN 44 - PWM Output (RPWM)
  PIN 45 - PWM Output (LPWM)
  PIN 46 - Enable
  PIN 47 - Enable

Encoders:
  PIN 2  - Encoder 1 Channel A (Interrupt)
  PIN 4  - Encoder 1 Channel B
  PIN 3  - Encoder 2 Channel A (Interrupt)
  PIN 13 - Encoder 2 Channel B

I2C (Compass):
  A4 (SDA)
  A5 (SCL)
```

### Raspberry Pi 5

```
Serial:
  GPIO 8  (TX) → Arduino RX
  GPIO 10 (RX) → Arduino TX
  GND     → Arduino GND

Camera:
  USB     → USB Port (or CSI via ribbon)

Power:
  USB-C   → 5V supply (min. 5A recommended)
```

---

## Common Commands

### Arduino Commands via Serial

```bash
# Forward at speed 200
FORWARD 200

# Backward at speed 150
BACKWARD 150

# Turn left at speed 180
LEFT 180

# Turn right at speed 180
RIGHT 180

# Independent motor control
MOTOR L 200 R 150

# Stop
STOP

# Request status
STATUS
```

### Bridge Commands from React

```javascript
// Connect
await robotBridge.connect();

// Movement
robotBridge.moveForward(200);
robotBridge.moveBackward(150);
robotBridge.turnLeft(180);
robotBridge.turnRight(180);

// Motors
robotBridge.moveMotors(200, 150);

// Stop
robotBridge.stop();

// Subscribe to data
robotBridge.on('detections', (detections) => {
  console.log('Found:', detections);
});
```

---

## Data Flow Visualization

```
┌─────────────┐
│ React App   │
│ (Browser)   │
└──────┬──────┘
       │ WebSocket
       │ JSON
       ▼
┌─────────────────────────────┐
│ Raspberry Pi 5              │
│ ┌─────────────────────────┐ │
│ │ Bridge (Python)         │ │
│ ├─────────────────────────┤ │
│ │ • Serial Reader         │ │
│ │ • Camera Capture        │ │
│ │ • YOLO AI               │ │
│ │ • WebSocket Server      │ │
│ └──┬──────────────┬───────┘ │
└────┼──────────────┼─────────┘
     │ Serial       │ USB
     │              │
     ▼              ▼
┌──────────┐  ┌──────────┐
│ Arduino  │  │ Camera   │
│ + Motors │  │ + Comp   │
└──────────┘  └──────────┘
```

---

## Features & Specifications

| Feature | Spec |
|---------|------|
| **Motor Control** | Dual independent PWM (0-255) |
| **Odometry** | Dual encoders with interrupt counting |
| **Compass** | HMC5883 I2C magnetometer |
| **Camera** | 640×480 @ 30 FPS |
| **AI Model** | YOLOv8 Nano (real-time detection) |
| **Network** | WebSocket over LAN/WiFi |
| **Latency** | ~10-30ms end-to-end |
| **Throughput** | 200-600 KB/s (with video) |
| **Battery Life** | Depends on motors & RPi config |

---

## Troubleshooting Checklist

- [ ] Arduino uploads successfully
- [ ] Arduino responds to serial commands
- [ ] Raspberry Pi can read serial from Arduino
- [ ] Camera works: `libcamera-hello` or `v4l2-ctl --list-devices`
- [ ] Python bridge runs without errors
- [ ] WebSocket accessible: `ws://rpi_ip:8765`
- [ ] React app can connect (check browser console)
- [ ] Motors respond to commands
- [ ] Compass/encoder data streams
- [ ] YOLO model loads (check speed)

---

## Performance Tips

1. **Reduce Video Quality**
   ```python
   cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 50])
   ```

2. **Lower FPS**
   ```python
   await asyncio.sleep(0.1)  # 10 FPS instead of 20
   ```

3. **Use Smaller YOLO Model**
   ```python
   ai_model = AIModel(model_path='yolov8n.pt')  # Nano = fastest
   ```

4. **Disable Inference When Not Needed**
   ```python
   if frame is not None and self.ai_model.model and enable_inference:
       detections = self.ai_model.detect(frame)
   ```

5. **Enable GPU (if available)**
   ```bash
   pip install torch torchvision --index-url https://download.pytorch.org/whl/cu118
   ```

---

## Next Steps

1. **Upload Arduino code** → `Arduino/motor_imu_controller_v2/motor_imu_controller_v2.ino`
2. **Setup Raspberry Pi** → Follow `SETUP_GUIDE.md`
3. **Start bridge** → `python robot_bridge_rpi5.py`
4. **Use in React** → Import `useRobotBridge` hook
5. **Deploy as service** → Use systemd (see `SETUP_GUIDE.md`)

---

## File Structure

```
road_inspector_bot/
├── Arduino/
│   └── motor_imu_controller_v2/
│       └── motor_imu_controller_v2.ino
├── pi_bridge/
│   ├── robot_bridge_rpi5.py
│   ├── requirements.txt
│   └── SETUP_GUIDE.md
├── RoboScanV2/
│   └── src/
│       ├── services/
│       │   └── RobotBridgeService.ts (NEW)
│       ├── hooks/
│       │   └── useRobotBridge.ts    (NEW)
│       └── components/
│           └── RobotDashboard.tsx   (NEW)
└── PROTOCOL_DOCUMENTATION.md
```

---

## Support & Issues

### Common Issues

**Arduino not detected:**
```bash
ls /dev/tty* | grep -E 'USB|ACM'
dmesg | tail -20
```

**Camera not working:**
```bash
v4l2-ctl --list-devices
libcamera-hello
```

**Bridge won't start:**
```bash
python robot_bridge_rpi5.py --help
# Check requirements: pip list
```

**React can't connect:**
- Check firewall: `sudo ufw status`
- Check bridge running: `netstat -an | grep 8765`
- Check network: `ping rpi_ip`

---

## License & Attribution

See ATTRIBUTIONS.md for all dependencies and their licenses.

---

**Happy hacking! 🤖**
