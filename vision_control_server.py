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
camera = None

# ── IMU state — updated by background reader thread
imu_data = {
    "ax": 0.0, "ay": 0.0, "az": 0.0,
    "gx": 0.0, "gy": 0.0, "gz": 0.0,
    "heading": 0.0,
    "enc1": 0, "enc2": 0,
    "ts": 0.0
}
imu_lock = threading.Lock()
# SSE subscribers: each is a queue.Queue
imu_subscribers = []
imu_subs_lock = threading.Lock()


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
    try:
        s = serial.Serial(SERIAL_PORT, SERIAL_BAUD, timeout=0.2)
        time.sleep(2.0)
        with ser_lock:
            ser = s
        log.info(f"Serial connected: {SERIAL_PORT} @ {SERIAL_BAUD}")
        return True
    except Exception as e:
        with ser_lock:
            ser = None
        log.warning(f"Serial unavailable: {e}")
        return False


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
            time.sleep(1.0)
            continue
        try:
            raw = s.readline()   # blocks up to timeout (0.2 s)
            if not raw:
                continue
            line = raw.decode("utf-8", errors="replace").strip()
            if line.startswith("IMU,"):
                _parse_imu(line)
            else:
                if line:
                    log.debug(f"[Arduino] {line}")
        except Exception as e:
            log.warning(f"Serial read error: {e}")
            with ser_lock:
                ser = None
            time.sleep(2.0)
            open_serial()


def _parse_imu(line):
    """Parse 'IMU,ax,ay,az,gx,gy,gz,heading,enc1,enc2' and notify SSE subscribers."""
    global imu_data
    parts = line.split(",")
    if len(parts) != 10:
        return
    try:
        data = {
            "ax": float(parts[1]),
            "ay": float(parts[2]),
            "az": float(parts[3]),
            "gx": float(parts[4]),
            "gy": float(parts[5]),
            "gz": float(parts[6]),
            "heading": float(parts[7]),
            "enc1": int(parts[8]),
            "enc2": int(parts[9]),
            "ts": time.time()
        }
    except ValueError:
        return

    with imu_lock:
        imu_data.update(data)

    # push to every SSE subscriber
    msg = (
        f"data: {data['ax']:.3f},{data['ay']:.3f},{data['az']:.3f},"
        f"{data['gx']:.3f},{data['gy']:.3f},{data['gz']:.3f},"
        f"{data['heading']:.2f},{data['enc1']},{data['enc2']}\n\n"
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

    <div class="btn-grid">
      <div></div>
      <button class="btn-fwd" onclick="sendCmd('FORWARD '+spd())">▲ Forward</button>
      <div></div>
      <button onclick="sendCmd('TURN_LEFT_90 '+spd())">↺ Left 90°</button>
      <button class="btn-stop" onclick="sendCmd('STOP')">■ Stop</button>
      <button onclick="sendCmd('TURN_RIGHT_90 '+spd())">↻ Right 90°</button>
      <div></div>
      <button class="btn-bwd" onclick="sendCmd('BACKWARD '+spd())">▼ Backward</button>
      <button class="btn-emg" onclick="sendCmd('S')">⚡ EMERGENCY</button>
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
      <div class="imu-cell"><div class="label">600 Ticks = 1 Rev</div><div class="val" style="color:#888;font-size:.85rem">X1 quadrature</div></div>
    </div>
    <div class="imu-controls" style="margin-top:10px">
      <button onclick="sendCmd('ENC_RESET')" style="background:#123;color:#6af">Reset Counters</button>
      <div style="flex:1;display:flex;align-items:center;justify-content:center;font-size:.8rem;color:#888">
        Ticks since last IMU packet
      </div>
    </div>
  </div>

</div><!-- /main -->

<script>
// ── Speed slider
function spd() {{
  return parseInt(document.getElementById('spd').value || "140", 10);
}}
function onSpeedSlider(v) {{
  document.getElementById('spdVal').textContent = v;
  // live update speed if motors are running
  sendCmd('SET_SPEED ' + v, true);
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

// ── SSE connection
let sse = null;
function startSse() {{
  if (sse) return;   // already open
  sse = new EventSource('/imu');
  sse.onmessage = function(e) {{
    const parts = e.data.split(',');
    if (parts.length !== 9) return;
    const [ax, ay, az, gx, gy, gz, heading, enc1, enc2] = parts.map(Number);
    document.getElementById('ax').textContent = ax.toFixed(3);
    document.getElementById('ay').textContent = ay.toFixed(3);
    document.getElementById('az').textContent = az.toFixed(3);
    document.getElementById('gx').textContent = gx.toFixed(2);
    document.getElementById('gy').textContent = gy.toFixed(2);
    document.getElementById('gz').textContent = gz.toFixed(2);
    document.getElementById('heading').textContent = heading.toFixed(1) + '°';
    drawCompass(heading);
    pushAccel(ax, ay, az);
    document.getElementById('enc1').textContent = enc1;
    document.getElementById('enc2').textContent = enc2;
  }};
  sse.onerror = function() {{
    sse.close(); sse = null;
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
</script>
</body></html>
"""


@app.route("/cmd", methods=["POST"])
def cmd():
    global ser
    data = request.get_json(silent=True) or {}
    c = str(data.get("cmd", "")).strip()
    if not c:
        return jsonify({"ok": False, "error": "missing cmd"}), 400

    with ser_lock:
        s = ser
    if s is None:
        if not open_serial():
            return jsonify({"ok": False, "error": "serial not connected"}), 503
        with ser_lock:
            s = ser

    try:
        s.write((c + "\n").encode("utf-8"))
        s.flush()
        return jsonify({"ok": True, "sent": c})
    except Exception as e:
        with ser_lock:
            ser = None
        log.warning(f"Serial write failed, port marked dead: {e}")
        return jsonify({"ok": False, "error": str(e)}), 500


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
        enc1_total = imu_data.get("enc1", 0)
        enc2_total = imu_data.get("enc2", 0)
    with ser_lock:
        connected = ser is not None
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
        "enc1_total_ticks": enc1_total,
        "enc2_total_ticks": enc2_total
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
    print(f"    http://{ip}:{PORT}/status\n")

    app.run(host=HOST, port=PORT, threaded=True, debug=False, use_reloader=False)
