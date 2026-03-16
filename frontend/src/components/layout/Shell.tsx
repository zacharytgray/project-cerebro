import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { DashboardBackdrop } from '../dashboard/DashboardBackdrop';
import { cn } from '../../utils/cn';
import type { BrainStatus } from '../../api/types';

interface ShellProps {
  brains: BrainStatus[];
  currentView: 'dashboard' | 'brain-detail' | 'job-applications' | 'job-profile' | 'spec-site-engine';
  selectedBrainId: string | null;
  onNavigate: (view: 'dashboard' | 'brain-detail' | 'job-applications' | 'job-profile' | 'spec-site-engine', brainId?: string) => void;
  theme: 'light' | 'dark';
  mode: 'dark';
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
          ? 'h-screen overflow-hidden bg-slate-950/20 text-foreground'
          : 'h-screen overflow-hidden bg-white/10 text-foreground'
      }
    >
      <div className="relative h-screen overflow-hidden">
        <DashboardBackdrop />
        {/* Global nav toggle: always visible/clickable on every device */}
        <button
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          onClick={() => setSidebarOpen((v) => !v)}
          className={cn(
            'fixed top-3 z-50 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 dark:border-white/8 bg-black/40 dark:bg-slate-950/86 text-white backdrop-blur hover:bg-black/55 dark:hover:bg-slate-950 transition-[left,transform] duration-300',
            sidebarOpen ? 'left-[calc(16rem-2.75rem)] md:left-[calc(16rem-2.75rem)]' : 'left-3'
          )}
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
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className={cn('flex-1 min-w-0 flex flex-col h-screen transition-[margin] duration-300', sidebarOpen ? 'md:ml-64' : 'md:ml-0')}>
          <Header
            mode={mode}
            onToggleTheme={onToggleTheme}
          />

          <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
