import { cn } from '../../utils/cn';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600/95 hover:bg-blue-500 text-white shadow-[0_10px_30px_rgba(37,99,235,0.28)]',
    secondary: 'border border-white/50 dark:border-white/10 bg-white/55 hover:bg-white/75 dark:bg-white/5 dark:hover:bg-white/10 text-foreground backdrop-blur-md',
    ghost: 'hover:bg-white/55 dark:hover:bg-white/10 text-foreground backdrop-blur-md',
    danger: 'bg-red-600/95 hover:bg-red-500 text-white shadow-[0_10px_30px_rgba(220,38,38,0.2)]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={cn(
        'rounded transition-all duration-200',
        'hover:shadow-md hover:scale-102',
        'active:scale-95',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
