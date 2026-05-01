import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface GPSData { latitude: number; longitude: number; accuracy: number; isEnabled: boolean; }
interface GPSControlProps { onLocationChange: (location: [number, number]) => void; }

export default function GPSControl({ onLocationChange }: GPSControlProps) {
  const { isDark } = useTheme();
  const [gps, setGps] = useState<GPSData>({ latitude: 30.0444, longitude: 31.2357, accuracy: 0, isEnabled: false });
  const [isVerifying, setIsVerifying] = useState(false);
  const [vStatus, setVStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (!gps.isEnabled) return;
    const interval = setInterval(() => {
      const lat = gps.latitude + (Math.random() - 0.5) * 0.0001;
      const lng = gps.longitude + (Math.random() - 0.5) * 0.0001;
      setGps((p) => ({ ...p, latitude: lat, longitude: lng, accuracy: 2 + Math.random() * 3 }));
      onLocationChange([lat, lng]);
    }, 1000);
    return () => clearInterval(interval);
  }, [gps.isEnabled, gps.latitude, gps.longitude]);

  const cardCls = `rounded-2xl p-4 transition-theme ${isDark ? 'bg-[#12121c] border border-[#1e1e32]' : 'bg-white border border-[#e8e5dd]'}`;
  const labelCls = `text-[10px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`;
  const subCls = `rounded-xl p-3 ${isDark ? 'bg-[#0a0a14] border border-[#1a1a2e]' : 'bg-zinc-50 border border-zinc-200'}`;

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-3">
        <div className={labelCls}>GPS NAVIGATION</div>
        <button onClick={() => { setGps(p => ({ ...p, isEnabled: !p.isEnabled })); setVStatus('idle'); }}
          className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all ${
            gps.isEnabled
              ? isDark ? 'bg-emerald-500 text-white' : 'bg-emerald-500 text-white'
              : isDark ? 'bg-[#1a1a2e] text-zinc-500' : 'bg-zinc-100 text-zinc-400'
          }`}>
          {gps.isEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      {gps.isEnabled ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Latitude', value: gps.latitude.toFixed(6) + '°' },
              { label: 'Longitude', value: gps.longitude.toFixed(6) + '°' },
            ].map((c) => (
              <div key={c.label} className={subCls}>
                <div className={`text-[8px] uppercase font-semibold ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{c.label}</div>
                <div className={`text-sm font-bold font-['JetBrains_Mono',monospace] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{c.value}</div>
              </div>
            ))}
          </div>

          <div className={subCls}>
            <div className="flex justify-between mb-1">
              <span className={`text-[8px] uppercase font-semibold ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Accuracy</span>
              <span className={`text-xs font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>{gps.accuracy.toFixed(1)}m</span>
            </div>
            <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#1a1a2e]' : 'bg-zinc-200'}`}>
              <div className={`h-full rounded-full transition-all ${gps.accuracy < 3 ? 'bg-emerald-500' : gps.accuracy < 5 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${Math.max(20, 100 - gps.accuracy * 10)}%` }} />
            </div>
          </div>

          <button onClick={() => { setIsVerifying(true); setVStatus('idle'); setTimeout(() => { setIsVerifying(false); setVStatus(Math.random() > 0.2 ? 'success' : 'error'); }, 2000); }}
            disabled={isVerifying}
            className={`w-full py-2.5 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all disabled:opacity-50 ${
              isDark ? 'bg-[#1a1a2e] text-zinc-400 border border-[#2a2a3e] hover:bg-[#252540]' : 'bg-zinc-50 text-zinc-500 border border-zinc-200 hover:bg-zinc-100'
            }`}>
            {isVerifying ? 'VERIFYING...' : 'VERIFY GPS'}
          </button>

          {vStatus !== 'idle' && (
            <div className={`flex items-center gap-2 p-2.5 rounded-xl ${
              vStatus === 'success'
                ? isDark ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-emerald-50 border border-emerald-200'
                : isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
            }`}>
              <div className={`w-2 h-2 rounded-full ${vStatus === 'success' ? 'bg-emerald-400' : 'bg-red-400'}`} />
              <span className={`text-[10px] ${vStatus === 'success' ? (isDark ? 'text-emerald-400' : 'text-emerald-600') : (isDark ? 'text-red-400' : 'text-red-500')}`}>
                {vStatus === 'success' ? 'GPS verified' : 'Signal weak'}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className={`text-center py-8 text-sm ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          Enable GPS to track location
        </div>
      )}
    </div>
  );
}
