import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { BrainStatus, Task } from '../api/types';
import { SummaryCards } from '../components/dashboard/SummaryCards';
import { FileIngestion } from '../components/dashboard/FileIngestion';
import { BrainGrid } from '../components/brains/BrainGrid';
import { TaskStream } from '../components/tasks/TaskStream';
import { TaskDetailModal } from '../components/tasks/TaskDetailModal';
import { AddTaskModal } from '../components/tasks/AddTaskModal';
import { Button } from '../components/ui/Button';
import { GradientText } from '../components/ui/GradientText';

interface DashboardPageProps {
  brains: BrainStatus[];
  tasks: Task[];
  loadingBrains: boolean;
  loadingTasks: boolean;
  onToggleBrain: (id: string, enabled: boolean) => void;
  onRunBrain: (id: string) => void;
  onBrainClick: (id: string) => void;
  onCreateTask: (taskData: any) => Promise<void>;
  onCreateRecurring: (taskData: any) => Promise<void>;
  onDeleteTask: (id: string) => void;
  onExecuteTask: (id: string) => void;
}

export function DashboardPage({
  brains,
  tasks,
  loadingBrains,
  loadingTasks,
  onToggleBrain,
  onRunBrain,
  onBrainClick,
  onCreateTask,
  onCreateRecurring,
  onDeleteTask,
  onExecuteTask,
}: DashboardPageProps) {
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isTaskDetailOpen, setIsTaskDetailOpen] = useState(false);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setIsTaskDetailOpen(true);
  };

  const getBrainName = (brainId: string) => {
    return brains.find((b) => b.id === brainId)?.name || brainId;
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

      {/* Brain Grid */}
      <div>
        <h2 className="text-2xl font-bold mb-6">Brain Status</h2>
        <BrainGrid
          brains={brains}
          loading={loadingBrains}
          onToggle={onToggleBrain}
          onRun={onRunBrain}
          onBrainClick={onBrainClick}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <TaskStream
            tasks={tasks}
            brains={brains}
            loading={loadingTasks}
            onTaskClick={handleTaskClick}
            onExecuteTask={onExecuteTask}
            onDeleteTask={onDeleteTask}
          />
        </div>

        <div>
          <FileIngestion />
        </div>
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
    </div>
  );
}
