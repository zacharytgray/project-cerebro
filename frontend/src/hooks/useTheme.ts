import { useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';
export type ThemeSource = 'system' | 'manual';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [themeSource, setThemeSource] = useState<ThemeSource>('system');

  useEffect(() => {
    const stored = localStorage.getItem('cerebro-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (stored === 'light' || stored === 'dark') {
      setThemeSource('manual');
      setTheme(stored);
    } else {
      setThemeSource('system');
      setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (themeSource === 'system') {
        setTheme(e.matches ? 'dark' : 'light');
      }
    };

    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, [themeSource]);

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    if (theme === 'dark') {
      root.classList.add('dark');
      body.classList.add('dark');
    } else {
      root.classList.remove('dark');
      body.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    setThemeSource('manual');
    localStorage.setItem('cerebro-theme', newTheme);
  };

  return {
    theme,
    themeSource,
    toggleTheme,
  };
}
