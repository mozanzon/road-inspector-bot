#!/usr/bin/env python3
"""
Raspberry Pi Webcam Stream Server
----------------------------------
Uses Flask + OpenCV to stream your webcam as MJPEG over HTTP.
Separate capture / encode / serve threads — no blocking between them.
Uses simplejpeg if available (2-3x faster encode), falls back to OpenCV.

Usage:
    python3 stream_server.py

Then open in browser:
    http://<PI_IP>:8080/
    http://<PI_IP>:8080/stream     <- raw MJPEG  (paste this in your app)
    http://<PI_IP>:8080/snapshot   <- single JPEG frame
    http://<PI_IP>:8080/status     <- JSON stats

Requirements:
    pip3 install flask opencv-python --break-system-packages
    pip3 install simplejpeg --break-system-packages   # optional but faster
"""

import cv2
import socket
import threading
import time
import logging

from flask import Flask, Response

# ── Try fast JPEG encoder ──────────────────────────────────────────────────────
try:
    import simplejpeg
    USE_SIMPLEJPEG = True
except ImportError:
    USE_SIMPLEJPEG = False

# ─────────────────────────────────────────────
#  CONFIG  — edit these as needed
# ─────────────────────────────────────────────
CAMERA_INDEX  = 0          # 0 = /dev/video0, 1 = /dev/video1 …
WIDTH         = 320        # lower res = much less CPU for YUYV cameras
HEIGHT        = 240        # bump to 640x480 if your Pi can handle it
FPS           = 20
JPEG_QUALITY  = 65         # 60-70 sweet spot: decent image, low CPU
PORT          = 8080
HOST          = "0.0.0.0"  # listen on all interfaces
# ─────────────────────────────────────────────

logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)


# ── Camera — separate capture + encode threads ─────────────────────────────────

class Camera:
    def __init__(self):
        self._raw_frame   = None   # latest BGR frame from capture thread
        self._jpeg_frame  = None   # latest encoded JPEG from encode thread
        self._raw_lock    = threading.Lock()
        self._jpeg_lock   = threading.Lock()
        self.running      = False
        self.fps_capture  = 0.0
        self.fps_encode   = 0.0

        self._open_camera()
        self.running = True

        threading.Thread(target=self._capture_loop, daemon=True, name="capture").start()
        threading.Thread(target=self._encode_loop,  daemon=True, name="encode").start()

    def _open_camera(self):
        log.info(f"Opening /dev/video{CAMERA_INDEX} ...")
        self.cap = cv2.VideoCapture(CAMERA_INDEX)
        if not self.cap.isOpened():
            raise RuntimeError(f"Cannot open /dev/video{CAMERA_INDEX}")

        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH,  WIDTH)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, HEIGHT)
        self.cap.set(cv2.CAP_PROP_FPS,          FPS)
        # Force YUYV — stops wasting time trying MJPEG and failing
        self.cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc(*"YUYV"))
        # Buffer size 1 — always serve the LATEST frame, never a stale one
        self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        w   = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        h   = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = self.cap.get(cv2.CAP_PROP_FPS)
        enc = "simplejpeg ⚡" if USE_SIMPLEJPEG else "opencv"
        log.info(f"Camera: {w}x{h} @ {fps:.0f}fps | encoder: {enc}")

    def _capture_loop(self):
        """Dedicated capture thread — grabs frames as fast as possible."""
        count = 0
        t0 = time.time()
        while self.running:
            ok, frame = self.cap.read()
            if not ok:
                log.warning("Frame grab failed — retrying...")
                time.sleep(0.05)
                continue
            with self._raw_lock:
                self._raw_frame = frame
            count += 1
            elapsed = time.time() - t0
            if elapsed >= 2.0:
                self.fps_capture = round(count / elapsed, 1)
                count = 0
                t0 = time.time()

    def _encode_loop(self):
        """Dedicated encode thread — converts raw BGR → JPEG at target FPS."""
        count    = 0
        t0       = time.time()
        interval = 1.0 / FPS

        while self.running:
            t_start = time.time()

            with self._raw_lock:
                frame = self._raw_frame

            if frame is None:
                time.sleep(0.01)
                continue

            jpeg = self._encode(frame)
            if jpeg:
                with self._jpeg_lock:
                    self._jpeg_frame = jpeg
                count += 1

            # Sleep just enough to hit target FPS
            sleep_time = interval - (time.time() - t_start)
            if sleep_time > 0:
                time.sleep(sleep_time)

            elapsed = time.time() - t0
            if elapsed >= 2.0:
                self.fps_encode = round(count / elapsed, 1)
                count = 0
                t0 = time.time()

    def _encode(self, frame):
        if USE_SIMPLEJPEG:
            try:
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                return simplejpeg.encode_jpeg(rgb, quality=JPEG_QUALITY, colorspace="RGB")
            except Exception:
                pass
        ok, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, JPEG_QUALITY])
        return buf.tobytes() if ok else None

    def get_jpeg(self):
        with self._jpeg_lock:
            return self._jpeg_frame

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()


camera = Camera()


# ── MJPEG generator ────────────────────────────────────────────────────────────

def mjpeg_generator():
    """Yields a continuous MJPEG stream."""
    interval = 1.0 / FPS
    while True:
        jpeg = camera.get_jpeg()
        if jpeg:
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n"
                + jpeg +
                b"\r\n"
            )
        time.sleep(interval)


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    """Web viewer UI."""
    try:
        ip = socket.gethostbyname(socket.gethostname())
    except Exception:
        ip = "localhost"
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Pi Stream</title>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{background:#0a0c0f;color:#c8d8e8;font-family:'Courier New',monospace;
     display:flex;flex-direction:column;min-height:100vh}}
header{{background:#10141a;border-bottom:1px solid #1e2a38;padding:14px 24px;
        display:flex;align-items:center;gap:12px}}
.dot{{width:10px;height:10px;border-radius:50%;background:#00ff88;
      box-shadow:0 0 8px #00ff88;animation:blink 1.2s infinite}}
@keyframes blink{{0%,100%{{opacity:1}}50%{{opacity:.3}}}}
h1{{font-size:16px;letter-spacing:3px;color:#fff;text-transform:uppercase}}
h1 span{{color:#00e5ff}}
.badge{{margin-left:auto;font-size:11px;color:#3a5068;letter-spacing:1px}}
main{{flex:1;display:flex;align-items:center;justify-content:center;padding:24px}}
.frame{{position:relative;border:1px solid #1e2a38;border-radius:4px;overflow:hidden;
        background:#060809;max-width:100%}}
.frame img{{display:block;max-width:100%;height:auto}}
.live{{position:absolute;top:12px;right:12px;background:rgba(0,0,0,.7);
       border:1px solid #00ff88;border-radius:3px;padding:3px 10px;
       font-size:11px;color:#00ff88;letter-spacing:2px;
       display:flex;align-items:center;gap:6px}}
.live-dot{{width:6px;height:6px;border-radius:50%;background:#00ff88;
           box-shadow:0 0 6px #00ff88;animation:blink 1s infinite}}
footer{{padding:14px 24px;border-top:1px solid #1e2a38;background:#10141a;
        font-size:11px;color:#3a5068;display:flex;gap:24px;flex-wrap:wrap}}
footer a{{color:#00e5ff;text-decoration:none}}
footer a:hover{{text-decoration:underline}}
</style></head><body>
<header>
  <div class="dot"></div>
  <h1>PI<span>·</span>STREAM</h1>
  <span class="badge">{ip}:{PORT}</span>
</header>
<main>
  <div class="frame">
    <img src="/stream" alt="Live stream"/>
    <div class="live"><div class="live-dot"></div>LIVE</div>
  </div>
</main>
<footer>
  <span>📡 <a href="/stream" target="_blank">/stream</a> — raw MJPEG</span>
  <span>📷 <a href="/snapshot" target="_blank">/snapshot</a> — single frame</span>
  <span>📊 <a href="/status" target="_blank">/status</a> — JSON stats</span>
  <span>FPS target: {FPS} | Quality: {JPEG_QUALITY}% | {WIDTH}x{HEIGHT}</span>
</footer>
</body></html>"""


@app.route("/stream")
def stream():
    """Raw MJPEG stream — embed with <img src='http://PI:8080/stream'>"""
    return Response(
        mjpeg_generator(),
        mimetype="multipart/x-mixed-replace; boundary=frame"
    )


@app.route("/snapshot")
def snapshot():
    """Single JPEG frame."""
    jpeg = camera.get_jpeg()
    if jpeg is None:
        return "Camera not ready", 503
    return Response(jpeg, mimetype="image/jpeg")


@app.route("/status")
def status():
    """JSON health/stats endpoint."""
    return {
        "running":     camera.running,
        "fps_capture": camera.fps_capture,
        "fps_encode":  camera.fps_encode,
        "fps_target":  FPS,
        "resolution":  f"{WIDTH}x{HEIGHT}",
        "quality":     JPEG_QUALITY,
        "encoder":     "simplejpeg" if USE_SIMPLEJPEG else "opencv",
        "camera":      CAMERA_INDEX,
        "port":        PORT,
    }


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    try:
        ip = socket.gethostbyname(socket.gethostname())
    except Exception:
        ip = "YOUR_PI_IP"

    enc = "simplejpeg ⚡" if USE_SIMPLEJPEG else "opencv (pip install simplejpeg for faster encode)"

    print()
    print("  ╔══════════════════════════════════════════╗")
    print("  ║        Pi Stream Server                  ║")
    print("  ╠══════════════════════════════════════════╣")
    print(f"  ║  Web viewer  : http://{ip}:{PORT}/")
    print(f"  ║  MJPEG stream: http://{ip}:{PORT}/stream")
    print(f"  ║  Snapshot    : http://{ip}:{PORT}/snapshot")
    print(f"  ║  Status JSON : http://{ip}:{PORT}/status")
    print("  ╠══════════════════════════════════════════╣")
    print(f"  ║  Resolution  : {WIDTH}x{HEIGHT} @ {FPS}fps")
    print(f"  ║  JPEG quality: {JPEG_QUALITY}%")
    print(f"  ║  Encoder     : {enc}")
    print("  ╚══════════════════════════════════════════╝")
    print()
    print("  Press Ctrl+C to stop.")
    print()

    app.run(host=HOST, port=PORT, threaded=True, debug=False)
