export interface BrainStatus {
  id: string;
  name: string;
  status: 'IDLE' | 'EXECUTING';
  autoMode: boolean;
  description?: string;
  maturity?: 'active' | 'dormant' | 'experimental';
  operationalRole?: 'primary' | 'capability';
}

export type TaskStatus = 'READY' | 'EXECUTING' | 'COMPLETED' | 'FAILED';

export interface Task {
  id: string;
  brainId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  modelOverride?: string;
  createdAt: number;
  updatedAt?: number;
  attempts?: number;
  error?: string;
  output?: string;
  executeAt?: number;
  sendDiscordNotification?: boolean;
}

export interface RecurringTask {
  id: string;
  brainId: string;
  title: string;
  description?: string;
  modelOverride?: string;
  scheduleType: 'INTERVAL' | 'HOURLY' | 'DAILY' | 'WEEKLY';
  intervalMs?: number;
  scheduleConfig?: {
    hour?: number;
    minute?: number;
    day?: number;
  };
  nextRunAt: number;
  lastRunAt?: number;
  enabled: boolean;
  sendDiscordNotification?: boolean;
  triggersReport?: boolean;
  reportDelayMinutes?: number;
}

export interface Job {
  id: string;
  company: string;
  position: string;
  status: string;
  updatedAt: number;
}

export interface Report {
  date: string | null;
  kind: 'morning' | 'night' | null;
  content: string;
  mtime: string;
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

export interface SpecSiteEngineSummaryResponse {
  counts: {
    backlog: number;
    qualified: number;
    in_progress: number;
    outbox: number;
    sent: number;
    responded: number;
    archived: number;
  };
  latestOutbox: Array<{
    lead_id: string;
    business_name: string;
    city: string;
    state: string;
    website_score: number | null;
    updated_at: string | null;
    preview_url: string | null;
    screenshot_paths: string[];
    site_dir: string | null;
    outreach_draft_path: string | null;
    email: {
      recipient: string;
      subject: string;
      body: string;
    };
  }>;
  latestSent: Array<{
    lead_id: string;
    business_name: string;
    city: string;
    state: string;
    website_score: number | null;
    updated_at: string | null;
    preview_url: string | null;
    screenshot_paths: string[];
    site_dir: string | null;
    outreach_draft_path: string | null;
    email: {
      recipient: string;
      subject: string;
      body: string;
    };
  }>;
  updatedAt: string;
}

export interface ModelAlias {
  alias: string;
  id: string;
}
