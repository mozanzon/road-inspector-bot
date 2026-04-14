#!/usr/bin/env python3
import cv2
import socket
import threading
import time
import logging
import signal
import sys
import queue

from flask import Flask, Response, request, jsonify
from imu_stabilizer import ImuReadingStabilizer

try:
    import serial
except ImportError:
    serial = None

USE_SIMPLEJPEG = False

CAMERA_INDEX  = 0
WIDTH         = 320
HEIGHT        = 240
FPS           = 20
JPEG_QUALITY  = 65
PORT          = 8080
HOST          = "0.0.0.0"

SERIAL_PORT   = "/dev/ttyACM0"
SERIAL_BAUD   = 115200

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger(__name__)
app = Flask(__name__)

ser = None
ser_lock = threading.Lock()
open_serial_lock = threading.Lock()
camera = None
imu_reading_stabilizer = ImuReadingStabilizer(
    accel_alpha=0.20,
    gyro_alpha=0.20,
    heading_alpha=0.18,
    encoder_noise_floor_ticks=1,
    encoder_max_ticks_per_sec=2500,
)

# ── IMU state — updated by background reader thread
imu_data = {
    "ax": 0.0, "ay": 0.0, "az": 0.0,
    "gx": 0.0, "gy": 0.0, "gz": 0.0,
    "heading": 0.0,
    "enc1": 0, "enc2": 0,  # legacy aliases (delta ticks)
    "enc1_delta": 0, "enc2_delta": 0,
    "enc1_total": 0, "enc2_total": 0,
    "enc1_tps": 0.0, "enc2_tps": 0.0,
    "enc_delta_err": 0,
    "enc_delta_err_pct": 0.0,
    "enc_total_err": 0,
    "dt_ms": 0,
    "ts": 0.0
}
imu_lock = threading.Lock()
# SSE subscribers: each is a queue.Queue
imu_subscribers = []
imu_subs_lock = threading.Lock()
pid_data = {"kp": None, "ki": None, "kd": None, "ts": 0.0}
pid_lock = threading.Lock()


def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"


def open_serial():
    """Open or reopen the serial port. Returns True on success."""
    global ser
    if serial is None:
        log.warning("pyserial not installed. pip3 install pyserial")
        return False
    with open_serial_lock:
        with ser_lock:
            if ser is not None:
                return True
        try:
            s = serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=0.2)
            time.sleep(2.0)
            try:
                s.write(b"PID_GET\n")
                s.flush()
            except Exception as e:
                log.debug(f"Could not request PID values on connect: {e}")
            with ser_lock:
                ser = s
            log.info(f"Serial connected: {SERIAL_PORT} @ {SERIAL_BAUD}")
            return True
        except Exception as e:
            with ser_lock:
                ser = None
            log.warning(f"Serial unavailable: {e}")
            return False


def write_serial_command(cmd):
    """Write one line to Arduino serial. Returns (ok, payload, status_code)."""
    global ser
    with ser_lock:
        s = ser
    if s is None:
        if not open_serial():
            return False, {"ok": False, "error": "serial not connected"}, 503
        with ser_lock:
            s = ser
    if s is None:
        return False, {"ok": False, "error": "serial not connected"}, 503

    try:
        s.write((cmd + "\n").encode("utf-8"))
        s.flush()
        return True, {"ok": True, "sent": cmd}, 200
    except Exception as e:
        with ser_lock:
            ser = None
        log.warning(f"Serial write failed, port marked dead: {e}")
        return False, {"ok": False, "error": str(e)}, 500


# ── Background thread: reads all lines from serial, parses IMU packets
def serial_reader():
    """Continuously reads lines from the serial port.
    Lines starting with 'IMU,' are parsed and broadcast to SSE subscribers.
    All other lines are logged at DEBUG level.
    Reconnects automatically if the port goes away.
    """
    global ser
    while True:
        with ser_lock:
            s = ser
        if s is None:
            open_serial()
            time.sleep(1.0)
            continue
        try:
            raw = s.readline()   # blocks up to timeout (0.2 s)
            if not raw:
                continue
            line = raw.decode("utf-8", errors="replace").strip()
            if line.startswith("IMU,"):
                _parse_imu(line)
            elif line.startswith("PID,"):
                _parse_pid(line)
            else:
                if line:
                    log.debug(f"[Arduino] {line}")
        except Exception as e:
            log.warning(f"Serial read error: {e}")
            with ser_lock:
                ser = None
            time.sleep(2.0)
            open_serial()


def _parse_pid(line):
    """Parse PID CSV: PID,kp,ki,kd."""
    parts = line.split(",")
    if len(parts) != 4:
        return
    try:
        kp = float(parts[1])
        ki = float(parts[2])
        kd = float(parts[3])
    except ValueError:
        return

    with pid_lock:
        pid_data.update({"kp": kp, "ki": ki, "kd": kd, "ts": time.time()})


def _parse_imu(line):
    """Parse IMU CSV (legacy/new):
    IMU,ax,ay,az,gx,gy,gz,heading,enc1_delta,enc2_delta[,dt_ms[,enc1_total,enc2_total]]
    """
    global imu_data
    parts = line.split(",")
    if len(parts) not in (10, 11, 13):
        return
    try:
        ax = float(parts[1])
        ay = float(parts[2])
        az = float(parts[3])
        gx = float(parts[4])
        gy = float(parts[5])
        gz = float(parts[6])
        heading = float(parts[7])
        enc1_delta = int(parts[8])
        enc2_delta = int(parts[9])
        dt_ms = int(parts[10]) if len(parts) >= 11 else 0
        has_totals = len(parts) == 13
        enc1_total_wire = int(parts[11]) if has_totals else None
        enc2_total_wire = int(parts[12]) if has_totals else None
    except ValueError:
        return

    stabilized = imu_reading_stabilizer.stabilize(
        ax=ax,
        ay=ay,
        az=az,
        gx=gx,
        gy=gy,
        gz=gz,
        heading=heading,
        enc1_delta=enc1_delta,
        enc2_delta=enc2_delta,
        dt_ms=dt_ms,
    )
    ax = stabilized["ax"]
    ay = stabilized["ay"]
    az = stabilized["az"]
    gx = stabilized["gx"]
    gy = stabilized["gy"]
    gz = stabilized["gz"]
    heading = stabilized["heading"]
    enc1_delta = stabilized["enc1_delta"]
    enc2_delta = stabilized["enc2_delta"]

    dt_sec = dt_ms / 1000.0 if dt_ms > 0 else 0.0

    with imu_lock:
        prev_enc1_total = int(imu_data.get("enc1_total", 0))
        prev_enc2_total = int(imu_data.get("enc2_total", 0))
        if has_totals:
            enc1_total = enc1_total_wire
            enc2_total = enc2_total_wire
        else:
            enc1_total = prev_enc1_total + enc1_delta
            enc2_total = prev_enc2_total + enc2_delta

        enc1_tps = (enc1_delta / dt_sec) if dt_sec > 0 else 0.0
        enc2_tps = (enc2_delta / dt_sec) if dt_sec > 0 else 0.0
        enc_delta_err = enc1_delta - enc2_delta
        denom = max(abs(enc1_delta), abs(enc2_delta))
        enc_delta_err_pct = (abs(enc_delta_err) * 100.0 / denom) if denom > 0 else 0.0
        enc_total_err = enc1_total - enc2_total

        data = {
            "ax": ax,
            "ay": ay,
            "az": az,
            "gx": gx,
            "gy": gy,
            "gz": gz,
            "heading": heading,
            "enc1": enc1_delta,
            "enc2": enc2_delta,
            "enc1_delta": enc1_delta,
            "enc2_delta": enc2_delta,
            "enc1_total": enc1_total,
            "enc2_total": enc2_total,
            "enc1_tps": enc1_tps,
            "enc2_tps": enc2_tps,
            "enc_delta_err": enc_delta_err,
            "enc_delta_err_pct": enc_delta_err_pct,
            "enc_total_err": enc_total_err,
            "dt_ms": dt_ms,
            "ts": time.time()
        }
        imu_data.update(data)

    # push to every SSE subscriber
    msg = (
        f"data: {data['ax']:.3f},{data['ay']:.3f},{data['az']:.3f},"
        f"{data['gx']:.3f},{data['gy']:.3f},{data['gz']:.3f},"
        f"{data['heading']:.2f},{data['enc1_delta']},{data['enc2_delta']},{data['dt_ms']},"
        f"{data['enc1_total']},{data['enc2_total']},{data['enc1_tps']:.2f},{data['enc2_tps']:.2f},"
        f"{data['enc_delta_err']},{data['enc_delta_err_pct']:.2f}\n\n"
    )
    with imu_subs_lock:
        dead = []
        for q in imu_subscribers:
            try:
                q.put_nowait(msg)
            except queue.Full:
                dead.append(q)
        for q in dead:
            imu_subscribers.remove(q)


# ── Camera class (unchanged from V6)
class Camera:
    def __init__(self):
        self._raw_frame = None
        self._jpeg_frame = None
        self._raw_lock = threading.Lock()
        self._jpeg_lock = threading.Lock()
        self.running = False
        self.fps_capture = 0.0
        self.fps_encode = 0.0
        self.cap = None

        self._open_camera()
        self.running = True
        self._t_cap = threading.Thread(target=self._capture_loop, daemon=True, name="capture")
        self._t_enc = threading.Thread(target=self._encode_loop, daemon=True, name="encode")
        self._t_cap.start()
        self._t_enc.start()

    def _open_camera(self):
        log.info(f"Opening /dev/video{CAMERA_INDEX} with V4L2...")
        self.cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_V4L2)
        if not self.cap.isOpened():
            raise RuntimeError(f"Cannot open /dev/video{CAMERA_INDEX}")

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, WIDTH)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
        self.cap.set(cv2.CAP_PROP_FPS, FPS)
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"MJPG"))
        ok, frame = self.cap.read()
        if not ok or frame is None:
            log.warning("MJPG failed, trying YUYV...")
            self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"YUYV"))
            ok2, frame2 = self.cap.read()
            if not ok2 or frame2 is None:
                raise RuntimeError("Camera cannot read frames with MJPG/YUYV")

        w = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = self.cap.get(cv2.CAP_PROP_FPS)
        log.info(f"Camera ready: {w}x{h} @ {fps:.0f}fps | encoder: opencv")

    def _capture_loop(self):
        count, t0 = 0, time.time()
        while self.running:
            ok, frame = self.cap.read()
            if not ok or frame is None:
                time.sleep(0.02)
                continue
            with self._raw_lock:
                self._raw_frame = frame
            count += 1
            dt = time.time() - t0
            if dt >= 2.0:
                self.fps_capture = round(count / dt, 1)
                count, t0 = 0, time.time()

    def _encode_loop(self):
        count, t0 = 0, time.time()
        interval = 1.0 / FPS if FPS > 0 else 0.05
        while self.running:
            ts = time.time()
            with self._raw_lock:
                frame = self._raw_frame

            if frame is None:
                time.sleep(0.01)
                continue

            ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
            if ok:
                with self._jpeg_lock:
                    self._jpeg_frame = buf.tobytes()
                count += 1

            sleep_time = interval - (time.time() - ts)
            if sleep_time > 0:
                time.sleep(sleep_time)

            dt = time.time() - t0
            if dt >= 2.0:
                self.fps_encode = round(count / dt, 1)
                count, t0 = 0, time.time()

    def get_jpeg(self):
        with self._jpeg_lock:
            return self._jpeg_frame

    def stop(self):
        self.running = False
        time.sleep(0.1)
        if self.cap:
            self.cap.release()


def mjpeg_generator():
    interval = 1.0 / FPS if FPS > 0 else 0.05
    while True:
        if camera is None:
            time.sleep(0.1)
            continue
        jpeg = camera.get_jpeg()
        if jpeg:
            yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + jpeg + b"\r\n"
        time.sleep(interval)


# ── Routes ──────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    ip = get_local_ip()
    return f"""
<!doctype html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pi Stream + Control</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:#111;color:#eee;font-family:Arial,sans-serif;display:flex;flex-direction:column;align-items:center;min-height:100vh}}
header{{width:100%;padding:12px 16px;background:#1a1a1a;border-bottom:1px solid #333;text-align:center}}
header h2{{font-size:1.1rem;margin-bottom:4px}}
header .links a{{color:#65c3ff;margin:0 6px;font-size:.85rem}}
.main{{width:100%;max-width:820px;padding:12px}}

/* stream */
.stream-wrap img{{width:100%;border:2px solid #333;border-radius:6px;display:block}}

/* controls card */
.card{{background:#1c1c1c;border:1px solid #2a2a2a;border-radius:8px;padding:12px;margin-top:12px}}
.card h3{{font-size:.85rem;color:#888;text-transform:uppercase;letter-spacing:.06em;margin-bottom:10px}}

/* speed slider */
.speed-row{{display:flex;align-items:center;gap:10px;margin-bottom:10px}}
.speed-row label{{font-size:.9rem;white-space:nowrap}}
.speed-row input[type=range]{{flex:1;accent-color:#4a9eff}}
.speed-row span{{min-width:32px;text-align:right;font-weight:bold;color:#4a9eff}}

/* buttons */
.btn-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}}
.btn-grid button,.btn-row button{{
  font-size:.9rem;padding:10px 6px;border:none;border-radius:6px;
  background:#2a2a2a;color:#eee;cursor:pointer;transition:background .15s
}}
.btn-grid button:hover,.btn-row button:hover{{background:#3a3a3a}}
.btn-fwd{{background:#1a4a1a!important;color:#6f6!important}}
.btn-bwd{{background:#3a1a1a!important;color:#f66!important}}
.btn-stop{{background:#2a2a00!important;color:#ff6!important}}
.btn-emg{{background:#5a0000!important;color:#f88!important;font-weight:bold}}
.btn-row{{display:flex;gap:6px;margin-top:6px}}
.btn-row button{{flex:1}}

/* log */
#log{{margin-top:8px;font-size:.8rem;color:#8f8;min-height:18px;text-align:center}}

/* IMU panel */
.imu-grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:6px}}
.imu-cell{{background:#141414;border:1px solid #252525;border-radius:6px;padding:8px;text-align:center}}
.imu-cell .label{{font-size:.7rem;color:#666;margin-bottom:2px}}
.imu-cell .val{{font-size:1rem;font-weight:bold;color:#4af}}
.imu-heading{{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:14px;padding:8px;background:#141414;border:1px solid #252525;border-radius:6px;margin-top:4px}}
.imu-heading .label{{font-size:.75rem;color:#666}}
.imu-heading .val{{font-size:1.3rem;font-weight:bold;color:#fa4}}
.imu-controls{{display:flex;gap:8px;margin-top:8px}}
.imu-controls button{{flex:1;font-size:.8rem;padding:7px;border:none;border-radius:5px;background:#223;color:#aaf;cursor:pointer}}
.imu-controls button:hover{{background:#334}}
.imu-controls select{{flex:1;font-size:.8rem;padding:7px;border:none;border-radius:5px;background:#223;color:#aaf}}
.imu-controls input{{flex:1;font-size:.8rem;padding:7px;border:1px solid #2d2d2d;border-radius:5px;background:#161b2d;color:#aaf}}
.imu-cell input{{width:100%;padding:6px;border:1px solid #2d2d2d;border-radius:4px;background:#0f0f0f;color:#d8ecff;text-align:center}}
canvas{{display:block;width:100%;border-radius:6px;margin-top:6px;background:#0a0a0a}}
</style>
</head><body>
<header>
  <h2>Pi Stream + Motor Control</h2>
  <div style="font-size:.8rem;color:#666">{ip}:{PORT}</div>
  <div class="links">
    <a href="/stream" target="_blank">/stream</a>
    <a href="/snapshot" target="_blank">/snapshot</a>
    <a href="/imu" target="_blank">/imu (SSE)</a>
    <a href="/pid" target="_blank">/pid</a>
    <a href="/status" target="_blank">/status</a>
  </div>
</header>

<div class="main">

  <!-- Stream -->
  <div class="stream-wrap card" style="padding:6px">
    <img src="/stream" alt="Live stream">
  </div>

  <!-- Motor Controls -->
  <div class="card">
    <h3>Motor Control</h3>

    <div class="speed-row">
      <label>Speed</label>
      <input type="range" id="spd" min="40" max="255" value="140"
             oninput="onSpeedSlider(this.value)">
      <span id="spdVal">140</span>
    </div>
    <div class="speed-row" style="margin-top:-4px">
      <label>v max @255 (m/s)</label>
      <input type="number" id="vMax" min="0.10" max="5.00" step="0.05" value="1.00"
             onchange="onVmaxChange()">
      <span id="spdMs">0.549</span>
    </div>

    <div class="btn-grid">
      <div></div>
      <button class="btn-fwd" onclick="driveForward()">▲ Forward</button>
      <div></div>
      <button onclick="turnLeft90()">↺ Left 90°</button>
      <button class="btn-stop" onclick="stopDrive()">■ Stop</button>
      <button onclick="turnRight90()">↻ Right 90°</button>
      <div></div>
      <button class="btn-bwd" onclick="driveBackward()">▼ Backward</button>
      <button class="btn-emg" onclick="emergencyDriveStop()">⚡ EMERGENCY</button>
    </div>
    <div style="font-size:.75rem;color:#777;text-align:center;margin-top:8px">
      Forward/Backward now use closed-loop <code>CMD,v,omega</code> with <code>omega=0</code>
    </div>

    <div id="log">—</div>
  </div>

  <!-- IMU Panel -->
  <div class="card">
    <h3>IMU Data (MPU-9250)</h3>

    <div class="imu-controls">
      <button onclick="startImu()">▶ Start Stream</button>
      <button onclick="stopImu()">■ Stop Stream</button>
      <select id="imuRate">
        <option value="50">20 Hz</option>
        <option value="100" selected>10 Hz</option>
        <option value="200">5 Hz</option>
        <option value="500">2 Hz</option>
      </select>
      <button onclick="readOnce()">⟳ Read Once</button>
    </div>

    <div class="imu-grid" style="margin-top:10px">
      <div class="imu-cell"><div class="label">Accel X (g)</div><div class="val" id="ax">—</div></div>
      <div class="imu-cell"><div class="label">Accel Y (g)</div><div class="val" id="ay">—</div></div>
      <div class="imu-cell"><div class="label">Accel Z (g)</div><div class="val" id="az">—</div></div>
      <div class="imu-cell"><div class="label">Gyro X (°/s)</div><div class="val" id="gx">—</div></div>
      <div class="imu-cell"><div class="label">Gyro Y (°/s)</div><div class="val" id="gy">—</div></div>
      <div class="imu-cell"><div class="label">Gyro Z (°/s)</div><div class="val" id="gz">—</div></div>
    </div>

    <div class="imu-heading">
      <div><div class="label">Heading</div><div class="val" id="heading">—°</div></div>
      <canvas id="compass" width="80" height="80" style="width:80px;margin-top:0"></canvas>
    </div>

    <canvas id="accelChart" width="600" height="90"></canvas>
    <div style="font-size:.7rem;color:#555;text-align:center;margin-top:2px">Accel XYZ history</div>
  </div>

  <!-- Encoder Panel -->
  <div class="card">
    <h3>Wheel Encoders (YT06-OP-600B-2M, 600 PPR)</h3>
    <div class="imu-grid" style="margin-top:10px">
      <div class="imu-cell"><div class="label">Left Wheel Δ Ticks</div><div class="val" id="enc1">—</div></div>
      <div class="imu-cell"><div class="label">Right Wheel Δ Ticks</div><div class="val" id="enc2">—</div></div>
      <div class="imu-cell"><div class="label">Packet Δt (ms)</div><div class="val" id="enc_dt">—</div></div>
      <div class="imu-cell"><div class="label">Left Total Ticks</div><div class="val" id="enc1_total">—</div></div>
      <div class="imu-cell"><div class="label">Right Total Ticks</div><div class="val" id="enc2_total">—</div></div>
      <div class="imu-cell"><div class="label">Left Ticks/s</div><div class="val" id="enc1_tps">—</div></div>
      <div class="imu-cell"><div class="label">Right Ticks/s</div><div class="val" id="enc2_tps">—</div></div>
      <div class="imu-cell"><div class="label">Δ Error (L-R)</div><div class="val" id="enc_err">—</div></div>
      <div class="imu-cell"><div class="label">Δ Error %</div><div class="val" id="enc_err_pct">—</div></div>
      <div class="imu-cell"><div class="label">Total Error (L-R)</div><div class="val" id="enc_total_err">—</div></div>
    </div>
    <div class="imu-controls" style="margin-top:10px">
      <button onclick="sendCmd('ENC_RESET')" style="background:#123;color:#6af">Reset Counters</button>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:.8rem;color:#888">
        Live deltas, totals, rates, and left-right mismatch
      </div>
    </div>
  </div>

  <!-- PID Panel -->
  <div class="card">
    <h3>Wheel PID Tuning (CMD mode)</h3>
    <div class="imu-grid" style="margin-top:10px">
      <div class="imu-cell">
        <div class="label">Kp</div>
        <input id="pid_kp" type="number" min="0.0001" step="0.1" value="200.0">
      </div>
      <div class="imu-cell">
        <div class="label">Ki</div>
        <input id="pid_ki" type="number" min="0" step="0.1" value="35.0">
      </div>
      <div class="imu-cell">
        <div class="label">Kd</div>
        <input id="pid_kd" type="number" min="0" step="0.1" value="2.5">
      </div>
    </div>
    <div class="imu-controls" style="margin-top:10px">
      <button onclick="applyPid()">Apply PID</button>
      <button onclick="refreshPid()">Read PID</button>
      <div id="pidStatus" style="flex:2;display:flex;align-items:center;justify-content:center;font-size:.8rem;color:#8cf">
        PID idle
      </div>
    </div>
  </div>

</div><!-- /main -->

<script>
// ── Speed slider + closed-loop CMD mapping
let driveSign = 0;  // +1 forward, -1 backward, 0 idle

function spd() {{
  return parseInt(document.getElementById('spd').value || "140", 10);
}}
function vmax() {{
  const v = parseFloat(document.getElementById('vMax').value || "1.0");
  return Number.isFinite(v) && v > 0 ? v : 1.0;
}}
function speedMs() {{
  return (spd() / 255.0) * vmax();
}}
function cmdFromVw(v, omega) {{
  return 'CMD,' + v.toFixed(3) + ',' + omega.toFixed(3);
}}
function onVmaxChange() {{
  document.getElementById('spdMs').textContent = speedMs().toFixed(3);
  if (driveSign !== 0) {{
    sendCmd(cmdFromVw(driveSign * speedMs(), 0), true);
  }}
}}
function onSpeedSlider(v) {{
  document.getElementById('spdVal').textContent = v;
  document.getElementById('spdMs').textContent = speedMs().toFixed(3);
  if (driveSign !== 0) {{
    sendCmd(cmdFromVw(driveSign * speedMs(), 0), true);
  }}
}}

// ── Command sender
async function sendCmd(cmd, silent) {{
  const logEl = document.getElementById('log');
  if (!silent) logEl.textContent = 'Sending: ' + cmd;
  try {{
    const r = await fetch('/cmd', {{
      method: 'POST',
      headers: {{'Content-Type': 'application/json'}},
      body: JSON.stringify({{cmd: cmd}})
    }});
    const j = await r.json();
    if (!silent) logEl.textContent = j.ok ? ('OK: ' + j.sent) : ('ERR: ' + (j.error || 'unknown'));
  }} catch(e) {{
    if (!silent) logEl.textContent = 'ERR: ' + e;
  }}
}}

function driveForward() {{
  driveSign = 1;
  sendCmd(cmdFromVw(speedMs(), 0));
}}
function driveBackward() {{
  driveSign = -1;
  sendCmd(cmdFromVw(-speedMs(), 0));
}}
function turnLeft90() {{
  driveSign = 0;
  sendCmd('TURN_LEFT_90 ' + spd());
}}
function turnRight90() {{
  driveSign = 0;
  sendCmd('TURN_RIGHT_90 ' + spd());
}}
function stopDrive() {{
  driveSign = 0;
  sendCmd('STOP');
}}
function emergencyDriveStop() {{
  driveSign = 0;
  sendCmd('S');
}}

// ── PID panel
async function refreshPid(silent) {{
  const statusEl = document.getElementById('pidStatus');
  try {{
    const r = await fetch('/pid');
    const j = await r.json();
    if (!j.ok) {{
      if (!silent) statusEl.textContent = 'ERR: ' + (j.error || 'PID unavailable');
      return;
    }}
    if (Number.isFinite(j.kp)) document.getElementById('pid_kp').value = j.kp.toFixed(4);
    if (Number.isFinite(j.ki)) document.getElementById('pid_ki').value = j.ki.toFixed(4);
    if (Number.isFinite(j.kd)) document.getElementById('pid_kd').value = j.kd.toFixed(4);
    if (!silent) {{
      statusEl.textContent = Number.isFinite(j.kp)
        ? ('PID read: Kp=' + j.kp.toFixed(4) + ', Ki=' + j.ki.toFixed(4) + ', Kd=' + j.kd.toFixed(4))
        : 'PID not reported yet';
    }}
  }} catch (e) {{
    if (!silent) statusEl.textContent = 'ERR: ' + e;
  }}
}}

async function applyPid() {{
  const kp = parseFloat(document.getElementById('pid_kp').value);
  const ki = parseFloat(document.getElementById('pid_ki').value);
  const kd = parseFloat(document.getElementById('pid_kd').value);
  const statusEl = document.getElementById('pidStatus');

  if (!Number.isFinite(kp) || !Number.isFinite(ki) || !Number.isFinite(kd)) {{
    statusEl.textContent = 'ERR: PID values must be valid numbers';
    return;
  }}

  try {{
    const r = await fetch('/pid', {{
      method: 'POST',
      headers: {{'Content-Type': 'application/json'}},
      body: JSON.stringify({{kp: kp, ki: ki, kd: kd}})
    }});
    const j = await r.json();
    if (j.ok) {{
      statusEl.textContent = 'PID updated.';
      refreshPid(true);
    }} else {{
      statusEl.textContent = 'ERR: ' + (j.error || 'PID update failed');
    }}
  }} catch (e) {{
    statusEl.textContent = 'ERR: ' + e;
  }}
}}

// ── IMU commands
function startImu() {{
  const ms = document.getElementById('imuRate').value;
  sendCmd('IMU_STREAM ' + ms);
  startSse();
}}
function stopImu() {{
  sendCmd('IMU_STOP');
}}
function readOnce() {{
  sendCmd('IMU_READ');
  startSse();
}}

function setText(id, value) {{
  document.getElementById(id).textContent = value;
}}

// ── SSE connection
let sse = null;
function startSse() {{
  if (sse) return;   // already open
  sse = new EventSource('/imu');
  sse.onmessage = function(e) {{
    const parts = e.data.split(',');
    if (parts.length < 10) return;
    const v = parts.map(Number);

    const ax = v[0], ay = v[1], az = v[2];
    const gx = v[3], gy = v[4], gz = v[5];
    const heading = v[6];
    const enc1Delta = v[7];
    const enc2Delta = v[8];
    const dtMs = v[9];
    const enc1Total = (parts.length > 10) ? v[10] : NaN;
    const enc2Total = (parts.length > 11) ? v[11] : NaN;
    const enc1Tps = (parts.length > 12) ? v[12] : ((dtMs > 0) ? (enc1Delta * 1000.0 / dtMs) : NaN);
    const enc2Tps = (parts.length > 13) ? v[13] : ((dtMs > 0) ? (enc2Delta * 1000.0 / dtMs) : NaN);
    const encErr = (parts.length > 14) ? v[14] : (enc1Delta - enc2Delta);
    const denom = Math.max(Math.abs(enc1Delta), Math.abs(enc2Delta));
    const encErrPct = (parts.length > 15) ? v[15] : ((denom > 0) ? (Math.abs(encErr) * 100.0 / denom) : 0.0);
    const totalErr = (Number.isFinite(enc1Total) && Number.isFinite(enc2Total)) ? (enc1Total - enc2Total) : NaN;

    setText('ax', Number.isFinite(ax) ? ax.toFixed(3) : '—');
    setText('ay', Number.isFinite(ay) ? ay.toFixed(3) : '—');
    setText('az', Number.isFinite(az) ? az.toFixed(3) : '—');
    setText('gx', Number.isFinite(gx) ? gx.toFixed(2) : '—');
    setText('gy', Number.isFinite(gy) ? gy.toFixed(2) : '—');
    setText('gz', Number.isFinite(gz) ? gz.toFixed(2) : '—');
    setText('heading', Number.isFinite(heading) ? (heading.toFixed(1) + '°') : '—');
    if (Number.isFinite(heading)) drawCompass(heading);
    if (Number.isFinite(ax) && Number.isFinite(ay) && Number.isFinite(az)) pushAccel(ax, ay, az);

    setText('enc1', Number.isFinite(enc1Delta) ? String(enc1Delta) : '—');
    setText('enc2', Number.isFinite(enc2Delta) ? String(enc2Delta) : '—');
    setText('enc_dt', Number.isFinite(dtMs) ? String(dtMs) : '—');
    setText('enc1_total', Number.isFinite(enc1Total) ? String(Math.trunc(enc1Total)) : '—');
    setText('enc2_total', Number.isFinite(enc2Total) ? String(Math.trunc(enc2Total)) : '—');
    setText('enc1_tps', Number.isFinite(enc1Tps) ? enc1Tps.toFixed(2) : '—');
    setText('enc2_tps', Number.isFinite(enc2Tps) ? enc2Tps.toFixed(2) : '—');
    setText('enc_err', Number.isFinite(encErr) ? String(Math.trunc(encErr)) : '—');
    setText('enc_err_pct', Number.isFinite(encErrPct) ? (encErrPct.toFixed(2) + '%') : '—');
    setText('enc_total_err', Number.isFinite(totalErr) ? String(Math.trunc(totalErr)) : '—');
  }};
  sse.onerror = function() {{
    sse.close();
    sse = null;
    setTimeout(startSse, 2000);   // auto-reconnect
  }};
}}

// ── Compass drawing
function drawCompass(deg) {{
  const c = document.getElementById('compass');
  const ctx = c.getContext('2d');
  const cx = c.width/2, cy = c.height/2, r = cx - 4;
  ctx.clearRect(0, 0, c.width, c.height);

  // circle
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2*Math.PI);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.stroke();

  // N label
  ctx.fillStyle = '#f66'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('N', cx, cy - r + 10);

  // needle
  const rad = (deg - 90) * Math.PI / 180;
  ctx.beginPath();
  ctx.moveTo(cx + Math.cos(rad) * (r - 8), cy + Math.sin(rad) * (r - 8));
  ctx.lineTo(cx - Math.cos(rad) * 10, cy - Math.sin(rad) * 10);
  ctx.strokeStyle = '#fa4'; ctx.lineWidth = 3; ctx.stroke();

  // center dot
  ctx.beginPath(); ctx.arc(cx, cy, 3, 0, 2*Math.PI);
  ctx.fillStyle = '#fa4'; ctx.fill();
}}

// ── Accel chart (rolling buffer)
const CHART_LEN = 100;
const accelBuf = {{ ax: [], ay: [], az: [] }};

function pushAccel(ax, ay, az) {{
  ['ax','ay','az'].forEach((k, i) => {{
    accelBuf[k].push([ax, ay, az][i]);
    if (accelBuf[k].length > CHART_LEN) accelBuf[k].shift();
  }});
  drawAccelChart();
}}

function drawAccelChart() {{
  const c = document.getElementById('accelChart');
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, c.width, c.height);

  const w = c.width, h = c.height;
  const mid = h / 2;
  const scale = h / 4;   // ±2 g fits in half the canvas

  const colors = ['#4af', '#f84', '#8f4'];
  const keys   = ['ax', 'ay', 'az'];

  keys.forEach((k, ki) => {{
    const buf = accelBuf[k];
    if (buf.length < 2) return;
    ctx.beginPath();
    buf.forEach((v, i) => {{
      const x = (i / (CHART_LEN - 1)) * w;
      const y = mid - v * scale;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }});
    ctx.strokeStyle = colors[ki]; ctx.lineWidth = 1.5; ctx.stroke();
  }});

  // zero line
  ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(w, mid);
  ctx.strokeStyle = '#333'; ctx.lineWidth = 1; ctx.stroke();
}}

onVmaxChange();
refreshPid(true);
startSse();
</script>
</body></html>
"""


@app.route("/cmd", methods=["POST"])
def cmd():
    data = request.get_json(silent=True) or {}
    c = str(data.get("cmd", "")).replace("\r", "").replace("\n", "").strip()
    if not c:
        return jsonify({"ok": False, "error": "missing cmd"}), 400

    _ok, payload, status_code = write_serial_command(c)
    return jsonify(payload), status_code


@app.route("/pid", methods=["GET"])
def pid_get():
    with pid_lock:
        out = dict(pid_data)
    out["ok"] = True
    out["age_sec"] = round(time.time() - out["ts"], 2) if out["ts"] else None
    return jsonify(out)


@app.route("/pid", methods=["POST"])
def pid_set():
    data = request.get_json(silent=True) or {}
    try:
        kp = float(data.get("kp"))
        ki = float(data.get("ki"))
        kd = float(data.get("kd"))
    except (TypeError, ValueError):
        return jsonify({"ok": False, "error": "kp, ki, kd must be valid numbers"}), 400

    if kp <= 0.0 or ki < 0.0 or kd < 0.0:
        return jsonify({"ok": False, "error": "Require kp>0, ki>=0, kd>=0"}), 400

    cmd_line = f"PID_SET,{kp:.4f},{ki:.4f},{kd:.4f}"
    ok, payload, status_code = write_serial_command(cmd_line)
    if not ok:
        return jsonify(payload), status_code

    with pid_lock:
        pid_data.update({"kp": kp, "ki": ki, "kd": kd, "ts": time.time()})
        out = dict(pid_data)
    out["ok"] = True
    out["sent"] = cmd_line
    return jsonify(out), 200


@app.route("/imu")
def imu_sse():
    """Server-Sent Events endpoint — pushes IMU lines as they arrive."""
    q = queue.Queue(maxsize=30)
    with imu_subs_lock:
        imu_subscribers.append(q)

    def generate():
        try:
            while True:
                try:
                    msg = q.get(timeout=5.0)
                    yield msg
                except queue.Empty:
                    yield ": keepalive\n\n"   # keep connection alive
        except GeneratorExit:
            pass
        finally:
            with imu_subs_lock:
                try:
                    imu_subscribers.remove(q)
                except ValueError:
                    pass

    return Response(generate(), mimetype="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@app.route("/imu/snapshot")
def imu_snapshot():
    """Single JSON snapshot of the latest IMU reading."""
    with imu_lock:
        return jsonify(dict(imu_data))


@app.route("/stream")
def stream():
    if camera is None:
        return "Camera not ready", 503
    return Response(mjpeg_generator(), mimetype="multipart/x-mixed-replace; boundary=frame")


@app.route("/snapshot")
def snapshot():
    if camera is None:
        return "Camera not ready", 503
    jpeg = camera.get_jpeg()
    if jpeg is None:
        return "Camera not ready", 503
    return Response(jpeg, mimetype="image/jpeg")


@app.route("/status")
def status():
    with imu_lock:
        imu_age = round(time.time() - imu_data["ts"], 2) if imu_data["ts"] else None
        enc1_delta = imu_data.get("enc1_delta", imu_data.get("enc1", 0))
        enc2_delta = imu_data.get("enc2_delta", imu_data.get("enc2", 0))
        enc1_total = imu_data.get("enc1_total", 0)
        enc2_total = imu_data.get("enc2_total", 0)
        enc1_tps = imu_data.get("enc1_tps", 0.0)
        enc2_tps = imu_data.get("enc2_tps", 0.0)
        enc_delta_err = imu_data.get("enc_delta_err", 0)
        enc_delta_err_pct = imu_data.get("enc_delta_err_pct", 0.0)
        enc_total_err = imu_data.get("enc_total_err", 0)
        dt_ms = imu_data.get("dt_ms", 0)
    with ser_lock:
        connected = ser is not None
    with pid_lock:
        pid = dict(pid_data)
    return jsonify({
        "running": camera.running if camera else False,
        "fps_capture": camera.fps_capture if camera else 0.0,
        "fps_encode": camera.fps_encode if camera else 0.0,
        "fps_target": FPS,
        "resolution": f"{WIDTH}x{HEIGHT}",
        "quality": JPEG_QUALITY,
        "encoder": "opencv",
        "camera": CAMERA_INDEX,
        "port": PORT,
        "host": HOST,
        "serial_port": SERIAL_PORT,
        "serial_baud": SERIAL_BAUD,
        "serial_connected": connected,
        "imu_last_age_sec": imu_age,
        "imu_sse_subscribers": len(imu_subscribers),
        "enc1_delta_ticks": enc1_delta,
        "enc2_delta_ticks": enc2_delta,
        "enc1_total_ticks": enc1_total,
        "enc2_total_ticks": enc2_total,
        "enc1_ticks_per_sec": enc1_tps,
        "enc2_ticks_per_sec": enc2_tps,
        "enc_packet_dt_ms": dt_ms,
        "enc_delta_error_ticks": enc_delta_err,
        "enc_delta_error_pct": enc_delta_err_pct,
        "enc_total_error_ticks": enc_total_err,
        "pid": pid
    })


def _shutdown(sig=None, frame=None):
    log.info("Shutting down...")
    try:
        if camera:
            camera.stop()
    finally:
        sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    open_serial()

    # Start background serial reader thread (handles IMU parsing)
    t_reader = threading.Thread(target=serial_reader, daemon=True, name="serial_reader")
    t_reader.start()

    try:
        camera = Camera()
    except Exception as e:
        log.error(f"Startup camera error: {e}")
        camera = None

    ip = get_local_ip()
    print("\n  Open:")
    print(f"    http://{ip}:{PORT}/")
    print(f"    http://{ip}:{PORT}/stream")
    print(f"    http://{ip}:{PORT}/snapshot")
    print(f"    http://{ip}:{PORT}/imu         (SSE stream)")
    print(f"    http://{ip}:{PORT}/imu/snapshot (JSON)")
    print(f"    http://{ip}:{PORT}/pid         (PID JSON)")
    print(f"    http://{ip}:{PORT}/status\n")

    app.run(host=HOST, port=PORT, threaded=True, debug=False, use_reloader=False)
