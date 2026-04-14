import threading
from typing import Optional


def _clamp_alpha(alpha: float) -> float:
    if alpha < 0.0:
        return 0.0
    if alpha > 1.0:
        return 1.0
    return alpha


def exponential_smooth(previous: Optional[float], current: float, alpha: float) -> float:
    alpha = _clamp_alpha(alpha)
    if previous is None:
        return current
    return (alpha * current) + ((1.0 - alpha) * previous)


def _normalize_heading_deg(value: float) -> float:
    out = value % 360.0
    if out < 0.0:
        out += 360.0
    return out


def _shortest_heading_delta_deg(previous_deg: float, current_deg: float) -> float:
    delta = (current_deg - previous_deg + 180.0) % 360.0 - 180.0
    return delta


def smooth_heading_deg(previous_deg: Optional[float], current_deg: float, alpha: float) -> float:
    current = _normalize_heading_deg(current_deg)
    if previous_deg is None:
        return current
    previous = _normalize_heading_deg(previous_deg)
    delta = _shortest_heading_delta_deg(previous, current)
    alpha = _clamp_alpha(alpha)
    return _normalize_heading_deg(previous + (alpha * delta))


def sanitize_encoder_delta(
    delta_ticks: int,
    dt_ms: int,
    noise_floor_ticks: int = 1,
    max_ticks_per_sec: int = 2500,
) -> int:
    delta = int(delta_ticks)
    if abs(delta) <= max(0, int(noise_floor_ticks)):
        return 0

    if dt_ms <= 0:
        return delta

    max_step = int(round((max(0, int(max_ticks_per_sec)) * dt_ms) / 1000.0))
    max_step = max(max_step, max(0, int(noise_floor_ticks)) + 1)
    if delta > max_step:
        return max_step
    if delta < -max_step:
        return -max_step
    return delta


class ImuReadingStabilizer:
    def __init__(
        self,
        *,
        accel_alpha: float = 0.2,
        gyro_alpha: float = 0.2,
        heading_alpha: float = 0.18,
        encoder_noise_floor_ticks: int = 1,
        encoder_max_ticks_per_sec: int = 2500,
    ) -> None:
        self.accel_alpha = accel_alpha
        self.gyro_alpha = gyro_alpha
        self.heading_alpha = heading_alpha
        self.encoder_noise_floor_ticks = encoder_noise_floor_ticks
        self.encoder_max_ticks_per_sec = encoder_max_ticks_per_sec

        self._ax = None
        self._ay = None
        self._az = None
        self._gx = None
        self._gy = None
        self._gz = None
        self._heading = None
        self._lock = threading.Lock()

    def stabilize(
        self,
        *,
        ax: float,
        ay: float,
        az: float,
        gx: float,
        gy: float,
        gz: float,
        heading: float,
        enc1_delta: int,
        enc2_delta: int,
        dt_ms: int,
    ) -> dict:
        with self._lock:
            self._ax = exponential_smooth(self._ax, ax, self.accel_alpha)
            self._ay = exponential_smooth(self._ay, ay, self.accel_alpha)
            self._az = exponential_smooth(self._az, az, self.accel_alpha)

            self._gx = exponential_smooth(self._gx, gx, self.gyro_alpha)
            self._gy = exponential_smooth(self._gy, gy, self.gyro_alpha)
            self._gz = exponential_smooth(self._gz, gz, self.gyro_alpha)

            self._heading = smooth_heading_deg(self._heading, heading, self.heading_alpha)

            enc1 = sanitize_encoder_delta(
                enc1_delta,
                dt_ms,
                noise_floor_ticks=self.encoder_noise_floor_ticks,
                max_ticks_per_sec=self.encoder_max_ticks_per_sec,
            )
            enc2 = sanitize_encoder_delta(
                enc2_delta,
                dt_ms,
                noise_floor_ticks=self.encoder_noise_floor_ticks,
                max_ticks_per_sec=self.encoder_max_ticks_per_sec,
            )

            return {
                "ax": float(self._ax),
                "ay": float(self._ay),
                "az": float(self._az),
                "gx": float(self._gx),
                "gy": float(self._gy),
                "gz": float(self._gz),
                "heading": float(self._heading),
                "enc1_delta": int(enc1),
                "enc2_delta": int(enc2),
            }
