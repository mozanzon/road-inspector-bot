import { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

interface JoystickProps {
  onMove: (data: any) => void;
  onStop: () => void;
}

export default function Joystick({ onMove, onStop }: JoystickProps) {
  const { isDark } = useTheme();
  const [JoystickComponent, setJoystickComponent] = useState<any>(null);

  useEffect(() => {
    import('react-joystick-component').then((module) => {
      setJoystickComponent(() => module.Joystick);
    }).catch(() => {});
  }, []);

  if (!JoystickComponent) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className={`relative w-[120px] h-[120px] rounded-full flex items-center justify-center border-2 ${
          isDark ? 'bg-[#1a1a2e] border-[#2a2a3e]' : 'bg-zinc-100 border-zinc-300'
        }`}>
          <div className={`w-[50px] h-[50px] rounded-full ${
            isDark ? 'bg-cyan-500/60' : 'bg-emerald-400'
          }`} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 joystick-container">
      <JoystickComponent
        size={120}
        baseColor={isDark ? '#1a1a2e' : '#e5e7eb'}
        stickColor={isDark ? '#06b6d4' : '#10b981'}
        move={onMove}
        stop={onStop}
      />
    </div>
  );
}
