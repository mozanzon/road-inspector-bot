import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface Segment { id: number; distance: number; timestamp: Date; type: string; }
interface Props { isMoving: boolean; currentAction?: string; }

export default function DistanceTracker({ isMoving, currentAction = 'Motion' }: Props) {
  const { isDark } = useTheme();
  const [totalDist, setTotalDist] = useState(0);
  const [segDist, setSegDist] = useState(0);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [segStart, setSegStart] = useState(Date.now());

  useEffect(() => {
    if (!isMoving) return;
    const i = setInterval(() => {
      const inc = 0.1 + Math.random() * 0.2;
      setTotalDist(p => p + inc);
      setSegDist(p => p + inc);
    }, 100);
    return () => clearInterval(i);
  }, [isMoving]);

  useEffect(() => {
    if (segDist > 0) {
      setSegments(p => [{ id: Date.now(), distance: segDist, timestamp: new Date(segStart), type: currentAction }, ...p.slice(0, 9)]);
      setSegDist(0);
      setSegStart(Date.now());
    }
  }, [currentAction]);

  const cardCls = `rounded-2xl p-4 transition-theme ${isDark ? 'bg-[#12121c] border border-[#1e1e32]' : 'bg-white border border-[#e8e5dd]'}`;
  const labelCls = `text-[10px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`;

  return (
    <div className={cardCls}>
      <div className={`${labelCls} mb-3`}>DISTANCE TRACKING</div>

      <div className={`rounded-2xl p-5 text-center mb-3 ${
        isDark ? 'bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200'
      }`}>
        <div className={`text-[9px] tracking-wider uppercase mb-1 ${isDark ? 'text-emerald-400/60' : 'text-emerald-500'}`}>Total Distance</div>
        <div className="flex items-baseline justify-center gap-1">
          <span className={`text-4xl font-black font-['JetBrains_Mono',monospace] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
            {totalDist.toFixed(2)}
          </span>
          <span className={`text-lg ${isDark ? 'text-emerald-400/60' : 'text-emerald-400'}`}>m</span>
        </div>
      </div>

      <div className={`rounded-xl p-3 mb-3 ${isDark ? 'bg-[#0a0a14] border border-[#1a1a2e]' : 'bg-zinc-50 border border-zinc-200'}`}>
        <div className="flex justify-between mb-1">
          <span className={`text-[9px] font-semibold uppercase ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>Current Segment</span>
          <div className="flex items-center gap-1.5">
            {isMoving && <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />}
            <span className={`text-[9px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{currentAction}</span>
          </div>
        </div>
        <span className={`text-2xl font-bold font-['JetBrains_Mono',monospace] ${isDark ? 'text-cyan-400' : 'text-cyan-600'}`}>
          {segDist.toFixed(2)}
        </span>
        <span className={`text-sm ml-1 ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>m</span>
      </div>

      <div className="flex justify-between items-center mb-2">
        <span className={`text-[9px] font-semibold uppercase ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>History</span>
        <button onClick={() => { setSegments([]); setTotalDist(0); setSegDist(0); }}
          className={`text-[9px] font-bold tracking-wider uppercase ${isDark ? 'text-red-400' : 'text-red-500'} hover:underline`}>
          RESET
        </button>
      </div>

      <div className="max-h-[200px] overflow-y-auto space-y-1.5">
        {segments.length === 0 ? (
          <div className={`text-center py-6 text-[11px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>No segments yet</div>
        ) : segments.map((s) => (
          <div key={s.id} className={`flex items-center justify-between rounded-lg p-2.5 ${
            isDark ? 'bg-[#0a0a14] border border-[#1a1a2e]' : 'bg-zinc-50 border border-zinc-200'
          }`}>
            <div>
              <div className={`text-[9px] font-bold ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>{s.type}</div>
              <div className={`text-[8px] ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>{s.timestamp.toLocaleTimeString()}</div>
            </div>
            <span className={`text-sm font-bold font-['JetBrains_Mono',monospace] ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>
              {s.distance.toFixed(2)}m
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
