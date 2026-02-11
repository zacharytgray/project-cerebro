import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { BrainStatus } from '../../api/types';

interface ShellProps {
  brains: BrainStatus[];
  currentView: 'dashboard' | 'brain-detail' | 'job-applications' | 'job-profile';
  selectedBrainId: string | null;
  onNavigate: (view: 'dashboard' | 'brain-detail' | 'job-applications' | 'job-profile', brainId?: string) => void;
  theme: 'light' | 'dark';
  mode: 'light' | 'dark' | 'system';
  onToggleTheme: () => void;
  children: React.ReactNode;
}

export function Shell({
  brains,
  currentView,
  selectedBrainId,
  onNavigate,
  theme,
  mode,
  onToggleTheme,
  children,
}: ShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isDark = theme === 'dark';

  return (
    <div
      className={
        isDark
          ? 'h-screen overflow-hidden bg-gradient-to-br from-[#0b0e14] via-[#0d111c] to-[#0a0f1a] text-foreground'
          : 'h-screen overflow-hidden bg-gradient-to-br from-gray-100 via-gray-50 to-white text-foreground'
      }
    >
      <div className="relative h-screen overflow-hidden">
        {/* Global nav toggle: always visible/clickable on every device */}
        <button
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          onClick={() => setSidebarOpen((v) => !v)}
          className="fixed left-3 top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 bg-black/40 text-white backdrop-blur hover:bg-black/55"
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>

        <Sidebar
          brains={brains}
          currentView={currentView}
          selectedBrainId={selectedBrainId}
          onNavigate={onNavigate}
          isOpen={sidebarOpen}
          theme={theme}
        />

        {sidebarOpen && (
          <button
            aria-label="Close sidebar backdrop"
            className="fixed inset-0 z-30 bg-black/30"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex-1 min-w-0 flex flex-col h-screen">
          <Header
            mode={mode}
            onToggleTheme={onToggleTheme}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />

          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
