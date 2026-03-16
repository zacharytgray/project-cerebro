import { cn } from '../../utils/cn';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
}

export function Card({
  children,
  className,
  onClick,
  draggable,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragEnter,
  onDragLeave,
  onDrop,
}: CardProps) {
  return (
    <div
      className={cn(
        'bg-white/88 dark:bg-slate-950/38',
        'border border-white/80 dark:border-white/10',
        'text-foreground rounded-2xl p-6',
        'shadow-[0_18px_50px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.65)] dark:shadow-[0_20px_60px_rgba(2,6,23,0.45),inset_0_1px_0_rgba(255,255,255,0.06)]',
        'backdrop-blur-xl supports-[backdrop-filter]:bg-white/78 dark:supports-[backdrop-filter]:bg-slate-950/28',
        'transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-lg hover:-translate-y-0.5',
        className
      )}
      draggable={draggable}
      onClick={onClick}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {children}
    </div>
  );
}
