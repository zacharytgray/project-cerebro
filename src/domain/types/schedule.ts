/**
 * Schedule and recurring task types
 */

export enum RecurrencePattern {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM = 'CUSTOM',
}

export interface RecurringTask {
  id: string;
  brainId: string;
  title: string;
  description?: string;
  pattern: RecurrencePattern;
  cronExpression?: string; // For CUSTOM patterns
  payload?: Record<string, any>;
  modelOverride?: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  lastExecutedAt?: number;
  nextExecutionAt?: number;
}

export interface CreateRecurringTaskInput {
  brainId: string;
  title: string;
  description?: string;
  pattern: RecurrencePattern;
  cronExpression?: string;
  payload?: Record<string, any>;
  modelOverride?: string;
  nextExecutionAt?: number;
}

export interface UpdateRecurringTaskInput {
  id: string;
  title?: string;
  description?: string;
  pattern?: RecurrencePattern;
  cronExpression?: string;
  payload?: Record<string, any>;
  modelOverride?: string;
  active?: boolean;
  lastExecutedAt?: number;
  nextExecutionAt?: number;
}
