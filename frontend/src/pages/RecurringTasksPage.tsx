import { useState } from 'react';
import { Repeat, Plus, Clock, Trash2, Play } from 'lucide-react';
import type { BrainStatus, RecurringTask } from '../api/types';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

interface RecurringTasksPageProps {
  brains: BrainStatus[];
  recurringTasks: RecurringTask[];
  loading: boolean;
  onCreateRecurring: (data: {
    brainId: string;
    title: string;
    description?: string;
    scheduleType: 'INTERVAL' | 'HOURLY' | 'DAILY' | 'WEEKLY';
    intervalMinutes?: number;
  }) => Promise<void>;
  onDeleteRecurring: (id: string) => void;
  onRunRecurring: (id: string) => void;
}

export function RecurringTasksPage({
  brains,
  recurringTasks,
  loading,
  onCreateRecurring,
  onDeleteRecurring,
  onRunRecurring,
}: RecurringTasksPageProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTask, setNewTask] = useState<{
    brainId: string;
    title: string;
    description: string;
    scheduleType: 'INTERVAL' | 'HOURLY' | 'DAILY' | 'WEEKLY';
    intervalMinutes: number;
  }>({
    brainId: '',
    title: '',
    description: '',
    scheduleType: 'DAILY',
    intervalMinutes: 60,
  });

  const handleCreate = async () => {
    if (!newTask.brainId || !newTask.title) return;
    await onCreateRecurring(newTask);
    setIsAddOpen(false);
    setNewTask({
      brainId: '',
      title: '',
      description: '',
      scheduleType: 'DAILY',
      intervalMinutes: 60,
    });
  };

  const getBrainName = (brainId: string) => {
    return brains.find((b) => b.id === brainId)?.name || brainId;
  };

  const formatSchedule = (task: RecurringTask) => {
    switch (task.scheduleType) {
      case 'INTERVAL':
        return `Every ${task.intervalMs ? Math.round(task.intervalMs / 60000) : '?'} minutes`;
      case 'HOURLY':
        return 'Hourly';
      case 'DAILY':
        return 'Daily';
      case 'WEEKLY':
        return 'Weekly';
      default:
        return task.scheduleType;
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Repeat className="w-8 h-8 text-purple-400" />
            Recurring Tasks
          </h1>
          <p className="text-muted-foreground">
            Configure scheduled tasks that create instances in the execution stream
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Recurring Task
        </Button>
      </header>

      {/* Task List */}
      <Card>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading...</div>
          ) : recurringTasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Repeat className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>No recurring tasks configured</p>
              <p className="text-sm mt-2">
                Add a recurring task to automatically create task instances on a schedule
              </p>
            </div>
          ) : (
            recurringTasks.map((task) => (
              <div
                key={task.id}
                className="p-4 rounded-lg border border-border bg-secondary/20 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{task.title}</h4>
                    <Badge variant={task.enabled ? 'success' : 'default'}>
                      {task.enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {getBrainName(task.brainId)} · {formatSchedule(task)}
                  </p>
                  {task.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {task.description}
                    </p>
                  )}
                  {task.nextRunAt && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Next run: {new Date(task.nextRunAt).toLocaleString()}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onRunRecurring(task.id)}
                    className="p-2"
                    title="Run now"
                  >
                    <Play className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => onDeleteRecurring(task.id)}
                    className="p-2"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Add Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Recurring Task"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Brain</label>
            <select
              value={newTask.brainId}
              onChange={(e) => setNewTask({ ...newTask, brainId: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary"
            >
              <option value="">Select a brain...</option>
              {brains.map((brain) => (
                <option key={brain.id} value={brain.id}>
                  {brain.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder="Task title"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description (optional)</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder="Task description"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Schedule</label>
            <select
              value={newTask.scheduleType}
              onChange={(e) =>
                setNewTask({
                  ...newTask,
                  scheduleType: e.target.value as typeof newTask.scheduleType,
                })
              }
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary"
            >
              <option value="HOURLY">Hourly</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="INTERVAL">Custom Interval</option>
            </select>
          </div>

          {newTask.scheduleType === 'INTERVAL' && (
            <div>
              <label className="text-sm font-medium">Interval (minutes)</label>
              <Input
                type="number"
                value={newTask.intervalMinutes}
                onChange={(e) =>
                  setNewTask({
                    ...newTask,
                    intervalMinutes: parseInt(e.target.value) || 60,
                  })
                }
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsAddOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} className="flex-1">
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
