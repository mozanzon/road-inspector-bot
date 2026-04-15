#!/usr/bin/env python3
"""
Road Inspector Bot — Raspberry Pi WebSocket Bridge
====================================================
Bridges Arduino Serial ↔ WebSocket so a laptop browser
can control the bot and receive telemetry over WiFi.

Usage:
    python3 bridge.py                        # auto-detect serial port
    python3 bridge.py --port /dev/ttyUSB0    # explicit port
    python3 bridge.py --ws-port 8765         # change WebSocket port

Dependencies:
    pip install pyserial websockets
"""

import asyncio
import argparse
import json
import logging
import signal
import sys
import glob
import time

import serial
import serial.tools.list_ports
import websockets

# ── Logging ──────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("bridge")

# ── Global state ─────────────────────────────────────────
clients: set = set()
ser: serial.Serial | None = None
serial_lock = asyncio.Lock()


# ═══════════════════════════════════════════════════════════
#  Serial helpers
# ═══════════════════════════════════════════════════════════

def find_arduino_port() -> str | None:
    """Auto-detect likely Arduino serial port."""
    patterns_linux = ["/dev/ttyUSB*", "/dev/ttyACM*"]
    # Check pyserial port list first
    ports = serial.tools.list_ports.comports()
    for p in ports:
        desc = (p.description or "").lower()
        mfg  = (p.manufacturer or "").lower()
        if any(kw in desc for kw in ("arduino", "ch340", "cp210", "ftdi")):
            return p.device
        if any(kw in mfg for kw in ("arduino", "wch", "silicon", "ftdi")):
            return p.device
    # Fallback: glob common Linux paths
    for pat in patterns_linux:
        matches = glob.glob(pat)
        if matches:
            return matches[0]
    return None


def open_serial(port: str, baud: int = 115200) -> serial.Serial:
    """Open serial connection with retry."""
    for attempt in range(5):
        try:
            s = serial.Serial(port, baud, timeout=0.1)
            time.sleep(2)          # Arduino resets on serial open
            s.reset_input_buffer()
            log.info(f"Serial open: {port} @ {baud}")
            return s
        except serial.SerialException as e:
            log.warning(f"Serial open attempt {attempt+1}/5 failed: {e}")
            time.sleep(2)
    raise RuntimeError(f"Cannot open serial port {port}")


# ═══════════════════════════════════════════════════════════
#  WebSocket handlers
# ═══════════════════════════════════════════════════════════

async def register(ws):
    clients.add(ws)
    addr = ws.remote_address
    log.info(f"Client connected: {addr}  (total: {len(clients)})")
    # Send a welcome / status request to Arduino
    await send_to_arduino("STATUS")


async def unregister(ws):
    clients.discard(ws)
    log.info(f"Client disconnected  (total: {len(clients)})")


async def broadcast(message: str):
    """Send message to all connected WebSocket clients."""
    if clients:
        await asyncio.gather(
            *(client.send(message) for client in clients),
            return_exceptions=True,
        )


async def send_to_arduino(cmd: str):
    """Thread-safe write to Arduino serial."""
    global ser
    if ser is None or not ser.is_open:
        log.warning("Serial not open, dropping command: %s", cmd)
        return
    async with serial_lock:
        try:
            ser.write((cmd.strip() + "\n").encode("utf-8"))
            ser.flush()
            log.info(f"→ Arduino: {cmd.strip()}")
        except serial.SerialException as e:
            log.error(f"Serial write error: {e}")


async def ws_handler(ws, path=None):
    """Handle a single WebSocket client."""
    await register(ws)
    try:
        async for message in ws:
            msg = message.strip()
            log.info(f"← Client: {msg}")
            await send_to_arduino(msg)
    except websockets.exceptions.ConnectionClosed:
        pass
    finally:
        await unregister(ws)


# ═══════════════════════════════════════════════════════════
#  Serial reader (runs in background)
# ═══════════════════════════════════════════════════════════

async def serial_reader():
    """Continuously read lines from Arduino and broadcast."""
    global ser
    loop = asyncio.get_event_loop()
    while True:
        if ser is None or not ser.is_open:
            await asyncio.sleep(1)
            continue
        try:
            # Use run_in_executor to avoid blocking the event loop
            line = await loop.run_in_executor(None, ser.readline)
            if line:
                text = line.decode("utf-8", errors="replace").strip()
                if text:
                    await broadcast(text)
        except serial.SerialException as e:
            log.error(f"Serial read error: {e}")
            await asyncio.sleep(1)
        except Exception as e:
            log.error(f"Unexpected error in serial reader: {e}")
            await asyncio.sleep(0.5)


# ═══════════════════════════════════════════════════════════
#  Main
# ═══════════════════════════════════════════════════════════

async def main(args):
    global ser

    # Resolve serial port
    port = args.port
    if not port:
        port = find_arduino_port()
        if not port:
            log.error("No Arduino serial port found. Use --port to specify.")
            sys.exit(1)

    ser = open_serial(port, args.baud)

    # Start serial reader task
    reader_task = asyncio.create_task(serial_reader())

    # Start WebSocket server on all interfaces
    ws_server = await websockets.serve(
        ws_handler,
        "0.0.0.0",
        args.ws_port,
        ping_interval=20,
        ping_timeout=20,
    )
    log.info(f"WebSocket server listening on ws://0.0.0.0:{args.ws_port}")
    log.info(f"Dashboard: open index.html and connect to ws://<this-pi-ip>:{args.ws_port}")

    # Graceful shutdown
    stop = asyncio.Event()

    def _signal_handler():
        log.info("Shutting down...")
        stop.set()

    for sig in (signal.SIGINT, signal.SIGTERM):
        try:
            asyncio.get_event_loop().add_signal_handler(sig, _signal_handler)
        except NotImplementedError:
            # Windows doesn't support add_signal_handler
            pass

    await stop.wait()
    reader_task.cancel()
    ws_server.close()
    await ws_server.wait_closed()
    if ser and ser.is_open:
        ser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Road Inspector Bot Bridge")
    parser.add_argument("--port", "-p", default=None,
                        help="Arduino serial port (auto-detect if omitted)")
    parser.add_argument("--baud", "-b", type=int, default=115200,
                        help="Serial baud rate (default: 115200)")
    parser.add_argument("--ws-port", "-w", type=int, default=8765,
                        help="WebSocket server port (default: 8765)")
    args = parser.parse_args()

    try:
        asyncio.run(main(args))
    except KeyboardInterrupt:
        log.info("Interrupted.")
    finally:
        if ser and ser.is_open:
            ser.close()
            log.info("Serial closed.")
