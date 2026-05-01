import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Detection { type: 'crack' | 'pothole'; x: number; y: number; width: number; height: number; confidence: number; }
interface CameraFeedProps { isEnabled: boolean; onToggle: () => void; }

export default function CameraFeed({ isEnabled, onToggle }: CameraFeedProps) {
  const { isDark } = useTheme();
  const [detections, setDetections] = useState<Detection[]>([]);

  useEffect(() => {
    if (!isEnabled) { setDetections([]); return; }
    const interval = setInterval(() => {
      if (Math.random() > 0.7) {
        setDetections((prev) => [...prev.slice(-4), {
          type: Math.random() > 0.5 ? 'crack' : 'pothole',
          x: Math.random() * 80 + 10, y: Math.random() * 80 + 10,
          width: Math.random() * 20 + 10, height: Math.random() * 20 + 10,
          confidence: Math.random() * 30 + 70,
        }]);
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isEnabled]);

  const cardCls = `rounded-2xl p-4 transition-theme ${isDark ? 'bg-[#12121c] border border-[#1e1e32]' : 'bg-white border border-[#e8e5dd]'}`;
  const labelCls = `text-[10px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`;

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-3">
        <div className={labelCls}>AI CAMERA FEED</div>
        <button onClick={onToggle}
          className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all ${
            isEnabled
              ? isDark ? 'bg-emerald-500 text-white' : 'bg-emerald-500 text-white'
              : isDark ? 'bg-[#1a1a2e] text-zinc-500' : 'bg-zinc-100 text-zinc-400'
          }`}>
          {isEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className={`relative aspect-video rounded-xl overflow-hidden border ${
        isDark ? 'bg-[#0a0a14] border-[#1a1a2e]' : 'bg-zinc-900 border-zinc-200'
      }`}>
        {isEnabled ? (
          <>
            <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]" />
            <svg className="absolute inset-0 w-full h-full opacity-10">
              <defs>
                <pattern id="camGrid" width="30" height="30" patternUnits="userSpaceOnUse">
                  <path d="M 30 0 L 0 0 0 30" fill="none" stroke="#22d3ee" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#camGrid)" />
            </svg>
            {detections.map((d, i) => (
              <div key={i} className="absolute border-2 rounded" style={{
                left: `${d.x}%`, top: `${d.y}%`, width: `${d.width}%`, height: `${d.height}%`,
                borderColor: d.type === 'crack' ? '#ef4444' : '#f59e0b',
              }}>
                <div className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                  style={{ backgroundColor: d.type === 'crack' ? '#ef4444' : '#f59e0b' }}>
                  {d.type.toUpperCase()} {d.confidence.toFixed(0)}%
                </div>
              </div>
            ))}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 px-2.5 py-1 rounded-full">
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 text-[9px] font-bold">REC</span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>Camera Off</span>
          </div>
        )}
      </div>

      {isEnabled && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {[
            { label: 'Cracks', count: detections.filter(d => d.type === 'crack').length, color: isDark ? 'text-red-400' : 'text-red-500' },
            { label: 'Potholes', count: detections.filter(d => d.type === 'pothole').length, color: isDark ? 'text-amber-400' : 'text-amber-600' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-2.5 ${isDark ? 'bg-[#0a0a14] border border-[#1a1a2e]' : 'bg-zinc-50 border border-zinc-200'}`}>
              <div className={`text-[8px] font-semibold tracking-wider uppercase ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{s.label}</div>
              <div className={`text-lg font-bold font-['JetBrains_Mono',monospace] ${s.color}`}>{s.count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
