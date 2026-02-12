/**
 * Status routes
 */

import { FastifyInstance } from 'fastify';
import { BrainService } from '../../services';
import { TaskRepository } from '../../data/repositories';
import { TaskStatus } from '../../domain/types';

export function registerStatusRoutes(
  server: FastifyInstance,
  brainService: BrainService,
  taskRepo: TaskRepository
): void {
  /**
   * GET /api/status
   * Get system status and brain states
   */
  server.get('/api/status', async () => {
    const brains = brainService.getAllStates();

    // Brain runtime status in BaseBrain is not currently synchronized with task execution.
    // Derive ACTIVE/EXECUTING from source-of-truth task state.
    const executingTasks = taskRepo.findByStatus(TaskStatus.EXECUTING);
    const executingBrainIds = new Set(executingTasks.map((t) => t.brainId));

    const brainsWithLiveStatus = brains.map((b) => ({
      ...b,
      status: executingBrainIds.has(b.id) ? 'EXECUTING' : 'IDLE',
    }));

    return {
      status: 'online',
      timestamp: Date.now(),
      brains: brainsWithLiveStatus,
    };
  });

  /**
   * GET /api/health
   * Health check endpoint
   */
  server.get('/api/health', async () => {
    return {
      status: 'healthy',
      timestamp: Date.now(),
    };
  });
}
