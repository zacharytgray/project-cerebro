import { formatRelativeTime } from '../../utils/format';
import type { Task } from '../../api/types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { motion } from 'framer-motion';
import { Play, Trash2 } from 'lucide-react';

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
      className="p-4 rounded-lg border border-border bg-secondary/20 hover:bg-secondary/40 transition-all duration-200 hover:shadow-md group"
    >
      <div className="flex items-start justify-between gap-3">
        <div 
          className="flex-1 min-w-0 cursor-pointer"
          onClick={() => onClick(task)}
        >
          <h4 className="font-medium truncate">{task.title}</h4>
          <p className="text-xs text-muted-foreground mt-1">
            {brainName} · {formatRelativeTime(task.createdAt)}
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Badge variant={getStatusVariant(task.status)}>{task.status}</Badge>
          
          {/* Execute button - only for READY tasks */}
          {canExecute && onExecute && (
            <Button
              variant="primary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onExecute(task.id);
              }}
              className="p-1.5"
              title="Execute task now"
            >
              <Play className="w-3.5 h-3.5" />
            </Button>
          )}
          
          {/* Delete button */}
          {onDelete && (
            <Button
              variant="danger"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              title="Delete task"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
      
      {task.description && (
        <p 
          className="text-sm text-muted-foreground mt-2 line-clamp-2 cursor-pointer"
          onClick={() => onClick(task)}
        >
          {task.description}
        </p>
      )}
    </motion.div>
  );
}
