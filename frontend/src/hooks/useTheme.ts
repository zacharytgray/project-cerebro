import { useEffect } from 'react';

export type Theme = 'dark';
export type ThemeMode = 'dark';

export function useTheme() {
  const theme: Theme = 'dark';
  const mode: ThemeMode = 'dark';

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    root.classList.add('dark');
    body.classList.add('dark');
    localStorage.setItem('cerebro-theme', 'dark');
  }, []);

  const toggleTheme = () => {
    // Dark mode locked intentionally.
  };

  return {
    theme,
    mode,
    toggleTheme,
  };
}
