import { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface ConnectionPageProps {
  onConnect?: () => void;
}

export default function ConnectionPage({ onConnect }: ConnectionPageProps) {
  const { isDark } = useTheme();
  const [ipAddress, setIpAddress] = useState('192.168.1.100');
  const [port, setPort] = useState('8080');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(false);

  const handleConnect = () => {
    setIsConnecting(true);
    setError(false);

    setTimeout(() => {
      setIsConnecting(false);
      if (onConnect) onConnect();
    }, 1500);
  };

  return (
    <div className={`flex items-center justify-center min-h-full p-4 ${
      isDark ? 'bg-[#0a0a0f]' : 'bg-[#f5f2ec]'
    }`}>
      {/* Background glow */}
      <div className={`fixed w-[500px] h-[500px] rounded-full blur-[120px] opacity-20 pointer-events-none ${
        isDark ? 'bg-cyan-500' : 'bg-emerald-300'
      }`} style={{ top: '30%', left: '50%', transform: 'translate(-50%, -50%)' }} />

      <div className={`w-full max-w-[420px] rounded-3xl p-8 space-y-6 relative transition-theme ${
        isDark
          ? 'bg-[#12121c] border border-[#1e1e32] shadow-2xl shadow-black/40'
          : 'bg-white border border-[#e0ddd5] shadow-xl shadow-zinc-200/50'
      }`}>
        {/* Header */}
        <div className="text-center space-y-3">
          <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl ${
            isDark
              ? 'bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-500/20'
              : 'bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200'
          }`}>
            📡
          </div>
          <div>
            <h2 className={`text-xl font-bold font-['Space_Grotesk',sans-serif] tracking-tight ${
              isDark ? 'text-white' : 'text-zinc-800'
            }`}>
              System Link
            </h2>
            <p className={`text-sm mt-1 ${isDark ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Establish telemetry connection to hardware unit
            </p>
          </div>
        </div>

        {/* Status */}
        <div className={`flex items-center justify-center gap-2 py-3 rounded-2xl ${
          isConnecting
            ? isDark ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-amber-50 border border-amber-200'
            : isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            isConnecting ? 'bg-amber-400 animate-pulse' : 'bg-red-400'
          }`} />
          <span className={`text-[11px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] ${
            isConnecting
              ? isDark ? 'text-amber-400' : 'text-amber-600'
              : isDark ? 'text-red-400' : 'text-red-500'
          }`}>
            {isConnecting ? 'CONNECTING...' : 'DISCONNECTED'}
          </span>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className={`text-[10px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              Raspberry Pi IP Address
            </label>
            <div className="relative">
              <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-sm ${
                isDark ? 'text-zinc-600' : 'text-zinc-300'
              }`}>
                🌐
              </span>
              <input
                type="text"
                value={ipAddress}
                onChange={(e) => setIpAddress(e.target.value)}
                className={`w-full pl-10 pr-4 py-3.5 rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                  isDark
                    ? 'bg-[#0a0a14] border border-[#1e1e32] text-zinc-300 focus:ring-cyan-500/40 focus:border-cyan-500/40'
                    : 'bg-zinc-50 border border-zinc-200 text-zinc-700 focus:ring-emerald-500/40 focus:border-emerald-400'
                }`}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className={`text-[10px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              Port
            </label>
            <input
              type="text"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              className={`w-full px-4 py-3.5 rounded-2xl text-sm font-mono focus:outline-none focus:ring-2 transition-all ${
                isDark
                  ? 'bg-[#0a0a14] border border-[#1e1e32] text-zinc-300 focus:ring-cyan-500/40 focus:border-cyan-500/40'
                  : 'bg-zinc-50 border border-zinc-200 text-zinc-700 focus:ring-emerald-500/40 focus:border-emerald-400'
              }`}
            />
          </div>
        </div>

        {/* Connect Button */}
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className={`w-full py-4 rounded-2xl font-semibold text-[12px] tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:hover:scale-100 ${
            isDark
              ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-black shadow-lg shadow-cyan-500/20'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/20'
          }`}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
          {isConnecting ? 'ESTABLISHING LINK...' : 'CONNECT SYSTEM'}
        </button>

        {error && (
          <div className={`flex items-center justify-center gap-2 text-sm ${
            isDark ? 'text-red-400' : 'text-red-500'
          }`}>
            <span>⚠️</span>
            <span className="font-['Space_Grotesk',sans-serif]">Connection Failed: IP Timeout</span>
          </div>
        )}
      </div>
    </div>
  );
}
