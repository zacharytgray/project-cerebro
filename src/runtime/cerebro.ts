/**
 * Cerebro runtime orchestrator - main system coordinator
 */

import { logger } from '../lib/logger';
import { getConfig } from '../lib/config';
import { getDatabase, closeDatabase } from '../data/database';
import {
  TaskRepository,
  RecurringTaskRepository,
  JobRepository,
  BrainConfigRepository,
} from '../data/repositories';
import {
  BrainService,
  SchedulerService,
  TaskExecutorService,
  ReportService,
  DigestService,
} from '../services';
import { DiscordAdapter, OpenClawAdapter } from '../integrations';
import { ApiServer } from '../api/server';
import { OpenClawTaskExecutor } from './task-executor-impl';

export class CerebroRuntime {
  // Core services
  private brainService: BrainService;
  private taskExecutorService: TaskExecutorService;
  private schedulerService: SchedulerService;
  private reportService: ReportService;
  private digestService: DigestService;

  // Repositories
  private taskRepo: TaskRepository;
  private recurringRepo: RecurringTaskRepository;
  private jobRepo: JobRepository;
  private brainConfigRepo: BrainConfigRepository;

  // Integrations
  private discordAdapter: DiscordAdapter;
  private openClawAdapter: OpenClawAdapter;

  // API server
  private apiServer: ApiServer;

  // State
  private isRunning: boolean = false;

  // Brain configs for executor
  private brainConfigs: Map<string, any> = new Map();

  constructor() {
    const config = getConfig();

    // Initialize database
    const db = getDatabase(config.dbPath);

    // Initialize repositories
    this.taskRepo = new TaskRepository(db);
    this.recurringRepo = new RecurringTaskRepository(db);
    this.jobRepo = new JobRepository(db);
    this.brainConfigRepo = new BrainConfigRepository(db);

    // Initialize services
    this.brainService = new BrainService();
    this.schedulerService = new SchedulerService(this.recurringRepo);
    this.reportService = new ReportService();
    this.digestService = new DigestService(this.reportService);

    // Initialize integrations
    this.openClawAdapter = new OpenClawAdapter(
      config.openClawGatewayUrl,
      config.openClawToken
    );
    this.discordAdapter = new DiscordAdapter(config.discordToken, this.openClawAdapter);

    // Store brain configs for task executor
    config.brains.brains.forEach((brain) => {
      const channelId = config.discord.channels[brain.channelKey];
      if (channelId) {
        this.brainConfigs.set(brain.id, {
          openClawAgentId: brain.openClawAgentId,
          discordChannelId: channelId,
          description: brain.description,
        });
      }
    });

    // Add digest brain config
    const digestChannelId = config.discord.channels[config.brains.digest.channelKey];
    if (digestChannelId) {
      this.brainConfigs.set(config.brains.digest.id, {
        openClawAgentId: config.brains.digest.openClawAgentId,
        discordChannelId: digestChannelId,
        description: config.brains.digest.description,
      });
    }

    // Initialize task executor with OpenClaw implementation
    const taskExecutor = new OpenClawTaskExecutor(
      this.openClawAdapter,
      this.discordAdapter,
      this.brainConfigRepo,
      this.brainConfigs,
      this.taskRepo,
      this.recurringRepo
    );

    this.taskExecutorService = new TaskExecutorService(this.taskRepo, taskExecutor);

    // Initialize API server
    this.apiServer = new ApiServer(config.port, {
      brainService: this.brainService,
      taskRepo: this.taskRepo,
      recurringRepo: this.recurringRepo,
      reportService: this.reportService,
      taskExecutor: this.taskExecutorService,
      brainConfigRepo: this.brainConfigRepo,
    });

    logger.info('Cerebro runtime initialized');
  }

  /**
   * Start the runtime
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Runtime already running');
      return;
    }

    logger.info('Starting Cerebro runtime');

    // Connect to Discord - Disabled, OpenClaw handles this
    // await this.discordAdapter.connect();

    // Initialize brains
    await this.brainService.initAll();

    // Start API server
    await this.apiServer.start();

    this.isRunning = true;
    logger.info('Cerebro runtime started');
  }

  /**
   * Stop the runtime
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('Runtime not running');
      return;
    }

    logger.info('Stopping Cerebro runtime');

    // Stop API server
    await this.apiServer.stop();

    // Disconnect from Discord - Disabled, OpenClaw handles this
    // await this.discordAdapter.disconnect();

    // Close database
    closeDatabase();

    this.isRunning = false;
    logger.info('Cerebro runtime stopped');
  }

  /**
   * Get services (for external access)
   */
  getServices() {
    return {
      brainService: this.brainService,
      taskExecutorService: this.taskExecutorService,
      schedulerService: this.schedulerService,
      reportService: this.reportService,
      digestService: this.digestService,
    };
  }

  /**
   * Get repositories (for external access)
   */
  getRepositories() {
    return {
      taskRepo: this.taskRepo,
      recurringRepo: this.recurringRepo,
      jobRepo: this.jobRepo,
      brainConfigRepo: this.brainConfigRepo,
    };
  }

  /**
   * Get integrations (for external access)
   */
  getIntegrations() {
    return {
      discordAdapter: this.discordAdapter,
      openClawAdapter: this.openClawAdapter,
    };
  }
}
