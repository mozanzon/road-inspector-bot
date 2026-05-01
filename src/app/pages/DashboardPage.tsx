import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useControlMode } from '../contexts/ControlModeContext';

interface TelemetryData {
  battery: number;
  signal: number;
  cpu: number;
  memory: number;
  temperature: number;
  uptime: number;
  leftMotorRPM: number;
  rightMotorRPM: number;
  paintLevel: number;
  distanceTraveled: number;
  cracksDetected: number;
  potholesDetected: number;
}

function StatCard({ label, value, unit, icon, color, isDark }: {
  label: string; value: string | number; unit?: string; icon: string;
  color: string; isDark: boolean;
}) {
  return (
    <div className={`rounded-2xl p-4 transition-theme ${
      isDark
        ? 'bg-[#12121c] border border-[#1e1e32]'
        : 'bg-white border border-[#e8e5dd]'
    }`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-lg">{icon}</span>
        <span className={`text-[9px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] ${
          isDark ? 'text-zinc-600' : 'text-zinc-400'
        }`}>
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold font-['JetBrains_Mono',monospace] ${color}`}>
          {value}
        </span>
        {unit && (
          <span className={`text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

function ProgressBar({ value, max, color, isDark }: {
  value: number; max: number; color: string; isDark: boolean;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-[#1a1a2e]' : 'bg-zinc-100'}`}>
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function DashboardPage() {
  const { isDark } = useTheme();
  const { mode } = useControlMode();
  const [data, setData] = useState<TelemetryData>({
    battery: 87,
    signal: 92,
    cpu: 45,
    memory: 62,
    temperature: 38,
    uptime: 0,
    leftMotorRPM: 0,
    rightMotorRPM: 0,
    paintLevel: 78,
    distanceTraveled: 0,
    cracksDetected: 3,
    potholesDetected: 1,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setData((prev) => ({
        ...prev,
        battery: Math.max(5, prev.battery - Math.random() * 0.05),
        signal: 85 + Math.random() * 15,
        cpu: 30 + Math.random() * 40,
        memory: 55 + Math.random() * 15,
        temperature: 35 + Math.random() * 10,
        uptime: prev.uptime + 1,
        leftMotorRPM: mode === 'manual' ? 800 + Math.random() * 400 : 600 + Math.random() * 200,
        rightMotorRPM: mode === 'manual' ? 800 + Math.random() * 400 : 600 + Math.random() * 200,
        distanceTraveled: prev.distanceTraveled + Math.random() * 0.5,
        cracksDetected: prev.cracksDetected + (Math.random() > 0.95 ? 1 : 0),
        potholesDetected: prev.potholesDetected + (Math.random() > 0.98 ? 1 : 0),
      }));
    }, 1000);
    return () => clearInterval(interval);
  }, [mode]);

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className={`min-h-full p-4 space-y-4 pb-4 ${isDark ? '' : ''}`}>
      {/* System Overview Banner */}
      <div className={`rounded-2xl p-5 ${
        isDark
          ? 'bg-gradient-to-r from-cyan-500/10 via-emerald-500/10 to-teal-500/10 border border-cyan-500/20'
          : 'bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border border-emerald-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <div className={`text-[10px] font-semibold tracking-[2px] uppercase font-['Space_Grotesk',sans-serif] mb-1 ${
              isDark ? 'text-cyan-400/80' : 'text-emerald-600'
            }`}>
              SYSTEM OVERVIEW
            </div>
            <div className={`text-lg font-bold font-['Space_Grotesk',sans-serif] ${
              isDark ? 'text-white' : 'text-zinc-800'
            }`}>
              All Systems Operational
            </div>
          </div>
          <div className={`text-right font-['JetBrains_Mono',monospace] ${
            isDark ? 'text-cyan-400' : 'text-emerald-600'
          }`}>
            <div className="text-[10px] tracking-wider uppercase opacity-60">Uptime</div>
            <div className="text-lg font-bold">{formatUptime(data.uptime)}</div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          label="Battery"
          value={data.battery.toFixed(0)}
          unit="%"
          icon="🔋"
          color={data.battery > 50 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-amber-400' : 'text-amber-600')}
          isDark={isDark}
        />
        <StatCard
          label="Signal"
          value={data.signal.toFixed(0)}
          unit="%"
          icon="📶"
          color={isDark ? 'text-cyan-400' : 'text-cyan-600'}
          isDark={isDark}
        />
        <StatCard
          label="CPU Load"
          value={data.cpu.toFixed(0)}
          unit="%"
          icon="⚡"
          color={data.cpu > 70 ? (isDark ? 'text-red-400' : 'text-red-500') : (isDark ? 'text-emerald-400' : 'text-emerald-600')}
          isDark={isDark}
        />
        <StatCard
          label="Temp"
          value={data.temperature.toFixed(1)}
          unit="°C"
          icon="🌡️"
          color={data.temperature > 45 ? (isDark ? 'text-red-400' : 'text-red-500') : (isDark ? 'text-sky-400' : 'text-sky-600')}
          isDark={isDark}
        />
      </div>

      {/* Motor Status */}
      <div className={`rounded-2xl p-5 transition-theme ${
        isDark ? 'bg-[#12121c] border border-[#1e1e32]' : 'bg-white border border-[#e8e5dd]'
      }`}>
        <div className={`text-[10px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] mb-4 ${
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        }`}>
          MOTOR STATUS
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Left Motor</span>
              <span className={`text-sm font-bold font-['JetBrains_Mono',monospace] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {data.leftMotorRPM.toFixed(0)} RPM
              </span>
            </div>
            <ProgressBar value={data.leftMotorRPM} max={1500} color="bg-emerald-500" isDark={isDark} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Right Motor</span>
              <span className={`text-sm font-bold font-['JetBrains_Mono',monospace] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {data.rightMotorRPM.toFixed(0)} RPM
              </span>
            </div>
            <ProgressBar value={data.rightMotorRPM} max={1500} color="bg-emerald-500" isDark={isDark} />
          </div>
        </div>
      </div>

      {/* Paint & Detection */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`rounded-2xl p-4 transition-theme ${
          isDark ? 'bg-[#12121c] border border-[#1e1e32]' : 'bg-white border border-[#e8e5dd]'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🎨</span>
            <span className={`text-[9px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              Paint Level
            </span>
          </div>
          <div className={`text-2xl font-bold font-['JetBrains_Mono',monospace] mb-2 ${
            data.paintLevel > 30 ? (isDark ? 'text-violet-400' : 'text-violet-600') : (isDark ? 'text-red-400' : 'text-red-500')
          }`}>
            {data.paintLevel}%
          </div>
          <ProgressBar value={data.paintLevel} max={100} color={data.paintLevel > 30 ? "bg-violet-500" : "bg-red-500"} isDark={isDark} />
        </div>

        <div className={`rounded-2xl p-4 transition-theme ${
          isDark ? 'bg-[#12121c] border border-[#1e1e32]' : 'bg-white border border-[#e8e5dd]'
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📏</span>
            <span className={`text-[9px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              Distance
            </span>
          </div>
          <div className={`text-2xl font-bold font-['JetBrains_Mono',monospace] ${
            isDark ? 'text-cyan-400' : 'text-cyan-600'
          }`}>
            {data.distanceTraveled.toFixed(1)}
          </div>
          <span className={`text-xs ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>meters</span>
        </div>
      </div>

      {/* Detection Summary */}
      <div className={`rounded-2xl p-5 transition-theme ${
        isDark ? 'bg-[#12121c] border border-[#1e1e32]' : 'bg-white border border-[#e8e5dd]'
      }`}>
        <div className={`text-[10px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] mb-4 ${
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        }`}>
          AI DETECTION SUMMARY
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className={`rounded-xl p-3 text-center ${
            isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`text-xl font-bold font-['JetBrains_Mono',monospace] ${
              isDark ? 'text-red-400' : 'text-red-500'
            }`}>
              {data.cracksDetected}
            </div>
            <div className={`text-[9px] font-semibold tracking-wider uppercase mt-1 ${
              isDark ? 'text-red-400/60' : 'text-red-400'
            }`}>
              Cracks
            </div>
          </div>
          <div className={`rounded-xl p-3 text-center ${
            isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
          }`}>
            <div className={`text-xl font-bold font-['JetBrains_Mono',monospace] ${
              isDark ? 'text-amber-400' : 'text-amber-600'
            }`}>
              {data.potholesDetected}
            </div>
            <div className={`text-[9px] font-semibold tracking-wider uppercase mt-1 ${
              isDark ? 'text-amber-400/60' : 'text-amber-400'
            }`}>
              Potholes
            </div>
          </div>
          <div className={`rounded-xl p-3 text-center ${
            isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'
          }`}>
            <div className={`text-xl font-bold font-['JetBrains_Mono',monospace] ${
              isDark ? 'text-emerald-400' : 'text-emerald-600'
            }`}>
              {data.cracksDetected + data.potholesDetected}
            </div>
            <div className={`text-[9px] font-semibold tracking-wider uppercase mt-1 ${
              isDark ? 'text-emerald-400/60' : 'text-emerald-400'
            }`}>
              Total
            </div>
          </div>
        </div>
      </div>

      {/* Memory & Resource Bars */}
      <div className={`rounded-2xl p-5 transition-theme ${
        isDark ? 'bg-[#12121c] border border-[#1e1e32]' : 'bg-white border border-[#e8e5dd]'
      }`}>
        <div className={`text-[10px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] mb-4 ${
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        }`}>
          RESOURCE USAGE
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>CPU</span>
              <span className={`text-xs font-mono font-bold ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>{data.cpu.toFixed(0)}%</span>
            </div>
            <ProgressBar value={data.cpu} max={100} color={data.cpu > 70 ? "bg-red-500" : "bg-cyan-500"} isDark={isDark} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Memory</span>
              <span className={`text-xs font-mono font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{data.memory.toFixed(0)}%</span>
            </div>
            <ProgressBar value={data.memory} max={100} color="bg-violet-500" isDark={isDark} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>Battery</span>
              <span className={`text-xs font-mono font-bold ${data.battery > 50 ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-amber-400' : 'text-amber-600')}`}>
                {data.battery.toFixed(0)}%
              </span>
            </div>
            <ProgressBar value={data.battery} max={100} color={data.battery > 50 ? "bg-emerald-500" : "bg-amber-500"} isDark={isDark} />
          </div>
        </div>
      </div>
    </div>
  );
}
