import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { BrainStatus } from '../../api/types';

interface ShellProps {
  brains: BrainStatus[];
  currentView: 'dashboard' | 'brain-detail';
  selectedBrainId: string | null;
  onNavigate: (view: 'dashboard' | 'brain-detail', brainId?: string) => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  children: React.ReactNode;
}

export function Shell({
  brains,
  currentView,
  selectedBrainId,
  onNavigate,
  theme,
  onToggleTheme,
  children,
}: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0e14] via-[#0d111c] to-[#0a0f1a] dark:from-[#0b0e14] dark:via-[#0d111c] dark:to-[#0a0f1a] text-foreground">
      <div className="flex min-h-screen">
        <Sidebar
          brains={brains}
          currentView={currentView}
          selectedBrainId={selectedBrainId}
          onNavigate={onNavigate}
          isOpen={sidebarOpen}
          theme={theme}
        />

        <div className="flex-1 flex flex-col min-h-screen">
          <Header
            theme={theme}
            onToggleTheme={onToggleTheme}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
          
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
