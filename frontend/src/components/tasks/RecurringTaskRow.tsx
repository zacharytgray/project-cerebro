import { Power, PowerOff, Play, Trash2 } from 'lucide-react';
import type { RecurringTask } from '../../api/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { cn } from '../../utils/cn';
import { motion } from 'framer-motion';

interface RecurringTaskRowProps {
  task: RecurringTask;
  brainName: string;
  scheduleText: string;
  onClick: (task: RecurringTask) => void;
  onToggle: (id: string, enabled: boolean) => void;
  onRun: (id: string) => void;
  onDelete: (id: string) => void;
}

export function RecurringTaskRow({
  task,
  brainName,
  scheduleText,
  onClick,
  onToggle,
  onRun,
  onDelete,
}: RecurringTaskRowProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6, height: 0, marginTop: 0, marginBottom: 0, paddingTop: 0, paddingBottom: 0 }}
      transition={{ duration: 0.1, ease: 'easeOut' }}
      className={cn(
        'p-5 rounded-2xl',
        'bg-white/90 dark:bg-slate-950/26',
        'border border-white/80 dark:border-white/10',
        'text-foreground supports-[backdrop-filter]:bg-white/80 dark:supports-[backdrop-filter]:bg-slate-950/20',
        'shadow-[0_10px_28px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.3)] dark:shadow-[0_14px_36px_rgba(2,6,23,0.28),inset_0_1px_0_rgba(255,255,255,0.04)]',
        'transition-[transform,box-shadow,background-color] duration-150 hover:-translate-y-0.5 hover:shadow-[0_12px_30px_rgba(15,23,42,0.10)] dark:hover:shadow-[0_16px_38px_rgba(2,6,23,0.32)]',
        'cursor-pointer'
      )}
      onClick={() => onClick(task)}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold break-words">{task.title}</h4>
          <p className="text-xs text-muted-foreground mt-1 break-words">
            {brainName} · {scheduleText}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end w-full sm:w-auto" onClick={(e) => e.stopPropagation()}>
          <Badge variant={task.enabled ? 'success' : 'default'} className="shrink-0">
            {task.enabled ? 'ON' : 'OFF'}
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggle(task.id, !task.enabled)}
            className={cn(
              'p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10',
              // Make icon readable in light mode (green/red need to be darker than -300)
              task.enabled
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            )}
            title={task.enabled ? 'Disable' : 'Enable'}
          >
            {task.enabled ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRun(task.id)}
            className="p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
            title="Run now"
          >
            <Play className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(task.id)}
            className="p-2 rounded-full bg-black/5 hover:bg-red-500/10 text-red-500 dark:bg-white/5 dark:text-red-300"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
