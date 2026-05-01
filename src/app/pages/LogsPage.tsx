import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogEntry {
  id: number;
  timestamp: Date;
  level: LogLevel;
  source: string;
  message: string;
}

const SOURCES = ['MOTOR', 'GPS', 'IMU', 'CAMERA', 'PID', 'PAINT', 'SYSTEM', 'SERIAL'];
const MESSAGES: Record<LogLevel, string[]> = {
  info: ['Connection established', 'Telemetry update received', 'Mode switched', 'Calibration complete', 'GPS fix acquired', 'Paint system ready'],
  warn: ['Low battery: 15%', 'GPS accuracy degraded', 'High CPU temperature', 'Paint level low', 'Signal strength weak', 'Motor current spike'],
  error: ['Serial timeout', 'IMU read failure', 'Connection lost', 'Motor stall detected', 'GPS fix lost'],
  debug: ['Heartbeat OK', 'PID loop 2.1ms', 'Encoder tick: 4502', 'Frame processed 33ms', 'Buffer flush OK'],
};

export default function LogsPage() {
  const { isDark } = useTheme();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Add initial logs
    const initial: LogEntry[] = [];
    for (let i = 0; i < 10; i++) {
      const level: LogLevel = (['info', 'debug', 'info', 'warn', 'info', 'debug', 'info', 'info', 'debug', 'info'] as LogLevel[])[i];
      initial.push({
        id: i,
        timestamp: new Date(Date.now() - (10 - i) * 3000),
        level,
        source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
        message: MESSAGES[level][Math.floor(Math.random() * MESSAGES[level].length)],
      });
    }
    setLogs(initial);

    const interval = setInterval(() => {
      const levels: LogLevel[] = ['info', 'info', 'info', 'debug', 'debug', 'warn', 'error'];
      const level = levels[Math.floor(Math.random() * levels.length)];
      setLogs((prev) => [...prev.slice(-200), {
        id: Date.now(),
        timestamp: new Date(),
        level,
        source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
        message: MESSAGES[level][Math.floor(Math.random() * MESSAGES[level].length)],
      }]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const filteredLogs = filter === 'all' ? logs : logs.filter((l) => l.level === filter);

  const levelColors: Record<LogLevel, { text: string; bg: string; dot: string }> = {
    info: {
      text: isDark ? 'text-cyan-400' : 'text-cyan-600',
      bg: isDark ? 'bg-cyan-500/10' : 'bg-cyan-50',
      dot: 'bg-cyan-400',
    },
    warn: {
      text: isDark ? 'text-amber-400' : 'text-amber-600',
      bg: isDark ? 'bg-amber-500/10' : 'bg-amber-50',
      dot: 'bg-amber-400',
    },
    error: {
      text: isDark ? 'text-red-400' : 'text-red-500',
      bg: isDark ? 'bg-red-500/10' : 'bg-red-50',
      dot: 'bg-red-400',
    },
    debug: {
      text: isDark ? 'text-zinc-500' : 'text-zinc-400',
      bg: isDark ? 'bg-zinc-500/5' : 'bg-zinc-50',
      dot: isDark ? 'bg-zinc-600' : 'bg-zinc-300',
    },
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filter Bar */}
      <div className={`shrink-0 p-3 border-b transition-theme ${
        isDark ? 'bg-[#0d0d14] border-[#1a1a2e]' : 'bg-white border-[#e0ddd5]'
      }`}>
        <div className="flex items-center justify-between mb-2">
          <div className={`text-[10px] font-semibold tracking-[1.5px] uppercase font-['Space_Grotesk',sans-serif] ${
            isDark ? 'text-zinc-500' : 'text-zinc-400'
          }`}>
            SYSTEM LOGS
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setAutoScroll(!autoScroll)}
              className={`text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg ${
                autoScroll
                  ? isDark ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-50 text-emerald-600'
                  : isDark ? 'bg-[#1a1a2e] text-zinc-600' : 'bg-zinc-100 text-zinc-400'
              }`}>
              {autoScroll ? '⬇ AUTO' : '⏸ PAUSED'}
            </button>
            <button onClick={() => setLogs([])}
              className={`text-[9px] font-bold tracking-wider uppercase px-2.5 py-1 rounded-lg ${
                isDark ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-500'
              }`}>
              CLEAR
            </button>
          </div>
        </div>

        <div className={`flex rounded-full p-0.5 gap-0.5 ${isDark ? 'bg-[#1a1a2e]' : 'bg-zinc-100'}`}>
          {(['all', 'info', 'warn', 'error', 'debug'] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-1 py-1.5 rounded-full text-[9px] font-bold tracking-wider uppercase transition-all ${
                filter === f
                  ? isDark ? 'bg-[#252540] text-white' : 'bg-white text-zinc-700 shadow-sm'
                  : isDark ? 'text-zinc-600' : 'text-zinc-400'
              }`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Log Entries */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1">
        {filteredLogs.map((log) => {
          const colors = levelColors[log.level];
          return (
            <div key={log.id} className={`flex items-start gap-2 rounded-lg px-3 py-2 ${colors.bg} animate-fade-in-up`}>
              <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${colors.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[9px] font-mono ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className={`text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded ${
                    isDark ? 'bg-[#1a1a2e] text-zinc-500' : 'bg-white text-zinc-500'
                  }`}>
                    {log.source}
                  </span>
                  <span className={`text-[8px] font-bold tracking-wider uppercase ${colors.text}`}>
                    {log.level.toUpperCase()}
                  </span>
                </div>
                <div className={`text-xs font-['JetBrains_Mono',monospace] ${isDark ? 'text-zinc-300' : 'text-zinc-600'}`}>
                  {log.message}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats Footer */}
      <div className={`shrink-0 px-3 py-2 border-t flex items-center justify-between ${
        isDark ? 'bg-[#0d0d14] border-[#1a1a2e]' : 'bg-white border-[#e0ddd5]'
      }`}>
        <span className={`text-[9px] font-mono ${isDark ? 'text-zinc-600' : 'text-zinc-400'}`}>
          {filteredLogs.length} entries
        </span>
        <div className="flex gap-3">
          {(['info', 'warn', 'error'] as LogLevel[]).map((l) => (
            <span key={l} className={`text-[9px] font-mono ${levelColors[l].text}`}>
              {logs.filter(lg => lg.level === l).length} {l}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
