#!/usr/bin/env bash
# Road Inspector Bot — RPi Bridge Setup
# Run on the Raspberry Pi:   bash setup.sh

set -e

echo "── Installing Python dependencies ──"
pip3 install --user pyserial websockets

echo ""
echo "── Testing bridge ──"
echo "Run manually first:   python3 bridge.py"
echo "The bridge will auto-detect the Arduino serial port."
echo ""

read -rp "Install as systemd service (auto-start on boot)? [y/N] " ans
if [[ "$ans" =~ ^[Yy]$ ]]; then
    BRIDGE_DIR="$(cd "$(dirname "$0")" && pwd)"
    SERVICE_FILE="/etc/systemd/system/road-inspector-bridge.service"

    sudo tee "$SERVICE_FILE" > /dev/null <<EOF
[Unit]
Description=Road Inspector Bot Bridge
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$BRIDGE_DIR
ExecStart=/usr/bin/python3 $BRIDGE_DIR/bridge.py
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    sudo systemctl enable road-inspector-bridge.service
    sudo systemctl start road-inspector-bridge.service
    echo "Service installed and started!"
    echo "  Status:  sudo systemctl status road-inspector-bridge"
    echo "  Logs:    sudo journalctl -u road-inspector-bridge -f"
else
    echo "Skipped service install."
fi

echo ""
echo "Done! Next steps:"
echo "  1. Connect Arduino via USB"
echo "  2. python3 bridge.py"
echo "  3. Open dashboard/index.html on your laptop"
echo "  4. Enter this Pi's IP and connect"
