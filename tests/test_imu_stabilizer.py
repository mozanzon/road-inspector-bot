import unittest

from imu_stabilizer import (
    exponential_smooth,
    sanitize_encoder_delta,
    smooth_heading_deg,
)


class ImuStabilizerTests(unittest.TestCase):
    def test_exponential_smooth_first_sample_returns_raw(self):
        self.assertEqual(exponential_smooth(None, 7.5, 0.2), 7.5)

    def test_exponential_smooth_reduces_spike(self):
        self.assertAlmostEqual(exponential_smooth(0.0, 10.0, 0.2), 2.0, places=6)

    def test_heading_smoothing_handles_wraparound(self):
        smoothed = smooth_heading_deg(359.0, 1.0, 0.5)
        self.assertTrue(abs(smoothed - 0.0) < 0.001 or abs(smoothed - 360.0) < 0.001)

    def test_encoder_deadband_zeros_small_noise(self):
        self.assertEqual(sanitize_encoder_delta(1, 100, noise_floor_ticks=1, max_ticks_per_sec=2000), 0)
        self.assertEqual(sanitize_encoder_delta(-1, 100, noise_floor_ticks=1, max_ticks_per_sec=2000), 0)

    def test_encoder_spike_is_clamped(self):
        self.assertEqual(sanitize_encoder_delta(5000, 100, noise_floor_ticks=1, max_ticks_per_sec=2000), 200)
        self.assertEqual(sanitize_encoder_delta(-5000, 100, noise_floor_ticks=1, max_ticks_per_sec=2000), -200)


if __name__ == "__main__":
    unittest.main()
