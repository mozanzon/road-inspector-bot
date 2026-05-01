import { useState } from 'react';
import { useControlMode } from '../contexts/ControlModeContext';
import { useTheme } from '../contexts/ThemeContext';
import Joystick from '../components/Joystick';
import CameraFeed from '../components/CameraFeed';
import PaintingControl, { PaintingSettings } from '../components/PaintingControl';
import PIDTuning from '../components/PIDTuning';
import SensorReadings from '../components/SensorReadings';
import GPSControl from '../components/GPSControl';
import DistanceTracker from '../components/DistanceTracker';

export default function ControlsPage() {
  const { mode, setMode } = useControlMode();
  const { isDark } = useTheme();
  const [velocity, setVelocity] = useState(45);
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [currentAction, setCurrentAction] = useState('Idle');
  const [isStopped, setIsStopped] = useState(false);

  const handleEmergencyStop = () => {
    setIsStopped(true); setIsMoving(false); setVelocity(0);
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    setTimeout(() => setIsStopped(false), 3000);
  };

  const handleJoystickMove = (data: any) => {
    if (!isStopped) { setIsMoving(true); setCurrentAction(`Joystick ${data.direction || 'Center'}`); }
  };
  const handleJoystickStop = () => { setIsMoving(false); setCurrentAction('Idle'); };

  const sendCommand = (cmd: string) => {
    if (isStopped) return;
    setCurrentAction(cmd);
    setIsMoving(cmd !== 'STOP');
    console.log('Command:', cmd);
  };

  const cardCls = `rounded-2xl p-4 transition-theme ${isDark ? 'bg-[#12121c] border border-[#1e1e32]' : 'bg-white border border-[#e8e5dd]'}`;
  const labelCls = `text-[10px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`;

  return (
    <div className={`min-h-full p-4 space-y-4 pb-4 ${isDark ? '' : ''}`}>
      {/* Emergency Stop Overlay */}
      {isStopped && (
        <div className="fixed inset-0 bg-red-600/95 z-[200] flex items-center justify-center">
          <div className="text-center animate-pulse">
            <div className="text-5xl font-black text-white tracking-[6px]">EMERGENCY STOP</div>
            <div className="text-xl text-white/80 mt-4">All systems halted</div>
          </div>
        </div>
      )}

      {/* Mode Toggle - Horizontal */}
      <div className={cardCls}>
        <div className="flex items-center justify-between gap-3">
          <div className="shrink-0">
            <div className={labelCls}>CONTROL MODE</div>
            <div className="flex items-center gap-2 mt-1">
              <div className={`w-2 h-2 rounded-full ${mode === 'manual' ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`} />
              <span className={`text-xs font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
                {mode === 'manual' ? 'MANUAL' : 'AUTO NAV'}
              </span>
            </div>
          </div>
          <div className={`flex rounded-full p-1 ${isDark ? 'bg-[#1a1a2e]' : 'bg-zinc-100'}`}>
            {(['auto', 'manual'] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} disabled={isStopped}
                className={`px-4 py-2 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all ${
                  mode === m
                    ? isDark ? 'bg-emerald-500 text-white shadow-lg' : 'bg-emerald-500 text-white shadow-md'
                    : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-zinc-400 hover:text-zinc-600'
                } disabled:opacity-50`}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Joystick + Movement Buttons - Horizontal Layout */}
      {mode === 'manual' && (
        <div className={cardCls}>
          <div className={`${labelCls} mb-3`}>DRIVE CONTROLS</div>
          <div className="flex items-center gap-4">
            {/* Joystick */}
            <div className="shrink-0">
              <Joystick onMove={handleJoystickMove} onStop={handleJoystickStop} />
            </div>

            {/* Direction Buttons */}
            <div className="flex-1 flex flex-col items-center gap-2">
              <div className={`text-[9px] font-semibold tracking-wider uppercase mb-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                D-PAD
              </div>
              <button onClick={() => sendCommand('FORWARD')}
                className={`w-14 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all active:scale-90 ${
                  isDark ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                }`}>▲</button>
              <div className="flex gap-2">
                <button onClick={() => sendCommand('LEFT')}
                  className={`w-14 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all active:scale-90 ${
                    isDark ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                  }`}>◀</button>
                <button onClick={() => sendCommand('STOP')}
                  className={`w-14 h-10 rounded-xl font-bold text-[9px] flex items-center justify-center transition-all active:scale-90 ${
                    isDark ? 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30' : 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100'
                  }`}>STOP</button>
                <button onClick={() => sendCommand('RIGHT')}
                  className={`w-14 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all active:scale-90 ${
                    isDark ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                  }`}>▶</button>
              </div>
              <button onClick={() => sendCommand('BACKWARD')}
                className={`w-14 h-10 rounded-xl font-bold text-xs flex items-center justify-center transition-all active:scale-90 ${
                  isDark ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100'
                }`}>▼</button>
            </div>
          </div>
        </div>
      )}

      {/* Velocity - Horizontal */}
      <div className={cardCls}>
        <div className="flex items-center justify-between mb-2">
          <div className={labelCls}>VELOCITY LIMIT</div>
          <div className="flex items-baseline gap-1">
            <span className={`text-lg font-bold font-['JetBrains_Mono',monospace] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{velocity}</span>
            <span className={`text-[10px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>m/s</span>
          </div>
        </div>
        <input type="range" min="0" max="100" value={velocity} disabled={isStopped}
          onChange={(e) => setVelocity(Number(e.target.value))}
          className={`w-full h-1.5 rounded-full appearance-none cursor-pointer disabled:opacity-50 ${isDark ? 'bg-[#1a1a2e]' : 'bg-zinc-100'}`} />
      </div>

      {/* Camera */}
      <CameraFeed isEnabled={cameraEnabled} onToggle={() => setCameraEnabled(!cameraEnabled)} />

      {/* Painting */}
      <PaintingControl onSettingsChange={(s: PaintingSettings) => { if (s.isActive) setCurrentAction(`Painting ${s.mode}`); }} />

      {/* PID */}
      <PIDTuning onUpdate={(v) => console.log('PID:', v)} />

      {/* Sensor Readings (with full encoders) */}
      <SensorReadings />

      {/* GPS */}
      <GPSControl onLocationChange={(l) => console.log('Loc:', l)} />

      {/* Distance */}
      <DistanceTracker isMoving={isMoving} currentAction={currentAction} />

      {/* Emergency Stop */}
      <div className="sticky bottom-0 pt-3 pb-1">
        <button onClick={handleEmergencyStop}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 text-white font-black text-xl tracking-[3px] uppercase shadow-lg shadow-red-500/30 hover:from-red-700 hover:to-red-600 active:scale-[0.98] transition-all flex items-center justify-center gap-4">
          <span className="text-2xl">⚠️</span>
          EMERGENCY STOP
        </button>
      </div>
    </div>
  );
}
