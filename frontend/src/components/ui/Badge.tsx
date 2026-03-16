import { cn } from '../../utils/cn';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-slate-200/95 text-slate-800 border-slate-300 dark:bg-slate-800/70 dark:text-slate-100 dark:border-slate-700',
    success: 'bg-emerald-200 text-emerald-950 border-emerald-400 dark:bg-emerald-900/45 dark:text-emerald-200 dark:border-emerald-700/70',
    warning: 'bg-amber-200 text-amber-950 border-amber-400 dark:bg-amber-900/45 dark:text-amber-200 dark:border-amber-700/70',
    error: 'bg-rose-200 text-rose-950 border-rose-400 dark:bg-rose-900/45 dark:text-rose-200 dark:border-rose-700/70',
    info: 'bg-sky-200 text-sky-950 border-sky-400 dark:bg-sky-900/45 dark:text-sky-200 dark:border-sky-700/70',
  };

  return (
    <span
      className={cn(
        'px-2 py-1 rounded text-xs font-medium border border-opacity-50',
        'transition-all duration-200',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
