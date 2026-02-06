/**
 * Recurring task routes
 */

import { FastifyInstance } from 'fastify';
import { RecurringTaskRepository } from '../../data/repositories';
import { CreateRecurringTaskInput } from '../../domain/types';

export function registerRecurringRoutes(
  server: FastifyInstance,
  recurringRepo: RecurringTaskRepository
): void {
  /**
   * GET /api/recurring
   * Get all recurring tasks
   */
  server.get('/api/recurring', async () => {
    const tasks = recurringRepo.findAll();
    return { tasks };
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
    Body: CreateRecurringTaskInput;
  }>('/api/recurring', async (request, reply) => {
    const input = request.body;
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
   * GET /api/brains/:brainId/recurring
   * Get recurring tasks for a brain
   */
  server.get<{
    Params: { brainId: string };
  }>('/api/brains/:brainId/recurring', async (request, reply) => {
    const { brainId } = request.params;
    const tasks = recurringRepo.findByBrainId(brainId);
    return { tasks };
  });
}
