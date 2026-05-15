import importlib.util
import asyncio
import sys
import types
import unittest
from pathlib import Path


BRIDGE_MODULE = None


def load_bridge_module():
    global BRIDGE_MODULE
    if BRIDGE_MODULE is not None:
        return BRIDGE_MODULE

    for name in ("cv2", "numpy", "serial", "websockets"):
        sys.modules.setdefault(name, types.SimpleNamespace())

    bridge_path = Path(__file__).resolve().parents[1] / "pi_bridge" / "robot_bridge_rpi5.py"
    spec = importlib.util.spec_from_file_location("robot_bridge_rpi5", bridge_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    BRIDGE_MODULE = module
    return BRIDGE_MODULE


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


class WebSocketCompatibilityTests(unittest.TestCase):
    def test_handle_client_accepts_single_connection_argument(self):
        bridge = load_bridge_module()
        robot_bridge = bridge.RobotBridge()
        websocket = EmptyWebSocket()

        asyncio.run(robot_bridge.handle_client(websocket))

        self.assertNotIn(websocket, robot_bridge.clients)


class EmptyWebSocket:
    def __aiter__(self):
        return self

    async def __anext__(self):
        raise StopAsyncIteration


if __name__ == "__main__":
    unittest.main()
