import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface PaintingControlProps { onSettingsChange: (settings: PaintingSettings) => void; }
export interface PaintingSettings { isActive: boolean; mode: 'continuous' | 'dashed'; dashLength: number; gapLength: number; }

export default function PaintingControl({ onSettingsChange }: PaintingControlProps) {
  const { isDark } = useTheme();
  const [settings, setSettings] = useState<PaintingSettings>({ isActive: false, mode: 'continuous', dashLength: 50, gapLength: 30 });

  const update = (u: Partial<PaintingSettings>) => { const n = { ...settings, ...u }; setSettings(n); onSettingsChange(n); };

  const cardCls = `rounded-2xl p-4 transition-theme ${isDark ? 'bg-[#12121c] border border-[#1e1e32]' : 'bg-white border border-[#e8e5dd]'}`;
  const labelCls = `text-[10px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`;

  return (
    <div className={cardCls}>
      <div className="flex items-center justify-between mb-3">
        <div className={labelCls}>PAINTING MECHANISM</div>
        <button onClick={() => update({ isActive: !settings.isActive })}
          className={`px-4 py-1.5 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all ${
            settings.isActive
              ? isDark ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20' : 'bg-violet-500 text-white'
              : isDark ? 'bg-[#1a1a2e] text-zinc-500' : 'bg-zinc-100 text-zinc-400'
          }`}>
          {settings.isActive ? 'ACTIVE' : 'STANDBY'}
        </button>
      </div>

      <div className={`flex rounded-full p-1 mb-3 ${isDark ? 'bg-[#1a1a2e]' : 'bg-zinc-100'}`}>
        {(['continuous', 'dashed'] as const).map((m) => (
          <button key={m} onClick={() => update({ mode: m })}
            className={`flex-1 px-3 py-2 rounded-full text-[10px] font-bold tracking-wider uppercase transition-all ${
              settings.mode === m
                ? isDark ? 'bg-violet-500 text-white' : 'bg-violet-500 text-white'
                : isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
            {m}
          </button>
        ))}
      </div>

      {settings.mode === 'dashed' && (
        <div className={`space-y-3 rounded-xl p-3 ${isDark ? 'bg-[#0a0a14] border border-[#1a1a2e]' : 'bg-zinc-50 border border-zinc-200'}`}>
          {[
            { label: 'Dash', value: settings.dashLength, key: 'dashLength' as const },
            { label: 'Gap', value: settings.gapLength, key: 'gapLength' as const },
          ].map((s) => (
            <div key={s.key}>
              <div className="flex justify-between mb-1">
                <span className={`text-[9px] uppercase font-semibold ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.label}</span>
                <span className={`text-xs font-mono font-bold ${isDark ? 'text-violet-400' : 'text-violet-600'}`}>{s.value}cm</span>
              </div>
              <input type="range" min="10" max="200" value={s.value}
                onChange={(e) => update({ [s.key]: Number(e.target.value) })}
                className={`w-full h-1.5 rounded-full appearance-none cursor-pointer ${isDark ? 'bg-[#1a1a2e]' : 'bg-zinc-200'}`} />
            </div>
          ))}
          <svg width="100%" height="16" className="mt-2">
            <defs>
              <pattern id="dp" x="0" y="0" width={settings.dashLength + settings.gapLength} height="16" patternUnits="userSpaceOnUse">
                <rect x="0" y="3" width={settings.dashLength} height="10" fill={isDark ? '#8b5cf6' : '#7c3aed'} rx="2" />
              </pattern>
            </defs>
            <rect width="100%" height="16" fill="url(#dp)" />
          </svg>
        </div>
      )}

      <div className={`flex items-center gap-2 mt-3 p-2.5 rounded-xl ${isDark ? 'bg-[#0a0a14]' : 'bg-zinc-50'}`}>
        <div className={`w-2 h-2 rounded-full ${settings.isActive ? 'bg-violet-400 animate-pulse' : isDark ? 'bg-zinc-700' : 'bg-zinc-300'}`} />
        <span className={`text-[11px] ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          {settings.isActive ? `Painting ${settings.mode} lines` : 'Standby'}
        </span>
      </div>
    </div>
  );
}
