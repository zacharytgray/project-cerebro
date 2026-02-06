/**
 * Recurring task routes
 */

import { FastifyInstance } from 'fastify';
import { RecurringTaskRepository, TaskRepository } from '../../data/repositories';
import { CreateRecurringTaskInput } from '../../domain/types';
import { TaskExecutorService } from '../../services/task-executor.service';

function computeNextExecution(
  pattern: string,
  cronExpression: string | undefined,
  scheduleConfig?: { hour?: number; minute?: number; day?: number },
  intervalMinutes?: number
): number {
  const now = Date.now();
  const date = new Date();

  switch (pattern) {
    case 'HOURLY':
      // Next hour at specified minute
      date.setMinutes(scheduleConfig?.minute || 0, 0, 0);
      date.setHours(date.getHours() + 1);
      return date.getTime();

    case 'DAILY':
      // Today at specified time, or tomorrow if passed
      date.setHours(scheduleConfig?.hour || 0, scheduleConfig?.minute || 0, 0, 0);
      if (date.getTime() <= now) {
        date.setDate(date.getDate() + 1);
      }
      return date.getTime();

    case 'WEEKLY':
      // Next occurrence of this day at specified time
      const targetDay = scheduleConfig?.day || 1; // Monday default
      const currentDay = date.getDay();
      let daysUntil = targetDay - currentDay;
      if (daysUntil < 0 || (daysUntil === 0 && date.getTime() > now)) {
        daysUntil += 7;
      }
      date.setDate(date.getDate() + daysUntil);
      date.setHours(scheduleConfig?.hour || 0, scheduleConfig?.minute || 0, 0, 0);
      return date.getTime();

    case 'INTERVAL':
      // Now + interval
      return now + (intervalMinutes || 60) * 60 * 1000;

    default:
      // Default to 1 hour from now
      return now + 60 * 60 * 1000;
  }
}

export function registerRecurringRoutes(
  server: FastifyInstance,
  recurringRepo: RecurringTaskRepository,
  taskRepo: TaskRepository,
  taskExecutor: TaskExecutorService
): void {
  /**
   * GET /api/recurring
   * Get all recurring tasks
   */
  server.get('/api/recurring', async () => {
    const recurringTasks = recurringRepo.findAll();
    return { recurringTasks };
  });

  /**
   * GET /api/recurring/:id
   * Get specific recurring task
   */
  server.get<{
    Params: { id: string };
  }>('/api/recurring/:id', async (request, reply) => {
    const { id } = request.params;
    const task = recurringRepo.getById(id);
    return task;
  });

  /**
   * POST /api/recurring
   * Create a new recurring task
   */
  server.post<{
    Body: {
      brainId: string;
      title: string;
      description?: string;
      scheduleType?: string;
      pattern?: string;
      scheduleConfig?: { hour?: number; minute?: number; day?: number };
      intervalMinutes?: number;
      modelOverride?: string;
    };
  }>('/api/recurring', async (request, reply) => {
    const body = request.body;

    // Transform new format (scheduleType + scheduleConfig) to old format (pattern + cronExpression)
    // Map HOURLY and INTERVAL to CUSTOM pattern since enum doesn't have them
    let pattern: string = body.pattern || 'DAILY';
    let cronExpression: string | undefined;

    if (body.scheduleType === 'HOURLY' && body.scheduleConfig) {
      // Every hour at specific minute -> use CUSTOM pattern
      pattern = 'CUSTOM';
      cronExpression = `${body.scheduleConfig.minute || 0} * * * *`;
    } else if (body.scheduleType === 'DAILY' && body.scheduleConfig) {
      // Daily at specific time
      pattern = 'DAILY';
      cronExpression = `${body.scheduleConfig.minute || 0} ${body.scheduleConfig.hour || 0} * * *`;
    } else if (body.scheduleType === 'WEEKLY' && body.scheduleConfig) {
      // Weekly on specific day at specific time
      pattern = 'WEEKLY';
      cronExpression = `${body.scheduleConfig.minute || 0} ${body.scheduleConfig.hour || 0} * * ${body.scheduleConfig.day || 1}`;
    } else if (body.scheduleType === 'INTERVAL' && body.intervalMinutes) {
      // Custom interval -> use CUSTOM pattern
      pattern = 'CUSTOM';
      cronExpression = undefined; // Use intervalMs from payload
    }

    // Compute next execution time
    const nextExecutionAt = computeNextExecution(
      pattern,
      cronExpression,
      body.scheduleConfig,
      body.intervalMinutes
    );

    // Build payload for repository
    const input: CreateRecurringTaskInput = {
      brainId: body.brainId,
      title: body.title,
      description: body.description,
      pattern: pattern as any,
      cronExpression,
      payload: body.intervalMinutes ? { intervalMinutes: body.intervalMinutes } : {},
      modelOverride: body.modelOverride,
      nextExecutionAt,
    };

    const task = recurringRepo.create(input);

    reply.code(201);
    return task;
  });

  /**
   * PATCH /api/recurring/:id
   * Update a recurring task
   */
  server.patch<{
    Params: { id: string };
    Body: Partial<CreateRecurringTaskInput> & { active?: boolean };
  }>('/api/recurring/:id', async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    const task = recurringRepo.update({ id, ...updates });
    return task;
  });

  /**
   * DELETE /api/recurring/:id
   * Delete a recurring task
   */
  server.delete<{
    Params: { id: string };
  }>('/api/recurring/:id', async (request, reply) => {
    const { id } = request.params;
    recurringRepo.delete(id);
    reply.code(204);
  });

  /**
   * POST /api/recurring/:id/run
   * Run recurring task immediately (creates a task instance)
   */
  server.post<{
    Params: { id: string };
  }>('/api/recurring/:id/run', async (request, reply) => {
    const { id } = request.params;
    const recurringTask = recurringRepo.getById(id);
    
    if (!recurringTask) {
      reply.code(404);
      return { error: 'Recurring task not found' };
    }

    // Create a task instance
    const task = taskRepo.create({
      brainId: recurringTask.brainId,
      title: recurringTask.title,
      description: recurringTask.description,
      payload: {
        ...recurringTask.payload,
        recurringTaskId: recurringTask.id,
      },
      modelOverride: recurringTask.modelOverride,
    });

    // Execute immediately
    taskExecutor.executeTask(task.id).catch((error) => {
      console.error('Recurring task execution failed:', error);
    });

    return { success: true, taskId: task.id };
  });

  /**
   * GET /api/brains/:brainId/recurring
   * Get recurring tasks for a brain
   */
  server.get<{
    Params: { brainId: string };
  }>('/api/brains/:brainId/recurring', async (request, reply) => {
    const { brainId } = request.params;
    const recurringTasks = recurringRepo.findByBrainId(brainId);
    return { recurringTasks };
  });
}
