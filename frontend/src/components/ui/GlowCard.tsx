import { motion } from 'framer-motion';
import { cn } from '../../utils/cn';

interface GlowCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  onClick?: () => void;
  animate?: boolean;
}

export function GlowCard({
  children,
  className,
  glowColor = 'rgba(59, 130, 246, 0.3)',
  onClick,
  animate = false,
}: GlowCardProps) {
  return (
    <motion.div
      whileHover={{ y: -1 }}
      transition={{ duration: 0.1, ease: 'easeOut' }}
      className={cn(
        'bg-slate-950/46',
        'border border-white/10',
        'text-white rounded-2xl p-5',
        'backdrop-blur-xl supports-[backdrop-filter]:bg-slate-950/44',
        'shadow-[0_14px_36px_rgba(2,6,23,0.28),inset_0_1px_0_rgba(255,255,255,0.04)]',
        'transition-[transform,box-shadow,background-color] duration-150',
        'hover:shadow-[0_16px_38px_rgba(2,6,23,0.32)]',
        animate && 'animate-glow-pulse',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      style={{
        boxShadow: animate
          ? `0 0 14px ${glowColor}`
          : undefined,
      }}
    >
      {children}
    </motion.div>
  );
}
