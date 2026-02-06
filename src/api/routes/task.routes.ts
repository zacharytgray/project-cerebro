/**
 * Task routes
 */

import { FastifyInstance } from 'fastify';
import { TaskRepository } from '../../data/repositories';
import { TaskStatus, CreateTaskInput } from '../../domain/types';
import { TaskExecutorService } from '../../services/task-executor.service';

export function registerTaskRoutes(
  server: FastifyInstance,
  taskRepo: TaskRepository,
  taskExecutor: TaskExecutorService
): void {
  /**
   * GET /api/tasks
   * Get all tasks
   */
  server.get('/api/tasks', async () => {
    const tasks = taskRepo.findAll();
    return { tasks };
  });

  /**
   * GET /api/tasks/:id
   * Get specific task
   */
  server.get<{
    Params: { id: string };
  }>('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params;
    const task = taskRepo.getById(id);
    return task;
  });

  /**
   * POST /api/tasks
   * Create a new task
   */
  server.post<{
    Body: CreateTaskInput;
  }>('/api/tasks', async (request, reply) => {
    const input = request.body;
    const task = taskRepo.create(input);
    reply.code(201);
    return task;
  });

  /**
   * PATCH /api/tasks/:id
   * Update a task
   */
  server.patch<{
    Params: { id: string };
    Body: Partial<CreateTaskInput> & { status?: TaskStatus };
  }>('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params;
    const updates = request.body;
    const task = taskRepo.update({ id, ...updates });
    return task;
  });

  /**
   * DELETE /api/tasks/:id
   * Delete a task
   */
  server.delete<{
    Params: { id: string };
  }>('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params;
    taskRepo.delete(id);
    reply.code(204);
  });

  /**
   * GET /api/brains/:brainId/tasks
   * Get tasks for a brain
   */
  server.get<{
    Params: { brainId: string };
  }>('/api/brains/:brainId/tasks', async (request, reply) => {
    const { brainId } = request.params;
    const tasks = taskRepo.findByBrainId(brainId);
    return { tasks };
  });

  /**
   * POST /api/tasks/:id/execute
   * Execute a task immediately
   */
  server.post<{
    Params: { id: string };
  }>('/api/tasks/:id/execute', async (request, reply) => {
    const { id } = request.params;
    const task = taskRepo.getById(id);
    
    if (!task) {
      reply.code(404);
      return { error: 'Task not found' };
    }

    if (task.status !== 'READY') {
      reply.code(400);
      return { error: `Task cannot be executed (status: ${task.status})` };
    }

    // Execute the task asynchronously
    taskExecutor.executeTask(id).catch((error) => {
      console.error('Task execution failed:', error);
    });

    return { success: true, message: 'Task execution started' };
  });
}
