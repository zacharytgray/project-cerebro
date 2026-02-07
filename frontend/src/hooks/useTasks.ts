import { useState, useCallback } from 'react';
import { api } from '../api/client';
import type { Task } from '../api/types';
import { usePolling } from './usePolling';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      const data = await api.getTasks();
      setTasks(data.tasks || []);
      setError(null);
    } catch (e) {
      setError(e as Error);
      console.error('Failed to fetch tasks:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  usePolling(fetch);

  const createTask = useCallback(
    async (taskData: {
      brainId: string;
      title: string;
      description?: string;
      modelOverride?: string;
    }) => {
      try {
        await api.createTask(taskData);
        await fetch();
      } catch (e) {
        console.error('Failed to create task:', e);
        throw e;
      }
    },
    [fetch]
  );

  const deleteTask = useCallback(
    async (id: string) => {
      try {
        await api.deleteTask(id);
        await fetch();
      } catch (e) {
        console.error('Failed to delete task:', e);
      }
    },
    [fetch]
  );

  const executeTask = useCallback(
    async (id: string) => {
      try {
        await api.executeTask(id);
        // Wait a bit then refresh to see status change
        setTimeout(fetch, 1000);
      } catch (e) {
        console.error('Failed to execute task:', e);
      }
    },
    [fetch]
  );

  const clearAllTasks = useCallback(async () => {
    try {
      await api.clearAllTasks();
      await fetch();
    } catch (e) {
      console.error('Failed to clear tasks:', e);
    }
  }, [fetch]);

  const updateTask = useCallback(
    async (
      id: string,
      data: {
        brainId?: string;
        title?: string;
        description?: string;
        modelOverride?: string;
      }
    ) => {
      try {
        await api.updateTask(id, data);
        await fetch();
      } catch (e) {
        console.error('Failed to update task:', e);
        throw e;
      }
    },
    [fetch]
  );

  return {
    tasks,
    loading,
    error,
    createTask,
    deleteTask,
    executeTask,
    updateTask,
    clearAllTasks,
    refetch: fetch,
  };
}
