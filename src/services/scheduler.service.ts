/**
 * Scheduler service - handles schedule computation for recurring tasks
 */

import { logger } from '../lib/logger';
import { RecurringTask, RecurrencePattern } from '../domain/types/schedule';
import { RecurringTaskRepository } from '../data/repositories';

export class SchedulerService {
  constructor(private recurringTaskRepo: RecurringTaskRepository) {}

  /**
   * Compute next execution time for a recurring task
   */
  computeNextExecution(task: RecurringTask): number {
    const now = Date.now();
    const lastExecution = task.lastExecutedAt || task.createdAt;

    // If a cron expression is present, always respect it as the source of truth
    // so manual runs do not permanently drift schedule timing.
    if (task.cronExpression) {
      return this.computeFromCron(task.cronExpression, now);
    }

    switch (task.pattern) {
      case RecurrencePattern.DAILY:
        return this.addDays(lastExecution, 1);

      case RecurrencePattern.WEEKLY:
        return this.addDays(lastExecution, 7);

      case RecurrencePattern.MONTHLY:
        return this.addMonths(lastExecution, 1);

      case RecurrencePattern.CUSTOM:
        throw new Error(`Custom pattern requires cronExpression`);

      default:
        throw new Error(`Unknown recurrence pattern: ${task.pattern}`);
    }
  }

  /**
   * Update next execution time for a recurring task
   */
  updateNextExecution(taskId: string): void {
    const task = this.recurringTaskRepo.getById(taskId);
    const nextExecutionAt = this.computeNextExecution(task);

    this.recurringTaskRepo.update({
      id: taskId,
      nextExecutionAt,
    });

    logger.debug('Updated next execution time', {
      taskId,
      nextExecutionAt: new Date(nextExecutionAt).toISOString(),
    });
  }

  /**
   * Mark recurring task as executed and compute next run
   */
  markExecuted(taskId: string): void {
    const now = Date.now();
    
    // First, update lastExecutedAt so computeNextExecution uses the correct base time
    this.recurringTaskRepo.update({
      id: taskId,
      lastExecutedAt: now,
    });
    
    // Now get the updated task and compute next execution
    const task = this.recurringTaskRepo.getById(taskId);
    const nextExecutionAt = this.computeNextExecution(task);

    this.recurringTaskRepo.update({
      id: taskId,
      nextExecutionAt,
    });

    logger.info('Recurring task executed, scheduled next run', {
      taskId,
      lastExecutedAt: new Date(now).toISOString(),
      nextExecutionAt: new Date(nextExecutionAt).toISOString(),
    });
  }

  /**
   * Add days to a timestamp
   */
  private addDays(timestamp: number, days: number): number {
    return timestamp + days * 24 * 60 * 60 * 1000;
  }

  /**
   * Add months to a timestamp
   */
  private addMonths(timestamp: number, months: number): number {
    const date = new Date(timestamp);
    date.setMonth(date.getMonth() + months);
    return date.getTime();
  }

  /**
   * Compute next execution from cron expression.
   * Supports the patterns used by this app:
   * - "m h * * *" (daily)
   * - "m h * * d" (weekly, d=0..6)
   */
  private computeFromCron(cronExpression: string, fromTime: number): number {
    const parts = cronExpression.trim().split(/\s+/);

    if (parts.length !== 5) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    const [mRaw, hRaw, domRaw, monRaw, dowRaw] = parts;
    const minute = Number(mRaw);
    const hour = Number(hRaw);

    if (Number.isNaN(minute) || Number.isNaN(hour)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    // Daily cron: m h * * *
    if (domRaw === '*' && monRaw === '*' && dowRaw === '*') {
      const next = new Date(fromTime);
      next.setSeconds(0, 0);
      next.setHours(hour, minute, 0, 0);
      if (next.getTime() <= fromTime) {
        next.setDate(next.getDate() + 1);
      }
      return next.getTime();
    }

    // Weekly cron: m h * * d
    if (domRaw === '*' && monRaw === '*' && /^\d+$/.test(dowRaw)) {
      const targetDow = Number(dowRaw); // 0=Sun .. 6=Sat
      const next = new Date(fromTime);
      next.setSeconds(0, 0);
      next.setHours(hour, minute, 0, 0);

      const delta = (targetDow - next.getDay() + 7) % 7;
      next.setDate(next.getDate() + delta);
      if (next.getTime() <= fromTime) {
        next.setDate(next.getDate() + 7);
      }

      return next.getTime();
    }

    throw new Error(`Unsupported cron pattern: ${cronExpression}`);
  }

  /**
   * Get all tasks due for execution
   */
  getDueTasks(): RecurringTask[] {
    return this.recurringTaskRepo.findDue();
  }
}
