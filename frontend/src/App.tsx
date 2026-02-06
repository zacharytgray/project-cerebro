import { useState } from 'react';
import { Shell } from './components/layout/Shell';
import { DashboardPage } from './pages/DashboardPage';
import { BrainDetailPage } from './pages/BrainDetailPage';
import { RecurringTasksPage } from './pages/RecurringTasksPage';
import { useBrains } from './hooks/useBrains';
import { useTasks } from './hooks/useTasks';
import { useRecurring } from './hooks/useRecurring';
import { useTheme } from './hooks/useTheme';

type View = 'dashboard' | 'brain-detail' | 'recurring-tasks';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedBrainId, setSelectedBrainId] = useState<string | null>(null);

  const { brains, loading: loadingBrains, toggleBrain, runBrain } = useBrains();
  const { tasks, loading: loadingTasks, createTask, deleteTask, executeTask } = useTasks();
  const { recurringTasks, loading: loadingRecurring, createRecurringTask, deleteRecurringTask, runRecurringTask } = useRecurring();
  const { theme, toggleTheme } = useTheme();

  const handleNavigate = (view: View, brainId?: string) => {
    setCurrentView(view);
    if (brainId) {
      setSelectedBrainId(brainId);
    }
  };

  const handleBrainClick = (brainId: string) => {
    setSelectedBrainId(brainId);
    setCurrentView('brain-detail');
  };

  const selectedBrain = selectedBrainId
    ? brains.find((b) => b.id === selectedBrainId)
    : null;

  return (
    <Shell
      brains={brains}
      currentView={currentView}
      selectedBrainId={selectedBrainId}
      onNavigate={handleNavigate}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      {currentView === 'dashboard' && (
        <DashboardPage
          brains={brains}
          tasks={tasks}
          loadingBrains={loadingBrains}
          loadingTasks={loadingTasks}
          onToggleBrain={toggleBrain}
          onRunBrain={runBrain}
          onBrainClick={handleBrainClick}
          onCreateTask={createTask}
          onCreateRecurring={createRecurringTask}
          onDeleteTask={deleteTask}
          onExecuteTask={executeTask}
        />
      )}

      {currentView === 'brain-detail' && selectedBrain && (
        <BrainDetailPage
          brain={selectedBrain}
          onBack={() => setCurrentView('dashboard')}
          onToggle={toggleBrain}
        />
      )}

      {currentView === 'recurring-tasks' && (
        <RecurringTasksPage
          brains={brains}
          recurringTasks={recurringTasks}
          loading={loadingRecurring}
          onCreateRecurring={createRecurringTask}
          onDeleteRecurring={deleteRecurringTask}
          onRunRecurring={runRecurringTask}
        />
      )}
    </Shell>
  );
}
