# Project Memory: Road Inspector Bot (PID Branch)

## Overview
This repository contains the software stack for the Road Inspector Bot. 
The system uses an **Arduino** hooked up to an **MPU9250 IMU** to capture high-speed, accurate orientation data. This Arduino communicates via Serial USB to a **Raspberry Pi**, which hosts a Python WebSocket server. A standalone **Web UI** on the laptop displays the data with a clean, high-end white HUD interface.

## Tech Stack
- **Hardware**: Arduino, Raspberry Pi, MPU9250 IMU.
- **Backend (RPi)**: Python, `pyserial`, `websockets`, `asyncio`.
- **Frontend (Laptop)**: HTML5, CSS3 (Light Mode HUD), Vanilla Javascript.

## Current Architecture
1. **Arduino (`arduino/imu_telemetry/`)**: Captures MPU9250 logic (using Madgwick/Mahony filters for responsiveness vs accuracy balance) and prints `{"heading": 123.45, "pitch": ..., "roll": ...}` over Serial @ 115200 baud.
2. **RPi Server (`rpi_server/`)**: Python script reads Serial data. Runs a WebSocket server (port 8765) and broadcasts JSON payloads.
3. **Web Client (`client/`)**: Client manually enters the RPi's IP address. UI connects via WebSockets and manipulates SVG/CSS transforms to simulate a robot HUD (white theme).

## Future Capabilities
- Add dual-mode USB Web Serial / Network connectivity.
- Add camera feed overlay underneath the HUD.
- Control motor speeds via PID.
