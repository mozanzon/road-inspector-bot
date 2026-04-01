#!/usr/bin/env python3
"""
Pi Robot Control Server
------------------------
Merged camera stream + motor control + IMU dashboard.
Single Flask server on port 8080.

Endpoints:
  /              → full control UI (stream + buttons + IMU)
  /stream        → raw MJPEG (paste in any viewer)
  /snapshot      → single JPEG
  /cmd           → POST  {"cmd": "FORWARD 180"}  → send to Arduino
  /imu           → GET   latest IMU JSON
  /imu/stream    → SSE   live IMU push (20Hz)
  /status        → GET   server health JSON

Requirements:
  pip3 install flask opencv-python pyserial --break-system-packages
  pip3 install simplejpeg --break-system-packages   # optional, faster encode

Usage:
  python3 robot_server.py
  python3 robot_server.py --serial /dev/ttyACM0
  python3 robot_server.py --cam 1 --width 640 --height 480
"""

import cv2
import serial
import serial.tools.list_ports
import socket
import threading
import time
import json
import logging
import argparse

from flask import Flask, Response, jsonify, request

# ── Optional fast JPEG encoder ────────────────────────────────────────────────
try:
    import simplejpeg
    USE_SIMPLEJPEG = True
except ImportError:
    USE_SIMPLEJPEG = False

# ─────────────────────────────────────────────
#  CONFIG DEFAULTS  (all overridable via CLI)
# ─────────────────────────────────────────────
DEFAULT_SERIAL  = "/dev/ttyUSB0"
DEFAULT_BAUD    = 115200
DEFAULT_CAM     = 0
DEFAULT_WIDTH   = 320
DEFAULT_HEIGHT  = 240
DEFAULT_FPS     = 20
DEFAULT_QUALITY = 65
DEFAULT_PORT    = 8080
# ─────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)


# ══════════════════════════════════════════════════════════════════════════════
#  CAMERA
# ══════════════════════════════════════════════════════════════════════════════

class Camera:
    def __init__(self, index, width, height, fps, quality):
        self.width   = width
        self.height  = height
        self.fps     = fps
        self.quality = quality

        self._raw_frame  = None
        self._jpeg_frame = None
        self._raw_lock   = threading.Lock()
        self._jpeg_lock  = threading.Lock()
        self.running     = False
        self.fps_capture = 0.0
        self.fps_encode  = 0.0

        self._open(index)
        self.running = True
        threading.Thread(target=self._capture_loop, daemon=True, name="cam-capture").start()
        threading.Thread(target=self._encode_loop,  daemon=True, name="cam-encode").start()

    def _open(self, index):
        log.info(f"Opening camera {index} ...")
        self.cap = cv2.VideoCapture(index)
        if not self.cap.isOpened():
            raise RuntimeError(f"Cannot open camera {index}")
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH,  self.width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        self.cap.set(cv2.CAP_PROP_FPS,          self.fps)
        self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"YUYV"))
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        log.info(f"Camera ready: {w}x{h} | encoder: {'simplejpeg' if USE_SIMPLEJPEG else 'opencv'}")

    def _capture_loop(self):
        count = 0; t0 = time.time()
        while self.running:
            ok, frame = self.cap.read()
            if not ok:
                time.sleep(0.05); continue
            with self._raw_lock:
                self._raw_frame = frame
            count += 1
            if time.time() - t0 >= 2.0:
                self.fps_capture = round(count / (time.time() - t0), 1)
                count = 0; t0 = time.time()

    def _encode_loop(self):
        count = 0; t0 = time.time()
        interval = 1.0 / self.fps
        while self.running:
            ts = time.time()
            with self._raw_lock:
                frame = self._raw_frame
            if frame is not None:
                jpeg = self._encode(frame)
                if jpeg:
                    with self._jpeg_lock:
                        self._jpeg_frame = jpeg
                    count += 1
            sleep = interval - (time.time() - ts)
            if sleep > 0: time.sleep(sleep)
            if time.time() - t0 >= 2.0:
                self.fps_encode = round(count / (time.time() - t0), 1)
                count = 0; t0 = time.time()

    def _encode(self, frame):
        if USE_SIMPLEJPEG:
            try:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                return simplejpeg.encode_jpeg(rgb, quality=self.quality, colorspace="RGB")
            except Exception:
                pass
        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, self.quality])
        return buf.tobytes() if ok else None

    def get_jpeg(self):
        with self._jpeg_lock:
            return self._jpeg_frame

    def stop(self):
        self.running = False
        self.cap.release()


# ══════════════════════════════════════════════════════════════════════════════
#  ARDUINO SERIAL
# ══════════════════════════════════════════════════════════════════════════════

class Arduino:
    def __init__(self, port, baud):
        self.port     = port
        self.baud     = baud
        self.ser      = None
        self.lock     = threading.Lock()
        self.running  = False
        self.imu      = {
            "yaw": 0.0, "roll": 0.0, "pitch": 0.0,
            "ax": 0.0, "ay": 0.0, "az": 0.0,
            "gx": 0.0, "gy": 0.0, "gz": 0.0,
            "dir": 0, "speed": 0,
            "rotating": False,
            "status": "disconnected",
            "sample_rate": 0.0,
            "timestamp": 0.0,
        }
        self._imu_lock    = threading.Lock()
        self._count       = 0
        self._rate_t0     = time.time()
        self._connect()

    def _connect(self):
        log.info(f"Connecting to Arduino on {self.port} @ {self.baud} ...")
        try:
            self.ser = serial.Serial(self.port, self.baud, timeout=1)
            time.sleep(2)
            self.ser.reset_input_buffer()
            self.running = True
            log.info("Arduino connected.")
            with self._imu_lock:
                self.imu["status"] = "connected"
            threading.Thread(target=self._read_loop, daemon=True, name="arduino-read").start()
        except serial.SerialException as e:
            log.error(f"Serial error: {e}")
            log.info("Available ports:")
            for p in serial.tools.list_ports.comports():
                log.info(f"  {p.device} — {p.description}")
            with self._imu_lock:
                self.imu["status"] = f"error: {e}"

    def _read_loop(self):
        while self.running:
            try:
                raw = self.ser.readline().decode("utf-8", errors="ignore").strip()
                if not raw:
                    continue

                # ── STATUS line ──────────────────────────────────────
                # FORMAT: STATUS,yaw,roll,pitch,ax,ay,az,gx,gy,gz,dir,speed
                if raw.startswith("STATUS,"):
                    parts = raw.split(",")
                    if len(parts) == 12:
                        try:
                            with self._imu_lock:
                                self.imu.update({
                                    "yaw":   round(float(parts[1]),  2),
                                    "roll":  round(float(parts[2]),  2),
                                    "pitch": round(float(parts[3]),  2),
                                    "ax":    round(float(parts[4]),  3),
                                    "ay":    round(float(parts[5]),  3),
                                    "az":    round(float(parts[6]),  3),
                                    "gx":    round(float(parts[7]),  2),
                                    "gy":    round(float(parts[8]),  2),
                                    "gz":    round(float(parts[9]),  2),
                                    "dir":   int(parts[10]),
                                    "speed": int(parts[11]),
                                    "status":    "live",
                                    "timestamp": round(time.time(), 4),
                                })
                            self._count += 1
                            elapsed = time.time() - self._rate_t0
                            if elapsed >= 2.0:
                                with self._imu_lock:
                                    self.imu["sample_rate"] = round(self._count / elapsed, 1)
                                self._count  = 0
                                self._rate_t0 = time.time()
                        except ValueError:
                            pass

                elif raw == "ROTATE_DONE":
                    with self._imu_lock:
                        self.imu["rotating"] = False
                    log.info("Rotation complete.")

                elif raw.startswith("ROTATING"):
                    with self._imu_lock:
                        self.imu["rotating"] = True

                elif raw == "STOPPED" or raw == "!! EMERGENCY STOP !!":
                    with self._imu_lock:
                        self.imu["rotating"] = False
                        self.imu["dir"]      = 0
                        self.imu["speed"]    = 0

                else:
                    log.info(f"Arduino: {raw}")

            except serial.SerialException as e:
                log.error(f"Serial read error: {e}")
                with self._imu_lock:
                    self.imu["status"] = "disconnected"
                time.sleep(1)

    def send(self, cmd: str):
        """Send a command string to Arduino."""
        if self.ser and self.ser.is_open:
            with self.lock:
                try:
                    self.ser.write((cmd.strip() + "\n").encode("utf-8"))
                    log.info(f"→ Arduino: {cmd}")
                    return True
                except serial.SerialException as e:
                    log.error(f"Send error: {e}")
        else:
            log.warning(f"Serial not open — command dropped: {cmd}")
        return False

    def get_imu(self):
        with self._imu_lock:
            return dict(self.imu)

    def stop(self):
        self.running = False
        if self.ser and self.ser.is_open:
            self.ser.close()


# ══════════════════════════════════════════════════════════════════════════════
#  INIT (after CLI args parsed below)
# ══════════════════════════════════════════════════════════════════════════════

def make_app(cam_index, width, height, fps, quality, serial_port, baud):
    camera  = Camera(cam_index, width, height, fps, quality)
    arduino = Arduino(serial_port, baud)

    # ── MJPEG generator ───────────────────────────────────────────────────────
    def mjpeg_generator():
        interval = 1.0 / fps
        while True:
            jpeg = camera.get_jpeg()
            if jpeg:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n"
                    + jpeg + b"\r\n"
                )
            time.sleep(interval)

    # ── Routes ────────────────────────────────────────────────────────────────

    @app.route("/stream")
    def stream():
        return Response(mjpeg_generator(),
                        mimetype="multipart/x-mixed-replace; boundary=frame")

    @app.route("/snapshot")
    def snapshot():
        jpeg = camera.get_jpeg()
        if not jpeg:
            return "Not ready", 503
        return Response(jpeg, mimetype="image/jpeg")

    @app.route("/cmd", methods=["POST"])
    def cmd():
        data = request.get_json(force=True, silent=True) or {}
        command = data.get("cmd", "").strip()
        if not command:
            return jsonify({"ok": False, "error": "empty command"}), 400
        ok = arduino.send(command)
        return jsonify({"ok": ok, "cmd": command})

    @app.route("/imu")
    def imu_json():
        return jsonify(arduino.get_imu())

    @app.route("/imu/stream")
    def imu_stream():
        def generate():
            while True:
                yield f"data: {json.dumps(arduino.get_imu())}\n\n"
                time.sleep(0.05)
        return Response(generate(), mimetype="text/event-stream")

    @app.route("/status")
    def server_status():
        return jsonify({
            "camera": {
                "fps_capture": camera.fps_capture,
                "fps_encode":  camera.fps_encode,
                "resolution":  f"{width}x{height}",
                "quality":     quality,
                "encoder":     "simplejpeg" if USE_SIMPLEJPEG else "opencv",
            },
            "arduino": arduino.get_imu(),
        })

    @app.route("/")
    def index():
        try:
            ip = socket.gethostbyname(socket.gethostname())
        except Exception:
            ip = "localhost"
        return DASHBOARD_HTML.replace("__IP__", ip).replace("__PORT__", str(DEFAULT_PORT))

    return camera, arduino


# ══════════════════════════════════════════════════════════════════════════════
#  DASHBOARD HTML
# ══════════════════════════════════════════════════════════════════════════════

DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Robot Control</title>
<style>
:root{
  --bg:#0a0c0f; --panel:#10141a; --border:#1e2a38;
  --accent:#00e5ff; --green:#00ff88; --red:#ff3d6b;
  --yellow:#ffaa00; --text:#c8d8e8; --muted:#3a5068;
  --mono:'Courier New',monospace; --ui:'Segoe UI',sans-serif;
}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--text);font-family:var(--ui);min-height:100vh;
     display:flex;flex-direction:column}

/* Header */
header{background:var(--panel);border-bottom:1px solid var(--border);
       padding:12px 20px;display:flex;align-items:center;gap:12px}
.logo{font-family:var(--mono);font-size:15px;font-weight:bold;letter-spacing:3px;color:#fff}
.logo span{color:var(--accent)}
.conn-dot{width:9px;height:9px;border-radius:50%;background:var(--muted);transition:all .3s}
.conn-dot.live{background:var(--green);box-shadow:0 0 8px var(--green)}
.conn-dot.error{background:var(--red);box-shadow:0 0 8px var(--red)}
.conn-dot.rotating{background:var(--yellow);box-shadow:0 0 8px var(--yellow);animation:blink .6s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
#hdr-status{font-size:11px;color:var(--muted);font-family:var(--mono);margin-left:4px}

/* Layout */
main{flex:1;display:grid;grid-template-columns:1fr 340px;gap:0;min-height:0}

/* Stream panel */
.stream-panel{background:#060809;position:relative;display:flex;
              align-items:center;justify-content:center;overflow:hidden;min-height:300px}
.stream-panel img{width:100%;height:100%;object-fit:contain;display:block}
.live-badge{position:absolute;top:12px;left:12px;
            background:rgba(0,0,0,.75);border:1px solid var(--green);
            border-radius:3px;padding:3px 10px;font-family:var(--mono);
            font-size:11px;color:var(--green);letter-spacing:2px;
            display:flex;align-items:center;gap:6px}
.live-dot{width:6px;height:6px;border-radius:50%;background:var(--green);
          box-shadow:0 0 6px var(--green);animation:blink 1.2s infinite}
.rotate-overlay{position:absolute;inset:0;background:rgba(0,0,0,.55);
                display:none;align-items:center;justify-content:center;
                flex-direction:column;gap:10px;z-index:5}
.rotate-overlay.visible{display:flex}
.rotate-overlay .spin-icon{font-size:48px;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.rotate-overlay p{font-family:var(--mono);color:var(--yellow);letter-spacing:2px;font-size:13px}
.yaw-overlay{position:absolute;bottom:12px;left:12px;
             background:rgba(0,0,0,.7);border:1px solid var(--border);
             border-radius:3px;padding:4px 12px;font-family:var(--mono);
             font-size:12px;color:var(--accent)}

/* Control panel */
.ctrl-panel{background:var(--panel);border-left:1px solid var(--border);
            padding:18px;display:flex;flex-direction:column;gap:16px;overflow-y:auto}

.section-title{font-size:9px;letter-spacing:2px;color:var(--muted);text-transform:uppercase;
               display:flex;align-items:center;gap:8px;margin-bottom:8px}
.section-title::after{content:'';flex:1;height:1px;background:var(--border)}

/* Speed slider */
.slider-row{display:flex;align-items:center;gap:10px}
input[type=range]{flex:1;accent-color:var(--accent);height:4px}
.speed-val{font-family:var(--mono);font-size:14px;color:var(--accent);min-width:32px;text-align:right}

/* D-pad */
.dpad{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;max-width:240px;margin:0 auto}
.dpad-btn{
  background:#0d1117;border:1px solid var(--border);border-radius:6px;
  color:var(--text);font-size:22px;padding:14px 0;cursor:pointer;
  transition:all .15s;user-select:none;text-align:center;
  -webkit-tap-highlight-color:transparent;
}
.dpad-btn:hover{border-color:var(--accent);color:var(--accent);background:rgba(0,229,255,.07)}
.dpad-btn:active,.dpad-btn.pressed{background:var(--accent);color:#000;border-color:var(--accent);
                                   box-shadow:0 0 14px rgba(0,229,255,.5);transform:scale(.96)}
.dpad-btn.rotate{font-size:18px}
.dpad-btn.stop-btn{background:rgba(255,61,107,.1);border-color:var(--red);color:var(--red)}
.dpad-btn.stop-btn:active{background:var(--red);color:#fff}
.dpad-spacer{visibility:hidden}

/* IMU readout */
.imu-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.imu-box{background:#0d1117;border:1px solid var(--border);border-radius:4px;padding:8px 10px}
.imu-label{font-size:9px;letter-spacing:1.5px;color:var(--muted);text-transform:uppercase;margin-bottom:3px}
.imu-val{font-family:var(--mono);font-size:15px;color:var(--accent);font-weight:bold}
.imu-val.warn{color:var(--yellow)}
.imu-val.danger{color:var(--red)}

/* Yaw compass */
.compass-wrap{display:flex;justify-content:center;margin:4px 0}
.compass{position:relative;width:100px;height:100px}
.compass-ring{width:100%;height:100%;border-radius:50%;border:2px solid var(--border);
              position:relative;background:#0d1117}
.compass-tick{position:absolute;width:2px;height:10px;background:var(--muted);
              left:50%;top:4px;transform-origin:1px 46px}
.compass-needle{position:absolute;width:2px;height:42px;background:var(--accent);
                left:50%;top:8px;transform-origin:1px 42px;transition:transform .1s;
                box-shadow:0 0 6px var(--accent)}
.compass-center{position:absolute;width:8px;height:8px;border-radius:50%;
                background:var(--accent);top:50%;left:50%;transform:translate(-50%,-50%)}
.compass-label{position:absolute;font-family:var(--mono);font-size:9px;color:var(--muted)}
.compass-label.n{top:14px;left:50%;transform:translateX(-50%)}
.compass-label.s{bottom:14px;left:50%;transform:translateX(-50%)}

/* Status log */
.log-box{background:#0d1117;border:1px solid var(--border);border-radius:4px;
         height:80px;overflow-y:auto;padding:6px 10px;font-family:var(--mono);font-size:11px;
         color:var(--muted);display:flex;flex-direction:column-reverse}
.log-entry{padding:1px 0;border-bottom:1px solid #1a1f28}
.log-entry.cmd{color:var(--accent)}
.log-entry.ok{color:var(--green)}
.log-entry.err{color:var(--red)}

@media(max-width:700px){
  main{grid-template-columns:1fr}
  .ctrl-panel{border-left:none;border-top:1px solid var(--border)}
}
</style>
</head><body>

<header>
  <span class="logo">ROBOT<span>·</span>CTRL</span>
  <div class="conn-dot" id="conn-dot"></div>
  <span id="hdr-status">connecting…</span>
</header>

<main>
  <!-- Stream -->
  <div class="stream-panel">
    <img src="/stream" alt="stream" id="stream-img"/>
    <div class="live-badge"><div class="live-dot"></div>LIVE</div>
    <div class="rotate-overlay" id="rotate-overlay">
      <div class="spin-icon">↻</div>
      <p id="rotate-msg">ROTATING…</p>
    </div>
    <div class="yaw-overlay">YAW: <span id="yaw-overlay-val">0.0°</span></div>
  </div>

  <!-- Controls -->
  <div class="ctrl-panel">

    <!-- Speed -->
    <div>
      <div class="section-title">Speed</div>
      <div class="slider-row">
        <input type="range" id="speed-slider" min="60" max="255" value="150" oninput="updateSpeed(this.value)"/>
        <span class="speed-val" id="speed-display">150</span>
      </div>
    </div>

    <!-- D-Pad -->
    <div>
      <div class="section-title">Drive</div>
      <div class="dpad">
        <div class="dpad-spacer"></div>
        <div class="dpad-btn" id="btn-fwd"
             onmousedown="pressBtn('fwd')" onmouseup="releaseBtn('fwd')"
             ontouchstart="pressBtn('fwd')" ontouchend="releaseBtn('fwd')">▲</div>
        <div class="dpad-spacer"></div>

        <div class="dpad-btn rotate" id="btn-left"
             onmousedown="pressBtn('left')" onmouseup="releaseBtn('left')"
             ontouchstart="pressBtn('left')" ontouchend="releaseBtn('left')">↺ 180°</div>
        <div class="dpad-btn stop-btn" id="btn-stop"
             onclick="sendStop()">■</div>
        <div class="dpad-btn rotate" id="btn-right"
             onmousedown="pressBtn('right')" onmouseup="releaseBtn('right')"
             ontouchstart="pressBtn('right')" ontouchend="releaseBtn('right')">↻ 180°</div>

        <div class="dpad-spacer"></div>
        <div class="dpad-btn" id="btn-bwd"
             onmousedown="pressBtn('bwd')" onmouseup="releaseBtn('bwd')"
             ontouchstart="pressBtn('bwd')" ontouchend="releaseBtn('bwd')">▼</div>
        <div class="dpad-spacer"></div>
      </div>
    </div>

    <!-- IMU -->
    <div>
      <div class="section-title">IMU</div>
      <div class="compass-wrap">
        <div class="compass">
          <div class="compass-ring">
            <div class="compass-needle" id="compass-needle"></div>
            <div class="compass-center"></div>
            <span class="compass-label n">N</span>
            <span class="compass-label s">S</span>
          </div>
        </div>
      </div>
      <div class="imu-grid">
        <div class="imu-box">
          <div class="imu-label">Yaw</div>
          <div class="imu-val" id="imu-yaw">0.0°</div>
        </div>
        <div class="imu-box">
          <div class="imu-label">Roll</div>
          <div class="imu-val" id="imu-roll">0.0°</div>
        </div>
        <div class="imu-box">
          <div class="imu-label">Pitch</div>
          <div class="imu-val" id="imu-pitch">0.0°</div>
        </div>
        <div class="imu-box">
          <div class="imu-label">Rate</div>
          <div class="imu-val" id="imu-rate">-- Hz</div>
        </div>
      </div>
    </div>

    <!-- Log -->
    <div>
      <div class="section-title">Log</div>
      <div class="log-box" id="log-box"></div>
    </div>

  </div>
</main>

<script>
// ── State ──────────────────────────────────────────────────────────────────
let speed     = 150;
let rotating  = false;
let holdTimer = null;   // for forward/backward hold-to-drive
const HOLD_INTERVAL = 200;  // ms between repeat commands while held

// ── Speed ──────────────────────────────────────────────────────────────────
function updateSpeed(v) {
  speed = parseInt(v);
  document.getElementById("speed-display").textContent = speed;
}

// ── Button press / release ─────────────────────────────────────────────────
function pressBtn(action) {
  const btn = {
    fwd:   "btn-fwd",
    bwd:   "btn-bwd",
    left:  "btn-left",
    right: "btn-right",
  }[action];
  if (btn) document.getElementById(btn).classList.add("pressed");

  if (action === "fwd" || action === "bwd") {
    sendDrive(action);
    // Keep sending while held
    holdTimer = setInterval(() => sendDrive(action), HOLD_INTERVAL);
  } else if (action === "left") {
    sendRotate("LEFT");
  } else if (action === "right") {
    sendRotate("RIGHT");
  }
}

function releaseBtn(action) {
  const btn = {
    fwd:   "btn-fwd",
    bwd:   "btn-bwd",
    left:  "btn-left",
    right: "btn-right",
  }[action];
  if (btn) document.getElementById(btn).classList.remove("pressed");

  if (action === "fwd" || action === "bwd") {
    clearInterval(holdTimer);
    holdTimer = null;
    sendCmd("STOP");
  }
  // Rotate buttons don't stop — Arduino stops automatically at 180°
}

// ── Drive commands ─────────────────────────────────────────────────────────
function sendDrive(action) {
  if (rotating) return;
  const dir = action === "fwd" ? "FORWARD" : "BACKWARD";
  sendCmd(`${dir} ${speed}`);
}

function sendRotate(dir) {
  if (rotating) return;
  sendCmd(`ROTATE_${dir} ${speed}`);
}

function sendStop() {
  clearInterval(holdTimer);
  holdTimer = null;
  sendCmd("S");
}

// ── Send to server ─────────────────────────────────────────────────────────
async function sendCmd(cmd) {
  addLog(cmd, "cmd");
  try {
    const res = await fetch("/cmd", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({cmd})
    });
    const data = await res.json();
    if (!data.ok) addLog("Send failed", "err");
  } catch (e) {
    addLog("Network error", "err");
  }
}

// ── Log ────────────────────────────────────────────────────────────────────
function addLog(msg, cls = "") {
  const box  = document.getElementById("log-box");
  const ts   = new Date().toTimeString().slice(0, 8);
  const div  = document.createElement("div");
  div.className = "log-entry " + cls;
  div.textContent = `${ts}  ${msg}`;
  box.prepend(div);
  // Keep max 40 entries
  while (box.children.length > 40) box.removeChild(box.lastChild);
}

// ── IMU SSE ────────────────────────────────────────────────────────────────
const es = new EventSource("/imu/stream");
es.onmessage = e => {
  const d = JSON.parse(e.data);

  // Connection dot
  const dot = document.getElementById("conn-dot");
  const hdr = document.getElementById("hdr-status");
  if (d.status === "live") {
    dot.className = d.rotating ? "conn-dot rotating" : "conn-dot live";
    hdr.textContent = d.rotating
      ? `Rotating… yaw ${d.yaw.toFixed(1)}°`
      : `Live — ${d.sample_rate} Hz`;
  } else {
    dot.className = "conn-dot error";
    hdr.textContent = d.status;
  }

  // IMU boxes
  document.getElementById("imu-yaw").textContent   = d.yaw.toFixed(1)   + "°";
  document.getElementById("imu-roll").textContent  = d.roll.toFixed(1)  + "°";
  document.getElementById("imu-pitch").textContent = d.pitch.toFixed(1) + "°";
  document.getElementById("imu-rate").textContent  = d.sample_rate + " Hz";
  document.getElementById("yaw-overlay-val").textContent = d.yaw.toFixed(1) + "°";

  // Colour yaw based on tilt
  const yawEl = document.getElementById("imu-yaw");
  const absYaw = Math.abs(d.yaw % 360);
  yawEl.className = "imu-val"; // reset

  // Compass needle
  document.getElementById("compass-needle").style.transform = `rotate(${d.yaw}deg)`;

  // Rotate overlay
  rotating = d.rotating;
  const ov = document.getElementById("rotate-overlay");
  if (d.rotating) {
    ov.classList.add("visible");
    document.getElementById("rotate-msg").textContent =
      `ROTATING… ${d.yaw.toFixed(1)}°`;
  } else {
    ov.classList.remove("visible");
  }
};

es.onerror = () => {
  document.getElementById("conn-dot").className = "conn-dot error";
  document.getElementById("hdr-status").textContent = "SSE lost — retrying…";
};

// ── Keyboard support ───────────────────────────────────────────────────────
const keyMap = {
  ArrowUp:    "fwd",
  ArrowDown:  "bwd",
  ArrowLeft:  "left",
  ArrowRight: "right",
  " ":        "stop",
  "w":        "fwd",
  "s":        "bwd",
  "a":        "left",
  "d":        "right",
};
const keysHeld = new Set();

document.addEventListener("keydown", e => {
  const action = keyMap[e.key];
  if (!action || keysHeld.has(e.key)) return;
  e.preventDefault();
  keysHeld.add(e.key);
  if (action === "stop") { sendStop(); return; }
  pressBtn(action);
});

document.addEventListener("keyup", e => {
  const action = keyMap[e.key];
  if (!action) return;
  keysHeld.delete(e.key);
  if (action === "stop") return;
  releaseBtn(action);
});

addLog("UI ready — awaiting Arduino", "ok");
</script>
</body></html>"""


# ══════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Pi Robot Control Server")
    parser.add_argument("--serial",  default=DEFAULT_SERIAL,  help="Arduino serial port")
    parser.add_argument("--baud",    default=DEFAULT_BAUD,    type=int)
    parser.add_argument("--cam",     default=DEFAULT_CAM,     type=int)
    parser.add_argument("--width",   default=DEFAULT_WIDTH,   type=int)
    parser.add_argument("--height",  default=DEFAULT_HEIGHT,  type=int)
    parser.add_argument("--fps",     default=DEFAULT_FPS,     type=int)
    parser.add_argument("--quality", default=DEFAULT_QUALITY, type=int)
    parser.add_argument("--port",    default=DEFAULT_PORT,    type=int)
    args = parser.parse_args()

    camera, arduino = make_app(
        args.cam, args.width, args.height, args.fps, args.quality,
        args.serial, args.baud
    )

    try:
        ip = socket.gethostbyname(socket.gethostname())
    except Exception:
        ip = "YOUR_PI_IP"

    print()
    print("  ╔══════════════════════════════════════════╗")
    print("  ║      Pi Robot Control Server             ║")
    print("  ╠══════════════════════════════════════════╣")
    print(f"  ║  UI      : http://{ip}:{args.port}/")
    print(f"  ║  Stream  : http://{ip}:{args.port}/stream")
    print(f"  ║  IMU JSON: http://{ip}:{args.port}/imu")
    print(f"  ║  Status  : http://{ip}:{args.port}/status")
    print("  ╠══════════════════════════════════════════╣")
    print(f"  ║  Camera  : {args.width}x{args.height} @ {args.fps}fps")
    print(f"  ║  Arduino : {args.serial} @ {args.baud}")
    print(f"  ║  Encoder : {'simplejpeg' if USE_SIMPLEJPEG else 'opencv'}")
    print("  ╚══════════════════════════════════════════╝")
    print()
    print("  Keyboard: W/↑ fwd  S/↓ back  A/← rotate left  D/→ rotate right  SPACE stop")
    print()

    app.run(host="0.0.0.0", port=args.port, threaded=True, debug=False)
