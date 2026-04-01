#!/usr/bin/env python3
"""
Arduino IMU Reader — FaBo 9Axis MPU-9250
-----------------------------------------
Parses the exact serial output from FaBo9Axis_MPU9250 read9axis.ino:

    ax: 0.12 ay: -0.03 az: 9.81
    gx: 0.01 gy: -0.02 gz: 0.00
    mx: 23.4 my: -5.1  mz: 41.2
    temp: 28.5

Exposes data via:
    http://<PI_IP>:8081/           live dashboard
    http://<PI_IP>:8081/imu        JSON snapshot
    http://<PI_IP>:8081/imu/stream Server-Sent Events (20Hz)

Requirements:
    pip3 install pyserial flask --break-system-packages

Usage:
    python3 imu_reader.py
    python3 imu_reader.py --port /dev/ttyACM0 --baud 115200
    python3 imu_reader.py --no-web        # terminal only
"""

import re
import math
import json
import time
import serial
import serial.tools.list_ports
import threading
import logging
import argparse
from flask import Flask, Response, jsonify

# ─────────────────────────────────────────────
#  CONFIG
# ─────────────────────────────────────────────
SERIAL_PORT = "/dev/ttyUSB0"   # try /dev/ttyACM0 if this fails
BAUD_RATE   = 115200
WEB_PORT    = 8081
HOST        = "0.0.0.0"
LOG_TO_FILE = False
LOG_FILE    = "imu_log.csv"
# ─────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)


# ── Parser ─────────────────────────────────────────────────────────────────────

# Matches any "key: value" pair on a line, e.g. "ax: -0.03"
_LABEL_RE = re.compile(r'([a-zA-Z]+)\s*:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)')

def parse_labelled_line(line):
    """
    Parses lines like:
        ax: 0.12 ay: -0.03 az: 9.81
        gx: 0.01 gy: -0.02 gz: 0.00
        mx: 23.4 my: -5.1  mz: 41.2
        temp: 28.5
    Returns dict of found key->float pairs.
    """
    result = {}
    for key, val in _LABEL_RE.findall(line):
        key = key.lower().strip()
        try:
            result[key] = round(float(val), 5)
        except ValueError:
            pass
    return result


# ── IMU Reader ─────────────────────────────────────────────────────────────────

class IMUReader:
    def __init__(self, port, baud):
        self.port    = port
        self.baud    = baud
        self.ser     = None
        self.running = False
        self._lock   = threading.Lock()

        # Full data store — matches MPU-9250 output exactly
        self._data = {
            # Accelerometer (g)
            "ax": 0.0, "ay": 0.0, "az": 0.0,
            # Gyroscope (deg/s)
            "gx": 0.0, "gy": 0.0, "gz": 0.0,
            # Magnetometer (uT)
            "mx": 0.0, "my": 0.0, "mz": 0.0,
            # Temperature (C)
            "temp": 0.0,
            # Computed attitude
            "roll":  0.0,
            "pitch": 0.0,
            # Meta
            "sample_rate": 0.0,
            "timestamp":   0.0,
            "status":      "disconnected",
        }

        self._csv_log = None
        if LOG_TO_FILE:
            self._csv_log = open(LOG_FILE, "w")
            self._csv_log.write(
                "timestamp,ax,ay,az,gx,gy,gz,mx,my,mz,temp,roll,pitch\n"
            )

        self._connect()

    # ── Serial connection ──────────────────────────────────────────────────────

    def _connect(self):
        log.info(f"Connecting to {self.port} @ {self.baud} baud ...")
        try:
            self.ser = serial.Serial(self.port, self.baud, timeout=2)
            time.sleep(2)   # Arduino resets on serial open — wait for it
            self.ser.reset_input_buffer()
            self.running = True
            log.info("Serial connected — waiting for data ...")
            with self._lock:
                self._data["status"] = "connected"
            threading.Thread(
                target=self._read_loop, daemon=True, name="imu-serial"
            ).start()
        except serial.SerialException as e:
            log.error(f"Cannot open {self.port}: {e}")
            log.error("Available ports:")
            for p in serial.tools.list_ports.comports():
                log.error(f"  {p.device}  --  {p.description}")
            with self._lock:
                self._data["status"] = f"error: {e}"

    # ── Read loop ──────────────────────────────────────────────────────────────

    def _read_loop(self):
        """
        FaBo sketch sends one full reading as 4 lines every 1000ms:
            ax: ...  ay: ...  az: ...
            gx: ...  gy: ...  gz: ...
            mx: ...  my: ...  mz: ...
            temp: ...

        We accumulate key-value pairs into a buffer and flush to _data
        when we have a complete set (all 10 values present).
        """
        buffer   = {}
        required = {"ax","ay","az","gx","gy","gz","mx","my","mz","temp"}

        count = 0
        t0    = time.time()

        while self.running:
            try:
                raw = self.ser.readline().decode("utf-8", errors="ignore").strip()

                # Skip blank lines and startup messages ("RESET", "configured...")
                if not raw or not any(c.isdigit() for c in raw):
                    continue

                parsed = parse_labelled_line(raw)
                buffer.update(parsed)

                # Once we have all 10 fields, publish and reset buffer
                if required.issubset(buffer.keys()):
                    ax, ay, az = buffer["ax"], buffer["ay"], buffer["az"]

                    # Roll / pitch from accelerometer (static tilt estimate)
                    try:
                        roll  = math.degrees(math.atan2(ay, az))
                        pitch = math.degrees(math.atan2(-ax, math.sqrt(ay**2 + az**2)))
                    except Exception:
                        roll, pitch = 0.0, 0.0

                    ts = round(time.time(), 4)

                    with self._lock:
                        self._data.update(buffer)
                        self._data["roll"]      = round(roll,  2)
                        self._data["pitch"]     = round(pitch, 2)
                        self._data["timestamp"] = ts
                        self._data["status"]    = "live"

                    if self._csv_log:
                        self._csv_log.write(
                            f"{ts},{ax},{ay},{az},"
                            f"{buffer['gx']},{buffer['gy']},{buffer['gz']},"
                            f"{buffer['mx']},{buffer['my']},{buffer['mz']},"
                            f"{buffer['temp']},{round(roll,2)},{round(pitch,2)}\n"
                        )
                        self._csv_log.flush()

                    buffer = {}   # reset for next reading
                    count += 1

                    elapsed = time.time() - t0
                    if elapsed >= 5.0:
                        with self._lock:
                            self._data["sample_rate"] = round(count / elapsed, 2)
                        count = 0
                        t0 = time.time()

            except serial.SerialException as e:
                log.error(f"Serial read error: {e}")
                with self._lock:
                    self._data["status"] = "disconnected"
                time.sleep(2)
            except Exception as e:
                log.warning(f"Unexpected error: {e}")

    # ── Public API ─────────────────────────────────────────────────────────────

    def get(self):
        with self._lock:
            return dict(self._data)

    def stop(self):
        self.running = False
        if self.ser and self.ser.is_open:
            self.ser.close()
        if self._csv_log:
            self._csv_log.close()


# ── Flask routes ───────────────────────────────────────────────────────────────

@app.route("/imu")
def imu_json():
    """Snapshot of latest IMU data as JSON."""
    return jsonify(imu.get())


@app.route("/imu/stream")
def imu_sse():
    """
    Server-Sent Events stream.
    Browser: const es = new EventSource('http://PI:8081/imu/stream')
    """
    def generate():
        while True:
            yield f"data: {json.dumps(imu.get())}\n\n"
            time.sleep(0.05)   # 20Hz push rate
    return Response(generate(), mimetype="text/event-stream")


@app.route("/")
def dashboard():
    return """<!DOCTYPE html>
<html lang="en"><head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>MPU-9250 Dashboard</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0c0f;color:#c8d8e8;font-family:'Courier New',monospace;min-height:100vh;display:flex;flex-direction:column}
header{background:#10141a;border-bottom:1px solid #1e2a38;padding:14px 24px;display:flex;align-items:center;gap:12px}
.dot{width:10px;height:10px;border-radius:50%;background:#3a5068;flex-shrink:0;transition:all .3s}
.dot.live{background:#00ff88;box-shadow:0 0 8px #00ff88;animation:blink 1.4s infinite}
.dot.error{background:#ff3d6b;box-shadow:0 0 8px #ff3d6b}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
h1{font-size:15px;letter-spacing:3px;color:#fff;text-transform:uppercase}
h1 span{color:#00e5ff}
.hbadge{margin-left:auto;display:flex;gap:16px;font-size:11px;color:#3a5068}
.hbadge b{color:#c8d8e8}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;padding:20px;flex:1}
.card{background:#10141a;border:1px solid #1e2a38;border-radius:6px;padding:18px}
.ctitle{font-size:10px;letter-spacing:2px;color:#3a5068;text-transform:uppercase;
        margin-bottom:14px;display:flex;align-items:center;gap:8px}
.ctitle::after{content:'';flex:1;height:1px;background:#1e2a38}
.srow{display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid #0f1519}
.srow:last-child{border-bottom:none}
.axis{font-size:10px;letter-spacing:1px;width:20px;text-align:center;font-weight:bold}
.ax{color:#ff3d6b} .ay{color:#00ff88} .az{color:#00e5ff} .am{color:#bf7fff}
.bar-wrap{flex:1;height:5px;background:#1e2a38;border-radius:3px;overflow:hidden}
.bar{height:100%;border-radius:3px;transition:width .15s ease;min-width:2px}
.bx{background:#ff3d6b} .by{background:#00ff88} .bz{background:#00e5ff} .bm{background:#bf7fff}
.val{font-size:15px;color:#fff;font-weight:bold;min-width:80px;text-align:right;letter-spacing:.5px}
.unit{font-size:9px;color:#3a5068;width:36px;text-align:right}
.att-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.att-box{background:#0d1117;border:1px solid #1e2a38;border-radius:4px;padding:14px;text-align:center}
.att-label{font-size:9px;letter-spacing:2px;color:#3a5068;text-transform:uppercase;margin-bottom:8px}
.att-val{font-size:28px;font-weight:bold;color:#00e5ff;line-height:1}
.att-unit{font-size:11px;color:#3a5068;margin-left:2px}
.temp-big{text-align:center;padding:16px 0}
.temp-num{font-size:52px;font-weight:bold;color:#ffaa00;line-height:1}
.temp-deg{font-size:20px;color:#3a5068;margin-left:4px}
footer{padding:10px 24px;border-top:1px solid #1e2a38;background:#10141a;
       font-size:11px;color:#3a5068;display:flex;gap:20px;flex-wrap:wrap;align-items:center}
footer a{color:#00e5ff;text-decoration:none}
</style></head><body>

<header>
  <div class="dot" id="dot"></div>
  <h1>MPU<span>-</span>9250</h1>
  <div class="hbadge">
    <span>Rate: <b id="sr">--</b> Hz</span>
    <span>Temp: <b id="htemp">--</b> C</span>
    <span id="status-txt" style="color:#3a5068">connecting...</span>
  </div>
</header>

<div class="grid">

  <div class="card">
    <div class="ctitle">Accelerometer</div>
    <div class="srow"><span class="axis ax">X</span><div class="bar-wrap"><div class="bar bx" id="bar-ax"></div></div><span class="val" id="ax">0.0000</span><span class="unit">g</span></div>
    <div class="srow"><span class="axis ay">Y</span><div class="bar-wrap"><div class="bar by" id="bar-ay"></div></div><span class="val" id="ay">0.0000</span><span class="unit">g</span></div>
    <div class="srow"><span class="axis az">Z</span><div class="bar-wrap"><div class="bar bz" id="bar-az"></div></div><span class="val" id="az">0.0000</span><span class="unit">g</span></div>
  </div>

  <div class="card">
    <div class="ctitle">Gyroscope</div>
    <div class="srow"><span class="axis ax">X</span><div class="bar-wrap"><div class="bar bx" id="bar-gx"></div></div><span class="val" id="gx">0.0000</span><span class="unit">deg/s</span></div>
    <div class="srow"><span class="axis ay">Y</span><div class="bar-wrap"><div class="bar by" id="bar-gy"></div></div><span class="val" id="gy">0.0000</span><span class="unit">deg/s</span></div>
    <div class="srow"><span class="axis az">Z</span><div class="bar-wrap"><div class="bar bz" id="bar-gz"></div></div><span class="val" id="gz">0.0000</span><span class="unit">deg/s</span></div>
  </div>

  <div class="card">
    <div class="ctitle">Magnetometer</div>
    <div class="srow"><span class="axis am">X</span><div class="bar-wrap"><div class="bar bm" id="bar-mx"></div></div><span class="val" id="mx">0.00</span><span class="unit">uT</span></div>
    <div class="srow"><span class="axis am">Y</span><div class="bar-wrap"><div class="bar bm" id="bar-my"></div></div><span class="val" id="my">0.00</span><span class="unit">uT</span></div>
    <div class="srow"><span class="axis am">Z</span><div class="bar-wrap"><div class="bar bm" id="bar-mz"></div></div><span class="val" id="mz">0.00</span><span class="unit">uT</span></div>
  </div>

  <div class="card">
    <div class="ctitle">Attitude (accel-derived)</div>
    <div class="att-grid">
      <div class="att-box">
        <div class="att-label">Roll</div>
        <div class="att-val" id="roll">0.0<span class="att-unit">deg</span></div>
      </div>
      <div class="att-box">
        <div class="att-label">Pitch</div>
        <div class="att-val" id="pitch">0.0<span class="att-unit">deg</span></div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="ctitle">Temperature</div>
    <div class="temp-big">
      <span class="temp-num" id="temp">--</span><span class="temp-deg">C</span>
    </div>
  </div>

</div>

<footer>
  <span><a href="/imu" target="_blank">/imu</a> JSON</span>
  <span><a href="/imu/stream" target="_blank">/imu/stream</a> SSE</span>
</footer>

<script>
function bar(v, max) {
  return Math.min(100, Math.abs(v) / max * 100).toFixed(1) + "%";
}
const es = new EventSource("/imu/stream");
es.onmessage = e => {
  const d = JSON.parse(e.data);
  document.getElementById("ax").textContent = d.ax.toFixed(4);
  document.getElementById("ay").textContent = d.ay.toFixed(4);
  document.getElementById("az").textContent = d.az.toFixed(4);
  document.getElementById("bar-ax").style.width = bar(d.ax, 2);
  document.getElementById("bar-ay").style.width = bar(d.ay, 2);
  document.getElementById("bar-az").style.width = bar(d.az, 2);
  document.getElementById("gx").textContent = d.gx.toFixed(4);
  document.getElementById("gy").textContent = d.gy.toFixed(4);
  document.getElementById("gz").textContent = d.gz.toFixed(4);
  document.getElementById("bar-gx").style.width = bar(d.gx, 250);
  document.getElementById("bar-gy").style.width = bar(d.gy, 250);
  document.getElementById("bar-gz").style.width = bar(d.gz, 250);
  document.getElementById("mx").textContent = d.mx.toFixed(2);
  document.getElementById("my").textContent = d.my.toFixed(2);
  document.getElementById("mz").textContent = d.mz.toFixed(2);
  document.getElementById("bar-mx").style.width = bar(d.mx, 100);
  document.getElementById("bar-my").style.width = bar(d.my, 100);
  document.getElementById("bar-mz").style.width = bar(d.mz, 100);
  document.getElementById("roll").innerHTML  = d.roll.toFixed(1)  + '<span class="att-unit">deg</span>';
  document.getElementById("pitch").innerHTML = d.pitch.toFixed(1) + '<span class="att-unit">deg</span>';
  document.getElementById("temp").textContent  = d.temp.toFixed(1);
  document.getElementById("htemp").textContent = d.temp.toFixed(1);
  document.getElementById("sr").textContent    = d.sample_rate;
  const dot  = document.getElementById("dot");
  const stxt = document.getElementById("status-txt");
  if (d.status === "live") {
    dot.className = "dot live";
    stxt.textContent = "live"; stxt.style.color = "#00ff88";
  } else if (d.status.startsWith("error")) {
    dot.className = "dot error";
    stxt.textContent = d.status; stxt.style.color = "#ff3d6b";
  } else {
    dot.className = "dot";
    stxt.textContent = d.status;
  }
};
es.onerror = () => {
  document.getElementById("dot").className = "dot error";
  document.getElementById("status-txt").textContent = "SSE lost - retrying";
};
</script>
</body></html>"""


# ── Terminal display ───────────────────────────────────────────────────────────

def terminal_loop():
    while True:
        d = imu.get()
        print(
            f"\r  A: {d['ax']:+7.4f} {d['ay']:+7.4f} {d['az']:+7.4f}  "
            f"G: {d['gx']:+8.3f} {d['gy']:+8.3f} {d['gz']:+8.3f}  "
            f"M: {d['mx']:+7.2f} {d['my']:+7.2f} {d['mz']:+7.2f}  "
            f"T:{d['temp']:5.1f}C  "
            f"R:{d['roll']:+6.1f}deg P:{d['pitch']:+6.1f}deg  "
            f"[{d['status']}]   ",
            end="", flush=True
        )
        time.sleep(0.5)


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import socket as _socket

    parser = argparse.ArgumentParser(description="FaBo MPU-9250 IMU Reader")
    parser.add_argument("--port",   default=SERIAL_PORT)
    parser.add_argument("--baud",   default=BAUD_RATE, type=int)
    parser.add_argument("--no-web", action="store_true", help="Terminal only")
    args = parser.parse_args()

    imu = IMUReader(port=args.port, baud=args.baud)

    try:
        ip = _socket.gethostbyname(_socket.gethostname())
    except Exception:
        ip = "YOUR_PI_IP"

    print()
    print("  =============================================")
    print("       FaBo MPU-9250 IMU Reader               ")
    print("  =============================================")
    print(f"   Dashboard : http://{ip}:{WEB_PORT}/")
    print(f"   JSON      : http://{ip}:{WEB_PORT}/imu")
    print(f"   SSE stream: http://{ip}:{WEB_PORT}/imu/stream")
    print(f"   Serial    : {args.port} @ {args.baud}")
    print("   Sensor    : MPU-9250 (accel + gyro + mag + temp)")
    print("  =============================================")
    print()

    threading.Thread(target=terminal_loop, daemon=True).start()

    if not args.no_web:
        app.run(host=HOST, port=WEB_PORT, threaded=True, debug=False)
    else:
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            imu.stop()
            print("\n  Stopped.")
