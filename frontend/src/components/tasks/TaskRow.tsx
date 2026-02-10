import { formatRelativeTime } from '../../utils/format';
import type { Task } from '../../api/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { motion } from 'framer-motion';
import { Play, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';

interface TaskRowProps {
  task: Task;
  brainName: string;
  onClick: (task: Task) => void;
  onExecute?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskRow({ task, brainName, onClick, onExecute, onDelete }: TaskRowProps) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'FAILED':
        return 'error';
      case 'EXECUTING':
        return 'info';
      default:
        return 'warning';
    }
  };

  const canExecute = task.status === 'READY';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'p-5 rounded-xl border border-border',
        'bg-secondary/20 hover:bg-secondary/35',
        'transition-all duration-200 hover:shadow-md',
        'group'
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onClick(task)}>
          <h4 className="text-base font-semibold truncate">{task.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {brainName} · {formatRelativeTime(task.createdAt)}
          </p>
        </div>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Badge variant={getStatusVariant(task.status)} className="shrink-0">
            {task.status}
          </Badge>

          {/* Run now (only for READY tasks) */}
          {canExecute && onExecute && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onExecute(task.id)}
              className="p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10"
              title="Run now"
            >
              <Play className="w-4 h-4" />
            </Button>
          )}

          {/* Delete */}
          {onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(task.id)}
              className="p-2 rounded-full bg-black/5 hover:bg-red-500/10 text-red-500 dark:bg-white/5 dark:text-red-300"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
