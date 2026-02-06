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
    this.discordAdapter = new DiscordAdapter(config.discordToken);
    this.openClawAdapter = new OpenClawAdapter(
      config.openClawGatewayUrl,
      config.openClawToken
    );

    // Task executor will be initialized after we create the executor
    // For now, create a placeholder
    this.taskExecutorService = new TaskExecutorService(
      this.taskRepo,
      {
        execute: async (task) => {
          logger.warn('Task executor not fully initialized yet', { taskId: task.id });
        },
      }
    );

    // Initialize API server
    this.apiServer = new ApiServer(config.port, {
      brainService: this.brainService,
      taskRepo: this.taskRepo,
      recurringRepo: this.recurringRepo,
      reportService: this.reportService,
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

    // Connect to Discord
    await this.discordAdapter.connect();

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

    // Disconnect from Discord
    await this.discordAdapter.disconnect();

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
