import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string;
}

export function Input({ className, ...props }: InputProps) {
  return (
    <input
      className={cn(
        'w-full mt-1 px-3 py-2 rounded-xl border border-white/55 dark:border-white/10 bg-white/62 dark:bg-white/5 backdrop-blur-md',
        'shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
        'focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400/50',
        className
      )}
      {...props}
    />
  );
}
