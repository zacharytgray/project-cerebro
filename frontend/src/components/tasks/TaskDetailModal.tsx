import { Trash2, AlertTriangle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import type { Task } from '../../api/types';
import { formatDateTime } from '../../utils/format';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete: (id: string) => void;
  brainName: string;
}

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onDelete,
  brainName,
}: TaskDetailModalProps) {
  if (!task) return null;

  const handleDelete = () => {
    onDelete(task.id);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Task Details">
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold text-lg">{task.title}</h3>
          <p className="text-sm text-muted-foreground">{brainName}</p>
        </div>

        {task.description && (
          <div>
            <label className="text-xs text-muted-foreground">Description</label>
            <p className="mt-1 text-sm">{task.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground">Status</label>
            <div className="mt-1">
              <Badge>{task.status}</Badge>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Created</label>
            <p className="mt-1 text-sm">{formatDateTime(task.createdAt)}</p>
          </div>
        </div>

        {task.modelOverride && (
          <div>
            <label className="text-xs text-muted-foreground">Model Override</label>
            <p className="mt-1 text-sm font-mono">{task.modelOverride}</p>
          </div>
        )}

        {/* Show error details for failed tasks */}
        {task.status === 'FAILED' && task.error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <label className="text-xs text-red-400 font-medium">Failure Reason</label>
                <p className="mt-1 text-sm text-red-300 break-words whitespace-pre-wrap font-mono text-xs">
                  {task.error}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  );
}
