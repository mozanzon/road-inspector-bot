#!/usr/bin/env python3
"""
Arduino IMU Reader
-------------------
Reads IMU data (accel, gyro, optionally mag) from Arduino over serial.
Parses CSV lines sent by Arduino and exposes them via:
  - Terminal live display
  - Flask JSON endpoint  → http://<PI_IP>:8081/imu
  - Flask web dashboard  → http://<PI_IP>:8081/

Expected Arduino serial format (one of these):
  CSV:   ax,ay,az,gx,gy,gz
  CSV:   ax,ay,az,gx,gy,gz,mx,my,mz
  JSON:  {"ax":0.1,"ay":0.2,"az":9.8,"gx":0.0,"gy":0.0,"gz":0.0}

Arduino sketch example at bottom of this file.

Requirements:
    pip3 install pyserial flask --break-system-packages

Usage:
    python3 imu_reader.py
    python3 imu_reader.py --port /dev/ttyUSB0 --baud 115200
"""

import serial
import serial.tools.list_ports
import threading
import time
import json
import logging
import argparse
from flask import Flask, Response, jsonify

# ─────────────────────────────────────────────
#  CONFIG
# ─────────────────────────────────────────────
SERIAL_PORT   = "/dev/ttyUSB0"   # change to /dev/ttyACM0 if needed
BAUD_RATE     = 115200
PORT          = 8081              # different port from stream_server
HOST          = "0.0.0.0"
LOG_TO_FILE   = False             # set True to log IMU data to imu_log.csv
LOG_FILE      = "imu_log.csv"
# ─────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)


# ── IMU Reader ─────────────────────────────────────────────────────────────────

class IMUReader:
    def __init__(self, port, baud):
        self.port    = port
        self.baud    = baud
        self.ser     = None
        self.running = False
        self.lock    = threading.Lock()

        self.data = {
            "ax": 0.0, "ay": 0.0, "az": 0.0,   # accelerometer (m/s² or g)
            "gx": 0.0, "gy": 0.0, "gz": 0.0,   # gyroscope (deg/s)
            "mx": None,"my": None,"mz": None,   # magnetometer (optional)
            "roll":  0.0,                        # computed from accel
            "pitch": 0.0,
            "timestamp": 0.0,
            "sample_rate": 0.0,
            "status": "disconnected",
            "raw": "",
        }

        self._log_file = None
        if LOG_TO_FILE:
            self._log_file = open(LOG_FILE, "w")
            self._log_file.write("timestamp,ax,ay,az,gx,gy,gz\n")

        self._connect()

    def _connect(self):
        log.info(f"Connecting to Arduino on {self.port} @ {self.baud} baud ...")
        try:
            self.ser = serial.Serial(self.port, self.baud, timeout=1)
            time.sleep(2)  # wait for Arduino reset after serial open
            self.ser.reset_input_buffer()
            self.running = True
            log.info("Serial connected.")
            with self.lock:
                self.data["status"] = "connected"
            threading.Thread(target=self._read_loop, daemon=True, name="imu-read").start()
        except serial.SerialException as e:
            log.error(f"Serial error: {e}")
            log.error("Available ports:")
            for p in serial.tools.list_ports.comports():
                log.error(f"  {p.device}  —  {p.description}")
            with self.lock:
                self.data["status"] = f"error: {e}"

    def _read_loop(self):
        count = 0
        t0 = time.time()

        while self.running:
            try:
                raw = self.ser.readline().decode("utf-8", errors="ignore").strip()
                if not raw:
                    continue

                parsed = self._parse(raw)
                if parsed is None:
                    continue

                # Compute roll/pitch from accelerometer
                import math
                ax, ay, az = parsed.get("ax",0), parsed.get("ay",0), parsed.get("az",0)
                try:
                    roll  = math.degrees(math.atan2(ay, az))
                    pitch = math.degrees(math.atan2(-ax, math.sqrt(ay**2 + az**2)))
                except Exception:
                    roll, pitch = 0.0, 0.0

                with self.lock:
                    self.data.update(parsed)
                    self.data["roll"]      = round(roll,  2)
                    self.data["pitch"]     = round(pitch, 2)
                    self.data["timestamp"] = round(time.time(), 4)
                    self.data["status"]    = "live"
                    self.data["raw"]       = raw

                # Sample rate
                count += 1
                elapsed = time.time() - t0
                if elapsed >= 2.0:
                    with self.lock:
                        self.data["sample_rate"] = round(count / elapsed, 1)
                    count = 0
                    t0 = time.time()

                # Log to file
                if self._log_file:
                    self._log_file.write(
                        f"{self.data['timestamp']},{ax},{ay},{az},"
                        f"{parsed.get('gx',0)},{parsed.get('gy',0)},{parsed.get('gz',0)}\n"
                    )
                    self._log_file.flush()

            except serial.SerialException as e:
                log.error(f"Serial read error: {e}")
                with self.lock:
                    self.data["status"] = "disconnected"
                time.sleep(1)
            except Exception as e:
                log.warning(f"Parse error: {e} | raw='{raw}'")

    def _parse(self, raw):
        """
        Supports:
          CSV:  ax,ay,az,gx,gy,gz[,mx,my,mz]
          JSON: {"ax":...,"ay":...,...}
          Labelled: ax:0.1 ay:0.2 ...
        """
        raw = raw.strip()

        # ── JSON ──
        if raw.startswith("{"):
            try:
                d = json.loads(raw)
                return {k: round(float(v), 4) for k, v in d.items() if k in
                        ("ax","ay","az","gx","gy","gz","mx","my","mz")}
            except Exception:
                return None

        # ── CSV ──
        parts = raw.split(",")
        if len(parts) >= 6:
            try:
                vals = [float(p) for p in parts]
                result = {
                    "ax": round(vals[0], 4),
                    "ay": round(vals[1], 4),
                    "az": round(vals[2], 4),
                    "gx": round(vals[3], 4),
                    "gy": round(vals[4], 4),
                    "gz": round(vals[5], 4),
                }
                if len(vals) >= 9:
                    result.update({
                        "mx": round(vals[6], 4),
                        "my": round(vals[7], 4),
                        "mz": round(vals[8], 4),
                    })
                return result
            except ValueError:
                pass

        # ── Labelled: "ax:0.1 ay:0.2 ..." ──
        try:
            result = {}
            for token in raw.replace(",", " ").split():
                if ":" in token:
                    k, v = token.split(":", 1)
                    k = k.strip().lower()
                    if k in ("ax","ay","az","gx","gy","gz","mx","my","mz"):
                        result[k] = round(float(v), 4)
            if len(result) >= 6:
                return result
        except Exception:
            pass

        return None

    def get(self):
        with self.lock:
            return dict(self.data)

    def stop(self):
        self.running = False
        if self.ser and self.ser.is_open:
            self.ser.close()
        if self._log_file:
            self._log_file.close()


# ── Parse CLI args ─────────────────────────────────────────────────────────────

parser = argparse.ArgumentParser(description="Arduino IMU Reader")
parser.add_argument("--port",  default=SERIAL_PORT, help="Serial port (default: /dev/ttyUSB0)")
parser.add_argument("--baud",  default=BAUD_RATE, type=int, help="Baud rate (default: 115200)")
parser.add_argument("--no-web", action="store_true", help="Disable Flask web server")
args, _ = parser.parse_known_args()

imu = IMUReader(port=args.port, baud=args.baud)


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/imu")
def imu_json():
    """Latest IMU data as JSON."""
    return jsonify(imu.get())


@app.route("/imu/stream")
def imu_stream():
    """Server-Sent Events stream — browser receives live updates automatically."""
    def generate():
        while True:
            data = imu.get()
            yield f"data: {json.dumps(data)}\n\n"
            time.sleep(0.05)   # 20Hz update rate to browser
    return Response(generate(), mimetype="text/event-stream")


@app.route("/")
def dashboard():
    """Live IMU dashboard."""
    return """<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>IMU Dashboard</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0c0f;color:#c8d8e8;font-family:'Courier New',monospace;min-height:100vh}
header{background:#10141a;border-bottom:1px solid #1e2a38;padding:14px 24px;
       display:flex;align-items:center;gap:12px}
.dot{width:10px;height:10px;border-radius:50%;background:#3a5068;transition:all .3s}
.dot.live{background:#00ff88;box-shadow:0 0 8px #00ff88;animation:blink 1.2s infinite}
.dot.error{background:#ff3d6b;box-shadow:0 0 8px #ff3d6b}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
h1{font-size:16px;letter-spacing:3px;color:#fff;text-transform:uppercase}
h1 span{color:#00e5ff}
.badge{margin-left:auto;font-size:11px;color:#3a5068}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;padding:24px}
.card{background:#10141a;border:1px solid #1e2a38;border-radius:6px;padding:18px}
.card-title{font-size:10px;letter-spacing:2px;color:#3a5068;text-transform:uppercase;
            margin-bottom:14px;display:flex;align-items:center;gap:8px}
.card-title::after{content:'';flex:1;height:1px;background:#1e2a38}
.sensor-row{display:flex;justify-content:space-between;align-items:center;
            padding:6px 0;border-bottom:1px solid #1e2a38}
.sensor-row:last-child{border-bottom:none}
.axis{font-size:11px;color:#3a5068;letter-spacing:1px;width:24px}
.axis.x{color:#ff3d6b} .axis.y{color:#00ff88} .axis.z{color:#00e5ff}
.val{font-size:18px;color:#fff;font-weight:bold;letter-spacing:1px;min-width:90px;text-align:right}
.unit{font-size:10px;color:#3a5068;margin-left:6px;width:40px}
.bar-wrap{flex:1;height:4px;background:#1e2a38;border-radius:2px;margin:0 12px;overflow:hidden}
.bar{height:100%;border-radius:2px;transition:width .1s}
.bar.x{background:#ff3d6b} .bar.y{background:#00ff88} .bar.z{background:#00e5ff}
.attitude{display:flex;gap:16px;margin-top:4px}
.att-box{flex:1;background:#0d1117;border:1px solid #1e2a38;border-radius:4px;
         padding:12px;text-align:center}
.att-label{font-size:9px;letter-spacing:2px;color:#3a5068;text-transform:uppercase;margin-bottom:6px}
.att-val{font-size:22px;color:#00e5ff;font-weight:bold}
.att-unit{font-size:10px;color:#3a5068;margin-left:3px}
.status-bar{padding:8px 24px;background:#10141a;border-top:1px solid #1e2a38;
            font-size:11px;color:#3a5068;display:flex;gap:24px;flex-wrap:wrap}
#status-text{color:#3a5068}
</style></head><body>
<header>
  <div class="dot" id="dot"></div>
  <h1>IMU<span>·</span>DASHBOARD</h1>
  <span class="badge" id="rate-badge">-- Hz</span>
</header>

<div class="grid">
  <!-- Accelerometer -->
  <div class="card">
    <div class="card-title">Accelerometer</div>
    <div class="sensor-row">
      <span class="axis x">X</span>
      <div class="bar-wrap"><div class="bar x" id="bar-ax"></div></div>
      <span class="val" id="ax">0.000</span><span class="unit">m/s²</span>
    </div>
    <div class="sensor-row">
      <span class="axis y">Y</span>
      <div class="bar-wrap"><div class="bar y" id="bar-ay"></div></div>
      <span class="val" id="ay">0.000</span><span class="unit">m/s²</span>
    </div>
    <div class="sensor-row">
      <span class="axis z">Z</span>
      <div class="bar-wrap"><div class="bar z" id="bar-az"></div></div>
      <span class="val" id="az">0.000</span><span class="unit">m/s²</span>
    </div>
  </div>

  <!-- Gyroscope -->
  <div class="card">
    <div class="card-title">Gyroscope</div>
    <div class="sensor-row">
      <span class="axis x">X</span>
      <div class="bar-wrap"><div class="bar x" id="bar-gx"></div></div>
      <span class="val" id="gx">0.000</span><span class="unit">°/s</span>
    </div>
    <div class="sensor-row">
      <span class="axis y">Y</span>
      <div class="bar-wrap"><div class="bar y" id="bar-gy"></div></div>
      <span class="val" id="gy">0.000</span><span class="unit">°/s</span>
    </div>
    <div class="sensor-row">
      <span class="axis z">Z</span>
      <div class="bar-wrap"><div class="bar z" id="bar-gz"></div></div>
      <span class="val" id="gz">0.000</span><span class="unit">°/s</span>
    </div>
  </div>

  <!-- Attitude -->
  <div class="card">
    <div class="card-title">Attitude (from accel)</div>
    <div class="attitude">
      <div class="att-box">
        <div class="att-label">Roll</div>
        <div class="att-val" id="roll">0.0<span class="att-unit">°</span></div>
      </div>
      <div class="att-box">
        <div class="att-label">Pitch</div>
        <div class="att-val" id="pitch">0.0<span class="att-unit">°</span></div>
      </div>
    </div>
  </div>
</div>

<div class="status-bar">
  <span id="status-text">Waiting for data…</span>
  <span>Sample rate: <b id="sr">--</b> Hz</span>
  <span>Raw: <span id="raw" style="color:#3a5068;font-size:10px">—</span></span>
</div>

<script>
const es = new EventSource("/imu/stream");

function bar(v, max) {
  const pct = Math.min(100, Math.abs(v) / max * 100);
  return pct.toFixed(1) + "%";
}

es.onmessage = e => {
  const d = JSON.parse(e.data);

  document.getElementById("ax").textContent = d.ax.toFixed(3);
  document.getElementById("ay").textContent = d.ay.toFixed(3);
  document.getElementById("az").textContent = d.az.toFixed(3);
  document.getElementById("gx").textContent = d.gx.toFixed(3);
  document.getElementById("gy").textContent = d.gy.toFixed(3);
  document.getElementById("gz").textContent = d.gz.toFixed(3);
  document.getElementById("roll").innerHTML  = d.roll.toFixed(1) + '<span class="att-unit">°</span>';
  document.getElementById("pitch").innerHTML = d.pitch.toFixed(1) + '<span class="att-unit">°</span>';
  document.getElementById("sr").textContent  = d.sample_rate;
  document.getElementById("raw").textContent = d.raw;
  document.getElementById("rate-badge").textContent = d.sample_rate + " Hz";

  // Bars: accel max ~20 m/s², gyro max ~500 °/s
  document.getElementById("bar-ax").style.width = bar(d.ax, 20);
  document.getElementById("bar-ay").style.width = bar(d.ay, 20);
  document.getElementById("bar-az").style.width = bar(d.az, 20);
  document.getElementById("bar-gx").style.width = bar(d.gx, 500);
  document.getElementById("bar-gy").style.width = bar(d.gy, 500);
  document.getElementById("bar-gz").style.width = bar(d.gz, 500);

  const dot = document.getElementById("dot");
  if (d.status === "live") {
    dot.className = "dot live";
    document.getElementById("status-text").textContent = "Live — Arduino connected";
  } else if (d.status.startsWith("error")) {
    dot.className = "dot error";
    document.getElementById("status-text").textContent = d.status;
  }
};

es.onerror = () => {
  document.getElementById("dot").className = "dot error";
  document.getElementById("status-text").textContent = "SSE connection lost — retrying…";
};
</script>
</body></html>"""


# ── Terminal live display (optional, runs in background) ──────────────────────

def terminal_display():
    """Prints live IMU values to terminal every 0.5s."""
    while True:
        d = imu.get()
        print(
            f"\r  IMU | "
            f"A: {d['ax']:+7.3f} {d['ay']:+7.3f} {d['az']:+7.3f}  "
            f"G: {d['gx']:+7.2f} {d['gy']:+7.2f} {d['gz']:+7.2f}  "
            f"R:{d['roll']:+6.1f}° P:{d['pitch']:+6.1f}°  "
            f"{d['sample_rate']:5.1f}Hz  [{d['status']}]",
            end="", flush=True
        )
        time.sleep(0.5)


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import socket as _socket

    try:
        ip = _socket.gethostbyname(_socket.gethostname())
    except Exception:
        ip = "YOUR_PI_IP"

    print()
    print("  ╔══════════════════════════════════════════╗")
    print("  ║        Arduino IMU Reader                ║")
    print("  ╠══════════════════════════════════════════╣")
    print(f"  ║  Dashboard : http://{ip}:{PORT}/")
    print(f"  ║  JSON      : http://{ip}:{PORT}/imu")
    print(f"  ║  SSE stream: http://{ip}:{PORT}/imu/stream")
    print("  ╠══════════════════════════════════════════╣")
    print(f"  ║  Port : {args.port}  Baud: {args.baud}")
    print("  ╠══════════════════════════════════════════╣")
    print("  ║  Arduino CSV format expected:            ║")
    print("  ║    ax,ay,az,gx,gy,gz                     ║")
    print("  ║    ax,ay,az,gx,gy,gz,mx,my,mz            ║")
    print("  ╚══════════════════════════════════════════╝")
    print()
    print("""  Arduino sketch (MPU-6050 example):

    #include <Wire.h>
    #include <MPU6050.h>
    MPU6050 mpu;
    void setup() {
      Serial.begin(115200);
      Wire.begin();
      mpu.initialize();
    }
    void loop() {
      int16_t ax,ay,az,gx,gy,gz;
      mpu.getMotion6(&ax,&ay,&az,&gx,&gy,&gz);
      // Scale: accel /16384.0 = g, gyro /131.0 = deg/s
      Serial.print(ax/16384.0,4); Serial.print(",");
      Serial.print(ay/16384.0,4); Serial.print(",");
      Serial.print(az/16384.0,4); Serial.print(",");
      Serial.print(gx/131.0,4);   Serial.print(",");
      Serial.print(gy/131.0,4);   Serial.print(",");
      Serial.println(gz/131.0,4);
      delay(10); // 100Hz
    }
""")

    # Start terminal display in background
    threading.Thread(target=terminal_display, daemon=True, name="terminal").start()

    if not args.no_web:
        app.run(host=HOST, port=PORT, threaded=True, debug=False)
    else:
        # Just run terminal mode
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            imu.stop()
            print("\n  Stopped.")

# ─────────────────────────────────────────────────────────────────────────────
#
#  ARDUINO SKETCH — MPU-6050 / GY-521 (I2C)
#  Copy this to Arduino IDE
#
# ─────────────────────────────────────────────────────────────────────────────
#
#  #include <Wire.h>
#  #include <MPU6050.h>      // install via Library Manager
#
#  MPU6050 mpu;
#
#  void setup() {
#    Serial.begin(115200);
#    Wire.begin();
#    mpu.initialize();
#    if (!mpu.testConnection()) {
#      Serial.println("MPU6050 not found!");
#      while(1);
#    }
#  }
#
#  void loop() {
#    int16_t ax, ay, az, gx, gy, gz;
#    mpu.getMotion6(&ax, &ay, &az, &gx, &gy, &gz);
#
#    // Scale to real units
#    float fax = ax / 16384.0;   // ±2g range → m/s² multiply by 9.81 if needed
#    float fay = ay / 16384.0;
#    float faz = az / 16384.0;
#    float fgx = gx / 131.0;     // ±250°/s range
#    float fgy = gy / 131.0;
#    float fgz = gz / 131.0;
#
#    Serial.print(fax, 4); Serial.print(",");
#    Serial.print(fay, 4); Serial.print(",");
#    Serial.print(faz, 4); Serial.print(",");
#    Serial.print(fgx, 4); Serial.print(",");
#    Serial.print(fgy, 4); Serial.print(",");
#    Serial.println(fgz, 4);
#
#    delay(10);  // 100 Hz
#  }
#
# ─────────────────────────────────────────────────────────────────────────────
