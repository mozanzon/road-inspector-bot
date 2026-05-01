import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface EncoderData {
  ticks: number;
  rpm: number;
  speed: number; // m/s
  distance: number; // meters
}

interface SensorData {
  leftEncoder: EncoderData;
  rightEncoder: EncoderData;
  compass: number;
  pitch: number;
  roll: number;
  yaw: number;
}

export default function SensorReadings() {
  const { isDark } = useTheme();
  const [sensors, setSensors] = useState<SensorData>({
    leftEncoder: { ticks: 0, rpm: 0, speed: 0, distance: 0 },
    rightEncoder: { ticks: 0, rpm: 0, speed: 0, distance: 0 },
    compass: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSensors((prev) => {
        const leftTicks = prev.leftEncoder.ticks + Math.floor(Math.random() * 50 + 20);
        const rightTicks = prev.rightEncoder.ticks + Math.floor(Math.random() * 50 + 20);
        const leftRPM = 400 + Math.random() * 800;
        const rightRPM = 400 + Math.random() * 800;
        const wheelCirc = 0.22; // ~7cm wheel diameter
        const ticksPerRev = 360;
        return {
          leftEncoder: {
            ticks: leftTicks,
            rpm: leftRPM,
            speed: (leftRPM * wheelCirc) / 60,
            distance: (leftTicks / ticksPerRev) * wheelCirc,
          },
          rightEncoder: {
            ticks: rightTicks,
            rpm: rightRPM,
            speed: (rightRPM * wheelCirc) / 60,
            distance: (rightTicks / ticksPerRev) * wheelCirc,
          },
          compass: (prev.compass + Math.random() * 2 - 1 + 360) % 360,
          pitch: Math.sin(Date.now() / 2000) * 5,
          roll: Math.cos(Date.now() / 3000) * 3,
          yaw: (prev.compass + Math.random() * 2 - 1 + 360) % 360,
        };
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const cardCls = `rounded-2xl p-4 transition-theme ${isDark ? 'bg-[#12121c] border border-[#1e1e32]' : 'bg-white border border-[#e8e5dd]'}`;
  const subCardCls = `rounded-xl p-3 ${isDark ? 'bg-[#0a0a14] border border-[#1a1a2e]' : 'bg-zinc-50 border border-zinc-200'}`;
  const labelCls = `text-[10px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`;
  const valCls = `font-bold font-['JetBrains_Mono',monospace] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`;
  const unitCls = `text-[10px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`;

  const getDirection = (deg: number) => {
    if (deg >= 337.5 || deg < 22.5) return 'N';
    if (deg < 67.5) return 'NE';
    if (deg < 112.5) return 'E';
    if (deg < 157.5) return 'SE';
    if (deg < 202.5) return 'S';
    if (deg < 247.5) return 'SW';
    if (deg < 292.5) return 'W';
    return 'NW';
  };

  return (
    <div className={cardCls}>
      <div className={`${labelCls} mb-4`}>SENSOR READINGS</div>

      {/* Full Encoder Readings */}
      <div className="space-y-3 mb-4">
        {(['left', 'right'] as const).map((side) => {
          const enc = side === 'left' ? sensors.leftEncoder : sensors.rightEncoder;
          return (
            <div key={side} className={subCardCls}>
              <div className={`text-[9px] font-semibold tracking-wider uppercase mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
                {side === 'left' ? '⬅️' : '➡️'} {side.toUpperCase()} ENCODER
              </div>
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <div className={`text-[8px] uppercase ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Ticks</div>
                  <div className={`text-sm ${valCls}`}>{enc.ticks.toLocaleString()}</div>
                </div>
                <div>
                  <div className={`text-[8px] uppercase ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>RPM</div>
                  <div className={`text-sm ${valCls}`}>{enc.rpm.toFixed(0)}</div>
                </div>
                <div>
                  <div className={`text-[8px] uppercase ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Speed</div>
                  <div className={`text-sm ${valCls}`}>{enc.speed.toFixed(2)}<span className={unitCls}> m/s</span></div>
                </div>
                <div>
                  <div className={`text-[8px] uppercase ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Dist</div>
                  <div className={`text-sm ${valCls}`}>{enc.distance.toFixed(1)}<span className={unitCls}> m</span></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* IMU / Orientation */}
      <div className={subCardCls + ' mb-3'}>
        <div className={`text-[9px] font-semibold tracking-wider uppercase mb-2 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          🧭 IMU ORIENTATION
        </div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Pitch', value: sensors.pitch.toFixed(1), unit: '°' },
            { label: 'Roll', value: sensors.roll.toFixed(1), unit: '°' },
            { label: 'Yaw', value: sensors.yaw.toFixed(1), unit: '°' },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <div className={`text-[8px] uppercase ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{item.label}</div>
              <div className={`text-sm ${valCls}`}>{item.value}<span className={unitCls}>{item.unit}</span></div>
            </div>
          ))}
        </div>
      </div>

      {/* Compass */}
      <div className={subCardCls}>
        <div className="flex items-center justify-between mb-3">
          <div className={`text-[9px] font-semibold tracking-wider uppercase ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
            🧭 COMPASS
          </div>
          <div className="flex items-baseline gap-1">
            <span className={`text-xl ${valCls}`}>{sensors.compass.toFixed(0)}</span>
            <span className={unitCls}>° {getDirection(sensors.compass)}</span>
          </div>
        </div>
        <div className="relative w-full aspect-square max-w-[180px] mx-auto">
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <circle cx="100" cy="100" r="90" fill="none" stroke={isDark ? '#1e1e32' : '#e5e7eb'} strokeWidth="2" />
            {['N', 'E', 'S', 'W'].map((d, i) => {
              const positions = [[100, 18], [184, 104], [100, 192], [16, 104]];
              return (
                <text key={d} x={positions[i][0]} y={positions[i][1]} textAnchor="middle"
                  fill={isDark ? '#6b7280' : '#9ca3af'} fontSize="13" fontWeight="bold" fontFamily="Space Grotesk">
                  {d}
                </text>
              );
            })}
            {Array.from({ length: 36 }, (_, i) => {
              const a = (i * 10 - 90) * (Math.PI / 180);
              const r1 = 85, r2 = i % 3 === 0 ? 75 : 80;
              return (
                <line key={i} x1={100 + r1 * Math.cos(a)} y1={100 + r1 * Math.sin(a)}
                  x2={100 + r2 * Math.cos(a)} y2={100 + r2 * Math.sin(a)}
                  stroke={isDark ? '#2a2a3e' : '#d1d5db'} strokeWidth={i % 3 === 0 ? 2 : 1} />
              );
            })}
            <g transform={`rotate(${sensors.compass} 100 100)`} style={{ transition: 'transform 0.3s ease' }}>
              <polygon points="100,28 106,100 100,112 94,100" fill={isDark ? '#ef4444' : '#dc2626'} />
              <polygon points="100,112 106,100 100,172 94,100" fill={isDark ? '#374151' : '#d1d5db'} />
              <circle cx="100" cy="100" r="7" fill={isDark ? '#10b981' : '#059669'} stroke="white" strokeWidth="2" />
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
