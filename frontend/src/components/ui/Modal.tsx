import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/45 backdrop-blur-md">
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={cn(
              'relative bg-white/72 dark:bg-slate-950/42',
              'text-foreground border border-white/60 dark:border-white/10',
              'rounded-3xl w-full max-w-md',
              'max-h-[calc(100vh-2rem)] flex flex-col',
              'shadow-[0_25px_80px_rgba(15,23,42,0.18),inset_0_1px_0_rgba(255,255,255,0.45)] dark:shadow-[0_24px_80px_rgba(2,6,23,0.55),inset_0_1px_0_rgba(255,255,255,0.05)] overflow-hidden',
              'backdrop-blur-2xl',
              className
            )}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.14),transparent_26%),radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.12),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.12),transparent_35%)] pointer-events-none" />
            <div className="relative p-6 border-b border-white/45 dark:border-white/10 flex justify-between items-center">
              <h2 className="text-xl font-bold">{title}</h2>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors text-xl w-8 h-8 flex items-center justify-center"
              >
                ✕
              </button>
            </div>
            <div className="relative p-6 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
