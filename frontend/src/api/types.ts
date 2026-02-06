export interface BrainStatus {
  id: string;
  name: string;
  status: 'IDLE' | 'EXECUTING';
  autoMode: boolean;
}

export interface Task {
  id: string;
  brainId: string;
  title: string;
  description?: string;
  status: string;
  modelOverride?: string;
  createdAt: number;
}

export interface RecurringTask {
  id: string;
  brainId: string;
  title: string;
  description?: string;
  modelOverride?: string;
  scheduleType: 'INTERVAL' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  intervalMs?: number;
  scheduleConfig?: string;
  nextRunAt: number;
  lastRunAt?: number;
  enabled: boolean;
}

export interface Job {
  id: string;
  company: string;
  position: string;
  status: string;
  updatedAt: number;
}

export interface Report {
  id: string;
  brainId: string;
  date: string | null;
  kind: 'morning' | 'night' | null;
  updatedAt: number;
  markdown: string;
}

export interface StatusResponse {
  brains: BrainStatus[];
}

export interface TasksResponse {
  tasks: Task[];
}

export interface RecurringTasksResponse {
  recurringTasks: RecurringTask[];
}

export interface JobsResponse {
  jobs: Job[];
}

export interface ReportsResponse {
  reports: Report[];
}

export interface BrainConfigResponse {
  config: string;
}

export interface ModelAlias {
  alias: string;
  id: string;
}
