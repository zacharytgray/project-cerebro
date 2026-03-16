interface HeaderProps {
  mode: 'dark';
  onToggleTheme: () => void;
}

export function Header({ mode: _mode, onToggleTheme: _onToggleTheme }: HeaderProps) {
  return (
    <header className="flex items-center justify-between p-4 border-b border-transparent backdrop-blur-2xl bg-slate-950/88 shadow-none">
      <div />
      <div />
    </header>
  );
}
