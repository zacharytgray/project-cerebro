/**
 * Main entry point for Cerebro - refactored architecture
 */

import { logger, LogLevel } from './lib/logger';
import { getConfig } from './lib/config';
import { CerebroRuntime } from './runtime/cerebro';
import { HeartbeatLoop } from './runtime/heartbeat';
import { ContextBrain, JobBrain, DigestBrain } from './runtime/brains';
import { BrainType } from './domain/types';

async function main() {
  try {
    // Load configuration
    const config = getConfig();

    // Set log level from config
    logger.setLevel(config.logLevel as LogLevel);

    logger.info('Starting Cerebro', {
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
    });

    // Create runtime
    const runtime = new CerebroRuntime();
    const { brainService, taskExecutorService, schedulerService } = runtime.getServices();
    const { taskRepo, recurringRepo, jobRepo } = runtime.getRepositories();
    const { discordAdapter, openClawAdapter } = runtime.getIntegrations();

    // Register brains from configuration
    config.brains.brains.forEach((brainConfig) => {
      const channelId = config.discord.channels[brainConfig.channelKey];
      if (!channelId) {
        logger.warn('Channel not found for brain', {
          brainId: brainConfig.id,
          channelKey: brainConfig.channelKey,
        });
        return;
      }

      const fullConfig = {
        id: brainConfig.id,
        name: brainConfig.name,
        type: brainConfig.type === 'job' ? BrainType.JOB : BrainType.CONTEXT,
        description: brainConfig.description,
        discordChannelId: channelId,
        openClawAgentId: brainConfig.openClawAgentId,
      };

      let brain;
      if (brainConfig.type === 'job') {
        brain = new JobBrain(
          fullConfig,
          taskRepo,
          discordAdapter,
          openClawAdapter,
          taskExecutorService,
          jobRepo
        );
      } else {
        brain = new ContextBrain(
          fullConfig,
          taskRepo,
          discordAdapter,
          openClawAdapter,
          taskExecutorService
        );
      }

      brainService.register(brain);
    });

    // Register nexus/default brain (general purpose brain)
    const nexusChannelId = config.discord.channels[config.brains.nexus.channelKey];
    if (nexusChannelId) {
      const nexusBrain = new ContextBrain(
        {
          id: 'default',
          name: 'Default (General)',
          type: BrainType.CONTEXT,
          description: 'General purpose brain with highest scope and privileges. Routes to #general channel.',
          discordChannelId: nexusChannelId,
          openClawAgentId: config.brains.nexus.openClawAgentId || 'nexus',
        },
        taskRepo,
        discordAdapter,
        openClawAdapter,
        taskExecutorService
      );
      brainService.register(nexusBrain);
    }

    // Register digest brain
    const digestChannelId = config.discord.channels[config.brains.digest.channelKey];
    if (digestChannelId) {
      const digestService = runtime.getServices().digestService;
      const digestBrain = new DigestBrain(
        {
          id: config.brains.digest.id,
          name: config.brains.digest.name,
          type: BrainType.DIGEST,
          description: config.brains.digest.description,
          discordChannelId: digestChannelId,
          openClawAgentId: config.brains.digest.openClawAgentId,
        },
        taskRepo,
        discordAdapter,
        openClawAdapter,
        taskExecutorService,
        digestService
      );
      brainService.register(digestBrain);
    }

    // Start runtime
    await runtime.start();

    // Start heartbeat loop (every 60 seconds)
    const heartbeat = new HeartbeatLoop(
      brainService,
      schedulerService,
      taskRepo,
      recurringRepo,
      60000
    );
    heartbeat.start();

    logger.info('Cerebro started successfully', {
      brainsRegistered: brainService.getAll().length,
    });

    // Graceful shutdown
    const shutdown = async () => {
      logger.info('Shutting down Cerebro');
      heartbeat.stop();
      await runtime.stop();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    logger.error('Failed to start Cerebro', error as Error);
    process.exit(1);
  }
}

main();
