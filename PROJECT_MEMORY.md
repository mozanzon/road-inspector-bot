# RoboScan Project Memory

Last updated: 2026-05-15

## Robot Control Stack

- Arduino sketch: `Arduino/motor_imu_controller_v2/motor_imu_controller_v2.ino`
- Raspberry Pi bridge: `road_inspector_bot/pi_bridge/robot_bridge_rpi5.py`
- React app: `road_inspector_bot/RoboScanV2`

## Hardware Notes

- Main board target is Arduino Mega.
- Wheel diameter is 32 cm, so the sketch uses `WHEEL_RADIUS_M = 0.16`.
- Wheel track is currently configured as `0.57 m`; remeasure if 90-degree turns drift.
- Encoder resolution is currently configured as `2400 ticks/rev`; verify with the actual encoder mode and gearing.
- Right motor speed control uses Arduino Mega PWM pins `44` and `45`.
- Plotter driver does not need PWM. It uses pins `38` and `39` as digital max-speed direction/on-off pins.
- Plotter enable pins are `46` and `47` and must be configured as outputs and driven `HIGH` if the motor driver uses enable inputs.

## Serial Protocol

Arduino streams key/value status packets:

```text
STATUS|heading=...|yaw=...|odom_x=...|odom_y=...|odom_theta=...|lat=...|lng=...|fix=...|satellites=...|e1=...|e2=...|de1=...|de2=...|dt_ms=...|speed=...|lspeed=...|rspeed=...|battery=...|plot_mode=...|spraying=...|dash_cm=...|gap_cm=...
```

React talks to the Pi bridge over WebSocket on port `8765`.

Bridge telemetry note:

- `pi_bridge/robot_bridge_rpi5.py` must broadcast the latest parsed sensor packet, not simply the latest raw serial line.
- Plain Arduino text lines such as `Ready.`, `Already stopped.`, ACKs, and command messages can parse as `{}`. If those are forwarded as `arduino`, the camera stream can still work while the UI sensor cards show no data.
- The bridge now uses `ArduinoReader.get_latest_sensor_data()` to skip non-sensor serial lines and keep forwarding the newest `status`, `compass`, or `encoder` packet.
- Regression coverage is in `tests/test_robot_bridge_ports.py` for parsing `STATUS|...` packets and skipping plain text serial lines.

The Pi bridge tries Arduino serial ports in this default order:

```text
/dev/ttyAMA10, /dev/ttyAMA0, /dev/ttyUSB0, /dev/ttyACM0, /dev/ttyACM10
```

The Pi bridge translates React movement commands to Arduino serial commands:

- `forward` -> `FORWARD <speed>`
- `backward` -> `BACKWARD <speed>`
- `left` -> `TURN_LEFT_90 <speed>`
- `right` -> `TURN_RIGHT_90 <speed>`
- `stop` -> `STOP`
- `status` -> `STATUS`

## Calibration

Compass calibration can be sent over serial:

```text
SET_COMPASS_CAL <off_x> <off_y> <off_z> <scale_x> <scale_y> <scale_z>
```

These values are runtime-only unless EEPROM persistence is added later.
