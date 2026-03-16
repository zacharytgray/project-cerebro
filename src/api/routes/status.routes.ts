/**
 * Status routes
 */

import { FastifyInstance } from 'fastify';
import { BrainService } from '../../services';
import { BrainsRepository, CapabilityMaturity } from '../../data/repositories';
import { TaskRepository } from '../../data/repositories';
import { TaskStatus } from '../../domain/types';

function inferMaturity(id: string, description: string): CapabilityMaturity {
  const text = `${id} ${description || ''}`.toLowerCase();
  if (text.includes('dormant')) return 'dormant';
  if (text.includes('experimental')) return 'experimental';
  return 'active';
}

export function registerStatusRoutes(
  server: FastifyInstance,
  brainService: BrainService,
  taskRepo: TaskRepository,
  brainsRepo: BrainsRepository
): void {
  /**
   * GET /api/status
   * Get system status and brain states
   */
  server.get('/api/status', async () => {
    const brains = brainService.getAllStates();
    const persistedBrains = new Map(brainsRepo.getAll().map((b) => [b.id, b]));

    // Brain runtime status in BaseBrain is not currently synchronized with task execution.
    // Derive ACTIVE/EXECUTING from source-of-truth task state.
    const executingTasks = taskRepo.findByStatus(TaskStatus.EXECUTING);
    const executingBrainIds = new Set(executingTasks.map((t) => t.brainId));

    const brainsWithLiveStatus = brains.map((b) => {
      const persisted = persistedBrains.get(b.id);
      const maturity = persisted?.maturity || inferMaturity(b.id, b.description);
      return {
        ...b,
        description: persisted?.description || b.description,
        name: persisted?.name || b.name,
        status: executingBrainIds.has(b.id) ? 'EXECUTING' : 'IDLE',
        maturity,
        operationalRole: b.id === 'nexus' ? 'primary' : 'capability',
      };
    });

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
