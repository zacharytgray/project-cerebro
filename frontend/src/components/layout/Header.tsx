import { Sun, Moon, Menu } from 'lucide-react';
import { Button } from '../ui/Button';

interface HeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onToggleSidebar?: () => void;
}

export function Header({ theme, onToggleTheme, onToggleSidebar }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b border-border backdrop-blur-xl bg-background/50">
      <div className="flex items-center gap-3">
        {onToggleSidebar && (
          <Button variant="ghost" size="sm" onClick={onToggleSidebar} className="lg:hidden">
            <Menu className="w-5 h-5" />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleTheme}
          className="flex items-center gap-2"
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4" />
              <span className="hidden sm:inline">Light</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4" />
              <span className="hidden sm:inline">Dark</span>
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
