import unittest
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent))
from robot_bridge_rpi5 import ArduinoReader, motor_command_to_arduino


class RobotBridgeProtocolTest(unittest.TestCase):
    def test_maps_signed_wheel_command_to_cmd_velocity(self):
        command = motor_command_to_arduino({"type": "motor", "left": 255, "right": -255})

        self.assertEqual(command, "CMD,0.000,-3.509")

    def test_maps_frontend_turn_actions_to_arduino_turn_commands(self):
        self.assertEqual(
            motor_command_to_arduino({"type": "movement", "action": "left", "speed": 180}),
            "TURN_LEFT_90 180",
        )
        self.assertEqual(
            motor_command_to_arduino({"type": "movement", "action": "right", "speed": 180}),
            "TURN_RIGHT_90 180",
        )

    def test_parses_arduino_telemetry_packet(self):
        parsed = ArduinoReader._parse_line(
            "TELEMETRY,91.50,1.2500,-0.5000,1.5700,30.123456,31.123456,12,14,100,0.320,20.00,30.00"
        )

        self.assertEqual(parsed["type"], "telemetry")
        self.assertEqual(parsed["heading"], 91.5)
        self.assertEqual(parsed["enc_left_delta"], 12)
        self.assertEqual(parsed["speed_mps"], 0.32)


if __name__ == "__main__":
    unittest.main()
