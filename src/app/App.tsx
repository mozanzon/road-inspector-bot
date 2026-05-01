import { useState } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { ControlModeProvider } from './contexts/ControlModeContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { TabLayout } from './components/TabLayout';
import ConnectionTab from './pages/ConnectionPage';
import DashboardTab from './pages/DashboardPage';
import MapTab from './pages/MapPage';
import ControlsTab from './pages/ControlsPage';
import LogsTab from './pages/LogsPage';

export type TabId = 'connection' | 'dashboard' | 'map' | 'controls' | 'logs';

export interface TabDef {
  id: TabId;
  label: string;
  icon: string;
}

export const TABS: TabDef[] = [
  { id: 'connection', label: 'Link', icon: '📡' },
  { id: 'dashboard', label: 'Dash', icon: '📊' },
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'controls', label: 'Control', icon: '🎮' },
  { id: 'logs', label: 'Logs', icon: '📋' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('connection');

  const renderTab = () => {
    switch (activeTab) {
      case 'connection':
        return <ConnectionTab onConnect={() => setActiveTab('dashboard')} />;
      case 'dashboard':
        return <DashboardTab />;
      case 'map':
        return <MapTab />;
      case 'controls':
        return <ControlsTab />;
      case 'logs':
        return <LogsTab />;
      default:
        return <ConnectionTab onConnect={() => setActiveTab('dashboard')} />;
    }
  };

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ControlModeProvider>
          <TabLayout activeTab={activeTab} onTabChange={setActiveTab}>
            {renderTab()}
          </TabLayout>
        </ControlModeProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}