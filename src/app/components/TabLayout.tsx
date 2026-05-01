import { ReactNode } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { TABS, TabId } from '../App';

interface TabLayoutProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  children: ReactNode;
}

export function TabLayout({ activeTab, onTabChange, children }: TabLayoutProps) {
  const { theme, toggleTheme, isDark } = useTheme();

  return (
    <div className={`flex flex-col h-full overflow-hidden transition-theme ${
      isDark ? 'bg-[#0a0a0f]' : 'bg-[#f5f2ec]'
    }`}>
      {/* ===== TOP HEADER ===== */}
      <header className={`shrink-0 h-[56px] flex items-center justify-between px-4 z-50 border-b transition-theme ${
        isDark 
          ? 'bg-[#0d0d14]/95 backdrop-blur-xl border-[#1a1a2e]' 
          : 'bg-white/90 backdrop-blur-xl border-[#e0ddd5]'
      }`}>
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isDark 
              ? 'bg-gradient-to-br from-cyan-500 to-emerald-500' 
              : 'bg-gradient-to-br from-emerald-500 to-teal-600'
          }`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <div>
            <div className={`text-[13px] font-bold tracking-wider font-['Space_Grotesk',sans-serif] ${
              isDark ? 'text-cyan-400' : 'text-emerald-700'
            }`}>
              ROADGUARD
            </div>
            <div className={`text-[9px] tracking-[2px] uppercase ${
              isDark ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              Paint System v2.0
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Status */}
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-semibold tracking-wider uppercase ${
            isDark 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }`}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ONLINE
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
              isDark 
                ? 'bg-[#1a1a2e] hover:bg-[#252540] text-yellow-400' 
                : 'bg-zinc-100 hover:bg-zinc-200 text-zinc-600'
            }`}
            title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
          >
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"/>
                <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ===== TAB CONTENT ===== */}
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="animate-fade-in-up h-full">
          {children}
        </div>
      </main>

      {/* ===== BOTTOM TAB BAR ===== */}
      <nav className={`shrink-0 h-[64px] flex items-center justify-around px-2 z-50 border-t transition-theme ${
        isDark 
          ? 'bg-[#0d0d14]/95 backdrop-blur-xl border-[#1a1a2e]' 
          : 'bg-white/95 backdrop-blur-xl border-[#e0ddd5]'
      }`}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 min-w-[60px] ${
                isActive
                  ? isDark
                    ? 'text-cyan-400 bg-cyan-500/10'
                    : 'text-emerald-600 bg-emerald-50'
                  : isDark
                    ? 'text-zinc-600 hover:text-zinc-400 hover:bg-[#1a1a2e]'
                    : 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              <span className="text-[16px] leading-none">{tab.icon}</span>
              <span className={`text-[9px] font-semibold tracking-wider uppercase font-['Space_Grotesk',sans-serif] ${
                isActive ? '' : 'opacity-70'
              }`}>
                {tab.label}
              </span>
              {isActive && (
                <div className={`w-4 h-0.5 rounded-full mt-0.5 ${
                  isDark ? 'bg-cyan-400' : 'bg-emerald-500'
                }`} />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
