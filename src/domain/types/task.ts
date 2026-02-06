/**
 * Task domain types
 */

export enum TaskStatus {
  PENDING = 'PENDING',
  WAITING = 'WAITING', // Waiting on time or dependency
  READY = 'READY', // Eligible for execution
  EXECUTING = 'EXECUTING',
  PAUSED = 'PAUSED',
  BLOCKED = 'BLOCKED',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum DependencyType {
  HARD = 'HARD', // Must complete before this task can run
  SOFT = 'SOFT', // Optional/informational
}

export interface TaskDependency {
  taskId: string;
  type: DependencyType;
}

export enum BackoffType {
  FIXED = 'FIXED',
  EXPONENTIAL = 'EXPONENTIAL',
}

export interface TaskRetryPolicy {
  maxAttempts: number;
  backoffType: BackoffType;
  backoffMs: number;
}

export interface Task {
  id: string;
  brainId: string;
  status: TaskStatus;
  title: string;
  description?: string;
  payload: Record<string, any>;
  modelOverride?: string;
  brainName?: string; // Cache for UI

  // Dependencies & Scheduling
  dependencies: TaskDependency[];
  executeAt?: number; // Unix timestamp for scheduled execution
  createdAt: number;
  updatedAt: number;

  // Execution History
  attempts: number;
  retryPolicy?: TaskRetryPolicy;
  error?: string;
  output?: string; // Path to artifact or summary
}

export interface CreateTaskInput {
  brainId: string;
  title: string;
  description?: string;
  payload?: Record<string, any>;
  modelOverride?: string;
  dependencies?: TaskDependency[];
  executeAt?: number;
  retryPolicy?: TaskRetryPolicy;
}

export interface UpdateTaskInput {
  id: string;
  status?: TaskStatus;
  title?: string;
  description?: string;
  payload?: Record<string, any>;
  modelOverride?: string;
  dependencies?: TaskDependency[];
  executeAt?: number;
  error?: string;
  output?: string;
  attempts?: number;
}
