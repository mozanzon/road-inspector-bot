import { createContext, useContext, useState, ReactNode } from 'react';

type ControlMode = 'auto' | 'manual';

interface ControlModeContextType {
  mode: ControlMode;
  setMode: (mode: ControlMode) => void;
}

const ControlModeContext = createContext<ControlModeContextType | undefined>(undefined);

export function ControlModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ControlMode>('manual');

  const value = { mode, setMode };

  return (
    <ControlModeContext.Provider value={value}>
      {children}
    </ControlModeContext.Provider>
  );
}

export function useControlMode() {
  const context = useContext(ControlModeContext);
  if (!context) {
    throw new Error('useControlMode must be used within ControlModeProvider');
  }
  return context;
}
