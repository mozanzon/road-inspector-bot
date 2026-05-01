# RoadGuard Paint System — Full Project Memory

> **Version**: 2.0  
> **Last Updated**: 2026-05-01  
> **Project Path**: `road_inspector_bot/`

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [File Structure](#file-structure)
5. [Pages & Components](#pages--components)
6. [State Management](#state-management)
7. [Theming System](#theming-system)
8. [Features Implemented](#features-implemented)
9. [Known Gaps & TODOs](#known-gaps--todos)
10. [How to Run](#how-to-run)
11. [Hardware Integration Notes](#hardware-integration-notes)
12. [Design System](#design-system)

---

## Project Overview

RoadGuard Paint System is a **robot control dashboard** for a road inspection and paint-marking robot. It provides:

- **Connection management** to a Raspberry Pi over Wi-Fi
- **Real-time dashboard** with telemetry (battery, CPU, motors, temperature)
- **Interactive map** with Leaflet for GPS tracking and damage detection markers
- **Manual/Auto control** with joystick, D-pad, and PID tuning
- **AI camera feed** with crack/pothole detection overlays
- **Paint mechanism** controls (continuous/dashed modes)
- **System logs** with level filtering and auto-scroll
- **Dark/Light mode** toggle with persistent theme

---

## Architecture

```
┌─────────────────────────────────────────┐
│              TabLayout Shell            │
│  ┌─────────┐                ┌────────┐  │
│  │  Header  │  (Logo, Status, Theme) │  │
│  └─────────┘                └────────┘  │
│  ┌─────────────────────────────────────┐│
│  │         Active Tab Content          ││
│  │  (Connection|Dashboard|Map|         ││
│  │   Controls|Logs)                    ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │           Bottom Tab Bar            ││
│  │  Link | Dash | Map | Control | Logs ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

**Key design decision**: Tab-based layout (not React Router) so the header and tab bar stay fixed in place. Content scrolls independently within the main area.

---

## Technology Stack

| Layer         | Technology                           |
|---------------|--------------------------------------|
| Framework     | React 18 + Vite 6                    |
| Language      | TypeScript                           |
| Styling       | Tailwind CSS 4 (tw-animate-css)      |
| Maps          | Leaflet 1.9 (vanilla JS API)         |
| Joystick      | react-joystick-component 6.2         |
| Charts        | Recharts 2.15 (available, unused)    |
| Icons         | SVG inline + Emoji                   |
| Fonts         | Inter, Space Grotesk, JetBrains Mono |
| Build Tool    | Vite 6.4                             |
| Package Mgr   | npm (pnpm-workspace.yaml present)    |

---

## File Structure

```
road_inspector_bot/
├── index.html                    # Entry HTML
├── package.json                  # Dependencies
├── vite.config.ts                # Vite + Tailwind + React plugins
├── src/
│   ├── main.tsx                  # React mount point
│   ├── app/
│   │   ├── App.tsx               # Root: Tab state, tab rendering
│   │   ├── components/
│   │   │   ├── TabLayout.tsx     # Shell: header + tabs + content area
│   │   │   ├── CameraFeed.tsx    # AI camera with detection boxes
│   │   │   ├── DistanceTracker.tsx # Distance + segment history
│   │   │   ├── ErrorBoundary.tsx # React error boundary
│   │   │   ├── GPSControl.tsx    # GPS toggle, coords, accuracy, verify
│   │   │   ├── Joystick.tsx      # Lazy-loaded joystick component
│   │   │   ├── MapComponents.tsx # Deprecated stub
│   │   │   ├── Navigation.tsx    # Old navigation (deprecated by TabLayout)
│   │   │   ├── PaintingControl.tsx # Paint mode, dash/gap settings
│   │   │   ├── PathDrawing.tsx   # Path drawing (straight/curved)
│   │   │   ├── PIDTuning.tsx     # Kp/Ki/Kd sliders + presets
│   │   │   └── SensorReadings.tsx # Full encoders, IMU, compass
│   │   ├── contexts/
│   │   │   ├── ThemeContext.tsx   # Dark/light mode with localStorage
│   │   │   └── ControlModeContext.tsx # Auto/manual mode
│   │   └── pages/
│   │       ├── ConnectionPage.tsx  # IP/Port input, connect button
│   │       ├── DashboardPage.tsx   # Full telemetry dashboard
│   │       ├── MapPage.tsx         # Leaflet map with overlays
│   │       ├── ControlsPage.tsx    # Joystick + D-pad + all controls
│   │       └── LogsPage.tsx        # Real-time log viewer
│   ├── imports/                  # Figma-generated SVG assets (legacy)
│   │   ├── 1Connection/
│   │   ├── 2Dashboard/
│   │   ├── 3MapView/
│   │   ├── 4RobotControls/
│   │   └── 5SystemLogs/
│   └── styles/
│       ├── index.css             # Import hub
│       ├── fonts.css             # Google Fonts (Inter, Space Grotesk, JetBrains Mono)
│       ├── tailwind.css          # Tailwind source config
│       ├── theme.css             # CSS variables, dark mode, typography
│       ├── custom.css            # Animations, glassmorphism, sliders, scrollbar
│       └── globals.css           # (empty)
```

---

## Pages & Components

### ConnectionPage
- IP address + port input fields
- Simulated connection with 1.5s delay
- Status indicator (DISCONNECTED → CONNECTING → redirects to Dashboard)
- Dark/light mode support

### DashboardPage
- **System Overview** banner with uptime counter
- **4 stat cards**: Battery, Signal, CPU Load, Temperature
- **Motor Status**: Left/Right RPM with progress bars
- **Paint Level** + **Distance** cards
- **AI Detection Summary**: Cracks, Potholes, Total counts
- **Resource Usage**: CPU, Memory, Battery progress bars
- All values update every 1 second via simulated telemetry

### MapPage
- **Leaflet map** initialized with vanilla JS API (not react-leaflet)
- Dark mode: CartoDB dark tiles; Light mode: OpenStreetMap tiles
- Robot marker with glow effect
- Path polyline (dashed)
- Detection markers (crack=red, pothole=amber) with popups
- Distance badge, status badge, coordinates overlay
- Stats panel: Area mapped, scan rate, detections, confidence
- ResizeObserver for reliable tile loading

### ControlsPage (Horizontal Layout)
- **Mode Toggle**: AUTO/MANUAL pill buttons (horizontal)
- **Drive Controls** (horizontal):
  - Joystick (left side, 120px)
  - D-PAD buttons (right side): Forward, Left, Stop, Right, Backward
- **Velocity Slider**: 0–100 m/s with value display
- **Camera Feed**: Toggle + AI detection boxes
- **Painting Control**: Continuous/dashed modes, dash/gap sliders
- **PID Tuning**: Kp/Ki/Kd sliders + number inputs + presets
- **Sensor Readings**: Full encoder data (ticks, RPM, speed, distance), IMU (pitch/roll/yaw), compass
- **GPS Control**: Enable/disable, coordinates, accuracy, verify
- **Distance Tracker**: Total distance, current segment, history
- **Emergency Stop**: Full-width red button with overlay

### LogsPage
- Real-time log generation (every 2s)
- Level filtering: All, Info, Warn, Error, Debug
- Auto-scroll toggle
- Clear button
- Stats footer: entry count + level counts
- Color-coded log entries with timestamp, source, level, message

---

## State Management

| Context              | State              | Purpose                        |
|----------------------|--------------------|---------------------------------|
| `ThemeContext`        | `theme: 'dark' \| 'light'` | Dark/light mode, persisted to localStorage |
| `ControlModeContext`  | `mode: 'auto' \| 'manual'` | Robot control mode              |
| `App` (local)        | `activeTab: TabId` | Current active tab              |

All other state is component-local using `useState`.

---

## Theming System

### CSS Variables (theme.css)
- Light mode: `--background: #ffffff`, standard shadcn-inspired palette
- Dark mode: `.dark` class overrides with oklch values

### Component Theming
Every component uses `useTheme()` to get `isDark` and conditionally applies:
- **Dark**: `bg-[#12121c]`, `border-[#1e1e32]`, cyan/emerald accent colors
- **Light**: `bg-white`, `border-[#e8e5dd]`, emerald/teal accent colors

### Theme Toggle
Located in the `TabLayout` header. Toggles `dark` class on root div and persists to `localStorage('rg-theme')`.

---

## Features Implemented

- [x] Tab-based navigation (tabs stay in place)
- [x] Horizontal control layout
- [x] Working Leaflet map with dark/light tile layers
- [x] Dark and light mode toggle (sun/moon button)
- [x] D-PAD movement buttons next to joystick
- [x] Full encoder readings (ticks, RPM, speed m/s, distance m)
- [x] IMU orientation (pitch, roll, yaw)
- [x] Compass visualization with needle
- [x] AI camera feed with detection overlays
- [x] Paint mechanism (continuous/dashed with preview)
- [x] PID controller tuning with presets
- [x] GPS control with accuracy indicator
- [x] Distance tracking with segment history
- [x] Emergency stop with full-screen overlay
- [x] System logs with level filtering
- [x] Simulated real-time telemetry data
- [x] Premium UI with glassmorphism, gradients, animations
- [x] Google Fonts (Inter, Space Grotesk, JetBrains Mono)
- [x] Responsive design

---

## Known Gaps & TODOs

### 🔴 Critical
1. **No real hardware connection** — All data is simulated. Need WebSocket/Serial bridge to Raspberry Pi
2. **No WebSocket client** — Need to implement `ws://` connection for telemetry
3. **No Serial communication** — Need Web Serial API for direct Arduino connection
4. **No authentication** — No login/auth for remote access
5. **Map tiles may not load** on first render if container dimensions aren't ready (mitigated with ResizeObserver)

### 🟡 Important
6. **No data persistence** — Telemetry/logs not saved anywhere
7. **No export/download** — Can't export logs, detections, or path data
8. **No real camera stream** — Camera feed is simulated with detection boxes
9. **PathDrawing component** — Drawing on the map isn't connected to Leaflet (draws in a separate overlay)
10. **No error recovery** — If connection drops, no auto-reconnect logic
11. **No input validation** — IP address and port inputs accept any string
12. **No unit tests** — Zero test coverage
13. **No HTTPS/WSS** — Connections are plain HTTP/WS

### 🟢 Nice to Have
14. **No mission planning** — Can't pre-plan routes
15. **No historical data** — No past session review
16. **No notifications** — No alerts for critical events (low battery, high temp)
17. **No multi-robot support** — Single robot only
18. **No keyboard shortcuts** — No WASD or arrow key controls
19. **No mobile responsiveness** — Designed for tablet/desktop width (~420px+)
20. **Old Figma imports** — `src/imports/` directories contain legacy Figma-generated components that are no longer used by the active pages
21. **Old Navigation.tsx** — Deprecated by TabLayout but file still exists
22. **react-router-dom** — Still in package.json but no longer used (can be removed)
23. **Recharts** — Installed but not used in dashboard (could add time-series charts)

### 🔧 Performance
24. **No memoization** — Components re-render on every state change
25. **Leaflet map** re-creates on every tab switch (no caching)
26. **Simulation intervals** pile up if not properly cleaned (mitigated with useEffect cleanup)

---

## How to Run

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# → Opens at http://localhost:5173/

# Build for production
npm run build
# → Output to dist/
```

### Requirements
- Node.js 18+
- npm 9+

---

## Hardware Integration Notes

### Expected Communication Protocol
```
Laptop ←→ Raspberry Pi ←→ Arduino Mega 2560
  (WebSocket)   (USB Serial)
```

### Data Flow
1. **Arduino → RPi**: Serial JSON at 115200 baud
   ```json
   {
     "leftEncoder": 4502,
     "rightEncoder": 4498,
     "compass": 245.3,
     "pitch": 1.2,
     "roll": -0.5,
     "yaw": 245.3,
     "battery": 87,
     "motorL_rpm": 850,
     "motorR_rpm": 842
   }
   ```

2. **RPi → Laptop**: WebSocket (ws://192.168.x.x:8080)
   - Forwards Arduino telemetry
   - Streams camera feed (MJPEG or WebRTC)

3. **Laptop → RPi → Arduino**: Commands
   ```json
   {
     "cmd": "MOVE",
     "direction": "FORWARD",
     "speed": 45,
     "pid": { "kp": 1.0, "ki": 0.1, "kd": 0.05 }
   }
   ```

### Hardware Components
- **Arduino Mega 2560**: Motor control, encoder reading, IMU (MPU9250)
- **Raspberry Pi 4**: WebSocket bridge, camera streaming, GPS
- **Motors**: DC motors with L298N driver
- **Encoders**: Rotary encoders on each wheel
- **IMU**: MPU9250 (9-DOF: accelerometer, gyroscope, magnetometer)
- **GPS**: NEO-6M GPS module
- **Camera**: Raspberry Pi Camera Module v2
- **Paint Mechanism**: Solenoid-controlled paint nozzle

---

## Design System

### Color Palette

| Token          | Dark Mode          | Light Mode          |
|----------------|--------------------|-----------------------|
| Background     | `#0a0a0f`          | `#f5f2ec`             |
| Card           | `#12121c`          | `#ffffff`             |
| Border         | `#1e1e32`          | `#e8e5dd`             |
| Primary Accent | Cyan `#06b6d4`     | Emerald `#10b981`     |
| Secondary      | Emerald `#10b981`  | Teal `#14b8a6`        |
| Danger         | Red `#ef4444`      | Red `#dc2626`         |
| Warning        | Amber `#f59e0b`    | Amber `#d97706`       |
| Text Primary   | `#ffffff`          | `#18181b (zinc-900)`  |
| Text Secondary | `#71717a`          | `#a1a1aa`             |

### Typography
- **Headings/Labels**: `Space Grotesk` (tracking-wider, uppercase)
- **Body**: `Inter` (system-like, clean)
- **Monospace/Data**: `JetBrains Mono` (telemetry values, logs)
- **Label Size**: 10px, bold, tracking 1.5px, uppercase

### Spacing & Radius
- Cards: `rounded-2xl` (16px), `p-4` (16px)
- Sub-cards: `rounded-xl` (12px), `p-3` (12px)
- Buttons: `rounded-full` (pills) or `rounded-xl`
- Gap between sections: `space-y-4` (16px)

### Animations
- `animate-fade-in-up`: Entry animation for tab content
- `animate-pulse`: Status indicators
- `animate-pulse-glow`: Glowing active elements
- `transition-theme`: Smooth color transitions on theme change

---

*This document serves as the complete project memory for the RoadGuard Paint System. Update it when making architectural changes.*
