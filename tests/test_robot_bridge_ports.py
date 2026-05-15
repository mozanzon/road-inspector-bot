import importlib.util
import sys
import types
import unittest
from pathlib import Path


def load_bridge_module():
    for name in ("cv2", "numpy", "serial", "websockets"):
        sys.modules.setdefault(name, types.SimpleNamespace())

    bridge_path = Path(__file__).resolve().parents[1] / "pi_bridge" / "robot_bridge_rpi5.py"
    spec = importlib.util.spec_from_file_location("robot_bridge_rpi5", bridge_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SerialPortConfigTests(unittest.TestCase):
    def test_default_ports_try_ama10_before_ama0_before_usb_fallbacks(self):
        bridge = load_bridge_module()

        self.assertEqual(
            bridge.DEFAULT_ARDUINO_PORTS,
            ["/dev/ttyAMA10", "/dev/ttyAMA0", "/dev/ttyUSB0", "/dev/ttyACM0", "/dev/ttyACM10"],
        )

        reader = bridge.ArduinoReader()
        self.assertEqual(reader.ports, bridge.DEFAULT_ARDUINO_PORTS)
        self.assertEqual(reader.port, "/dev/ttyAMA10")

    def test_parse_serial_ports_accepts_comma_separated_overrides(self):
        bridge = load_bridge_module()

        self.assertEqual(
            bridge.parse_serial_ports(" /dev/ttyAMA0, /dev/ttyUSB0 ,, "),
            ["/dev/ttyAMA0", "/dev/ttyUSB0"],
        )


if __name__ == "__main__":
    unittest.main()
