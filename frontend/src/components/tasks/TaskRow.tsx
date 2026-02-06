import { formatRelativeTime } from '../../utils/format';
import type { Task } from '../../api/types';
import { Badge } from '../ui/Badge';
import { motion } from 'framer-motion';

interface TaskRowProps {
  task: Task;
  brainName: string;
  onClick: (task: Task) => void;
}

export function TaskRow({ task, brainName, onClick }: TaskRowProps) {
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 cursor-pointer transition-all duration-200 hover:shadow-md"
      onClick={() => onClick(task)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium truncate">{task.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {brainName} · {formatRelativeTime(task.createdAt)}
          </p>
        </div>
        <Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>
      </div>
      {task.description && (
        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
          {task.description}
        </p>
      )}
    </motion.div>
  );
}
