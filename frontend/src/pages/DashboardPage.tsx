import { useState } from 'react';
import { Plus, Repeat, Play, Trash2 } from 'lucide-react';
import type { BrainStatus, Task, RecurringTask } from '../api/types';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { TaskStream } from '../components/tasks/TaskStream';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { GradientText } from '../components/ui/GradientText';
import { BrainCard } from '../components/brains/BrainCard';
import { Card } from '../components/ui/Card';
import { Modal } from '../components/ui/Modal';
import { Input } from '../components/ui/Input';

interface DashboardPageProps {
  brains: BrainStatus[];
  tasks: Task[];
  recurringTasks: RecurringTask[];
  loadingBrains: boolean;
  loadingTasks: boolean;
  loadingRecurring: boolean;
  onToggleBrain: (id: string, enabled: boolean) => void;
  onRunBrain: (id: string) => void;
  onBrainClick: (id: string) => void;
  onCreateTask: (taskData: any) => Promise<void>;
  onCreateRecurring: (taskData: any) => Promise<void>;
  onDeleteRecurring: (id: string) => void;
  onRunRecurring: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onExecuteTask: (id: string) => void;
}

export function DashboardPage({
  brains,
  tasks,
  recurringTasks,
  loadingTasks,
  loadingRecurring,
  onToggleBrain,
  onRunBrain,
  onBrainClick,
  onCreateTask,
  onCreateRecurring,
  onDeleteRecurring,
  onRunRecurring,
  onDeleteTask,
  onExecuteTask,
}: DashboardPageProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAddRecurringOpen, setIsAddRecurringOpen] = useState(false);
  const [newRecurring, setNewRecurring] = useState({
    brainId: '',
    title: '',
    description: '',
    scheduleType: 'DAILY' as 'DAILY' | 'HOURLY' | 'WEEKLY' | 'INTERVAL',
    intervalMinutes: 60,
  });

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const getBrainName = (brainId: string) => {
    return brains.find((b) => b.id === brainId)?.name || brainId;
  };

  // Separate Nexus from other brains
  const nexusBrain = brains.find(b => b.id === 'nexus');
  const otherBrains = brains.filter(b => b.id !== 'nexus');

  const handleCreateRecurring = async () => {
    if (!newRecurring.brainId || !newRecurring.title) return;
    await onCreateRecurring(newRecurring);
    setIsAddRecurringOpen(false);
    setNewRecurring({
      brainId: '',
      title: '',
      description: '',
      scheduleType: 'DAILY',
      intervalMinutes: 60,
    });
  };

  const formatSchedule = (task: RecurringTask) => {
    switch (task.scheduleType) {
      case 'HOURLY': return 'Hourly';
      case 'DAILY': return 'Daily';
      case 'WEEKLY': return 'Weekly';
      case 'INTERVAL': return `Every ${task.intervalMs ? Math.round(task.intervalMs / 60000) : '?'} min`;
      default: return task.scheduleType;
    }
  };

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold mb-2">
            <GradientText>Project Cerebro</GradientText>
          </h1>
          <p className="text-muted-foreground">Autonomous AI Brain Control Center</p>
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => setIsAddTaskOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </Button>
      </header>

      {/* Summary Cards */}
      <SummaryCards brains={brains} tasks={tasks} />

      {/* Main Grid: Left (Nexus + Brains) | Right (Recurring Tasks) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column - Nexus + Specialized Brains */}
        <div className="lg:col-span-2 space-y-6">
          {/* Nexus Brain */}
          <div>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              Nexus
            </h2>
            {nexusBrain && (
              <BrainCard
                brain={nexusBrain}
                onToggle={onToggleBrain}
                onRun={onRunBrain}
                onClick={onBrainClick}
              />
            )}
          </div>

          {/* Specialized Brains - 3x2 Grid */}
          <div>
            <h2 className="text-xl font-bold mb-4">Specialized Brains</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {otherBrains.map((brain) => (
                <BrainCard
                  key={brain.id}
                  brain={brain}
                  onToggle={onToggleBrain}
                  onRun={onRunBrain}
                  onClick={onBrainClick}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Recurring Tasks (stretches full height) */}
        <div className="flex flex-col h-full">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Repeat className="w-5 h-5 text-purple-400" />
            Recurring Tasks
          </h2>
          <Card className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto space-y-2 p-4 max-h-[600px]">
              {loadingRecurring ? (
                <div className="text-center text-muted-foreground py-4">Loading...</div>
              ) : recurringTasks.length === 0 ? (
                <div className="text-center text-muted-foreground py-4">
                  No recurring tasks
                </div>
              ) : (
                recurringTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-lg border border-border bg-secondary/30 text-sm"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{task.title}</span>
                      <Badge variant={task.enabled ? 'success' : 'default'}>
                        {task.enabled ? 'On' : 'Off'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {getBrainName(task.brainId)} · {formatSchedule(task)}
                    </div>
                    <div className="flex gap-1 mt-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onRunRecurring(task.id)}
                        className="p-1"
                      >
                        <Play className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => onDeleteRecurring(task.id)}
                        className="p-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-3 border-t border-border">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddRecurringOpen(true)}
                className="w-full flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Recurring
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Execution Stream */}
      <div>
        <h2 className="text-xl font-bold mb-4">Execution Stream</h2>
        <TaskStream
          tasks={tasks}
          brains={brains}
          loading={loadingTasks}
          onTaskClick={handleTaskClick}
          onExecuteTask={onExecuteTask}
          onDeleteTask={onDeleteTask}
        />
      </div>

      {/* Modals */}
      <TaskDetailModal
        task={selectedTask}
        isOpen={isTaskDetailOpen}
        onClose={() => setIsTaskDetailOpen(false)}
        onDelete={onDeleteTask}
        brainName={selectedTask ? getBrainName(selectedTask.brainId) : ''}
      />

      <AddTaskModal
        isOpen={isAddTaskOpen}
        onClose={() => setIsAddTaskOpen(false)}
        brains={brains}
        onCreateTask={onCreateTask}
        onCreateRecurring={onCreateRecurring}
      />

      {/* Add Recurring Modal */}
      <Modal
        isOpen={isAddRecurringOpen}
        onClose={() => setIsAddRecurringOpen(false)}
        title="Add Recurring Task"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Brain</label>
            <select
              value={newRecurring.brainId}
              onChange={(e) => setNewRecurring({ ...newRecurring, brainId: e.target.value })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary"
            >
              <option value="">Select brain...</option>
              {brains.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Title</label>
            <Input
              value={newRecurring.title}
              onChange={(e) => setNewRecurring({ ...newRecurring, title: e.target.value })}
              placeholder="Task title"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={newRecurring.description}
              onChange={(e) => setNewRecurring({ ...newRecurring, description: e.target.value })}
              placeholder="Task description"
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary min-h-[80px]"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Schedule</label>
            <select
              value={newRecurring.scheduleType}
              onChange={(e) => setNewRecurring({ ...newRecurring, scheduleType: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-secondary"
            >
              <option value="HOURLY">Hourly</option>
              <option value="DAILY">Daily</option>
              <option value="WEEKLY">Weekly</option>
              <option value="INTERVAL">Custom Interval</option>
            </select>
          </div>

          {newRecurring.scheduleType === 'INTERVAL' && (
            <div>
              <label className="text-sm font-medium">Interval (minutes)</label>
              <Input
                type="number"
                value={newRecurring.intervalMinutes}
                onChange={(e) => setNewRecurring({ ...newRecurring, intervalMinutes: parseInt(e.target.value) || 60 })}
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="secondary" onClick={() => setIsAddRecurringOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateRecurring} className="flex-1">
              Create
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
