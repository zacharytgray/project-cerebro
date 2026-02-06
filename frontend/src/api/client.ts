import type {
  StatusResponse,
  TasksResponse,
  RecurringTasksResponse,
  JobsResponse,
  ReportsResponse,
  BrainConfigResponse,
} from './types';

const API_BASE = '';

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }
  return response.json();
}

export const api = {
  // Status
  getStatus: () => fetchApi<StatusResponse>('/api/status'),

  // Tasks
  getTasks: () => fetchApi<TasksResponse>('/api/tasks'),
  createTask: (data: {
    brainId: string;
    title: string;
    description?: string;
    modelOverride?: string;
  }) =>
    fetchApi<void>('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteTask: (id: string) =>
    fetchApi<void>(`/api/tasks/${id}`, { method: 'DELETE' }),

  // Recurring Tasks
  getRecurringTasks: () => fetchApi<RecurringTasksResponse>('/api/recurring-tasks'),
  createRecurringTask: (data: {
    brainId: string;
    title: string;
    description?: string;
    modelOverride?: string;
    scheduleType: 'INTERVAL' | 'HOURLY' | 'DAILY' | 'WEEKLY';
    intervalMinutes?: number;
    scheduleConfig?: Record<string, unknown>;
  }) =>
    fetchApi<void>('/api/recurring-tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  updateRecurringTask: (
    id: string,
    data: {
      title?: string;
      description?: string;
      modelOverride?: string;
      scheduleType?: 'INTERVAL' | 'HOURLY' | 'DAILY' | 'WEEKLY';
      intervalMinutes?: number;
      scheduleConfig?: Record<string, unknown>;
    }
  ) =>
    fetchApi<void>(`/api/recurring-tasks/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  toggleRecurringTask: (id: string, enabled: boolean) =>
    fetchApi<void>(`/api/recurring-tasks/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }),
  runRecurringTask: (id: string) =>
    fetchApi<void>(`/api/recurring-tasks/${id}/run`, { method: 'POST' }),
  deleteRecurringTask: (id: string) =>
    fetchApi<void>(`/api/recurring-tasks/${id}`, { method: 'DELETE' }),

  // Jobs
  getJobs: () => fetchApi<JobsResponse>('/api/jobs'),

  // Reports
  getReports: (brainId: string, limit = 10) =>
    fetchApi<ReportsResponse>(
      `/api/reports?brainId=${encodeURIComponent(brainId)}&limit=${limit}`
    ),

  // Brain Config
  getBrainConfig: (brainId: string) =>
    fetchApi<BrainConfigResponse>(`/api/brains/${brainId}/config`),
  saveBrainConfig: (brainId: string, config: string) =>
    fetchApi<void>(`/api/brains/${brainId}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    }),

  // Brain Actions
  toggleBrain: (id: string, enabled: boolean) =>
    fetchApi<void>(`/api/brains/${id}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    }),
  runBrain: (id: string) =>
    fetchApi<void>(`/api/brains/${id}/force-run`, { method: 'POST' }),

  // Task Actions
  executeTask: (id: string) =>
    fetchApi<void>(`/api/tasks/${id}/execute`, { method: 'POST' }),

  // Config
  getModels: () => fetchApi<{ models: Array<{ alias: string; id: string; provider: string }> }>('/api/config/models'),
};
