import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { RecurringTask } from '../api/types';
import { usePolling } from './usePolling';

export function useRecurring() {
  const [recurringTasks, setRecurringTasks] = useState<RecurringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await api.getRecurringTasks();
      setRecurringTasks(data.recurringTasks || []);
      setError(null);
    } catch (e) {
      setError(e as Error);
      console.error('Failed to fetch recurring tasks:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetch);

  const createRecurringTask = useCallback(
    async (taskData: {
      brainId: string;
      title: string;
      description?: string;
      modelOverride?: string;
      scheduleType: 'INTERVAL' | 'HOURLY' | 'DAILY' | 'WEEKLY';
      intervalMinutes?: number;
      scheduleConfig?: Record<string, unknown>;
    }) => {
      try {
        await api.createRecurringTask(taskData);
        await fetch();
      } catch (e) {
        console.error('Failed to create recurring task:', e);
        throw e;
      }
    },
    [fetch]
  );

  const updateRecurringTask = useCallback(
    async (
      id: string,
      taskData: {
        brainId?: string;
        title?: string;
        description?: string;
        modelOverride?: string;
        scheduleType?: 'INTERVAL' | 'HOURLY' | 'DAILY' | 'WEEKLY';
        intervalMinutes?: number;
        scheduleConfig?: Record<string, unknown>;
      }
    ) => {
      try {
        console.log('Updating recurring task:', id, taskData);
        await api.updateRecurringTask(id, taskData);
        console.log('Update successful, refreshing...');
        await fetch();
      } catch (e) {
        console.error('Failed to update recurring task:', e);
        throw e;
      }
    },
    [fetch]
  );

  const toggleRecurringTask = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        await api.toggleRecurringTask(id, enabled);
        await fetch();
      } catch (e) {
        console.error('Failed to toggle recurring task:', e);
      }
    },
    [fetch]
  );

  const runRecurringTask = useCallback(
    async (id: string) => {
      try {
        await api.runRecurringTask(id);
        await fetch();
      } catch (e) {
        console.error('Failed to run recurring task:', e);
      }
    },
    [fetch]
  );

  const deleteRecurringTask = useCallback(
    async (id: string) => {
      try {
        await api.deleteRecurringTask(id);
        await fetch();
      } catch (e) {
        console.error('Failed to delete recurring task:', e);
      }
    },
    [fetch]
  );

  return {
    recurringTasks,
    loading,
    error,
    createRecurringTask,
    updateRecurringTask,
    toggleRecurringTask,
    runRecurringTask,
    deleteRecurringTask,
    refetch: fetch,
  };
}
