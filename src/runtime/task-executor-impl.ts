/**
 * Task executor implementation using OpenClaw agents
 */

import { logger } from '../lib/logger';
import { Task } from '../domain/types';
import { TaskExecutor } from '../services/task-executor.service';
import { OpenClawAdapter, DiscordAdapter } from '../integrations';
import { BrainConfigRepository } from '../data/repositories';

export class OpenClawTaskExecutor implements TaskExecutor {
  constructor(
    private openClawAdapter: OpenClawAdapter,
    private discordAdapter: DiscordAdapter,
    private brainConfigRepo: BrainConfigRepository,
    private brainConfigs: Map<string, { openClawAgentId?: string; discordChannelId: string; description: string }>
  ) {}

  /**
   * Execute a task using OpenClaw agent
   */
  async execute(task: Task): Promise<void> {
    const brainConfig = this.brainConfigs.get(task.brainId);
    if (!brainConfig) {
      throw new Error(`Brain config not found for ${task.brainId}`);
    }

    const { openClawAgentId, discordChannelId, description } = brainConfig;

    if (!openClawAgentId) {
      throw new Error(`Brain ${task.brainId} has no OpenClaw agent configured`);
    }

    // Build the prompt
    const scheduleContext = await this.getScheduleContext(task);
    const prompt = this.buildPrompt(task, description, discordChannelId, scheduleContext);

    logger.info('Executing task with OpenClaw', {
      taskId: task.id,
      brainId: task.brainId,
      agentId: openClawAgentId,
      promptLength: prompt.length,
    });

    // Execute with OpenClaw
    const output = await this.openClawAdapter.executeTask(openClawAgentId, {
      prompt,
      model: task.modelOverride,
      thinking: 'low',
    });

    logger.info('Task execution completed', {
      taskId: task.id,
      outputLength: output.length,
    });

    // Send completion message to Discord (if enabled)
    if (task.sendDiscordNotification !== false) {
      await this.discordAdapter.sendMessage(
        discordChannelId,
        `✅ **Task completed:** ${task.title}\n\n${output.slice(0, 1000)}${output.length > 1000 ? '...' : ''}`
      );
    }
  }

  /**
   * Build the prompt for the task
   */
  private buildPrompt(
    task: Task,
    brainDescription: string,
    channelId: string,
    scheduleContext: string
  ): string {
    const parts: string[] = [];

    parts.push(`You are executing a task for the brain with this context:`);
    parts.push(`\nContext: ${brainDescription}`);
    parts.push(`\nYour task is: ${task.title}`);

    if (task.description) {
      parts.push(`\nTask Details: ${task.description}`);
    }

    if (scheduleContext) {
      parts.push(scheduleContext);
    }

    parts.push(
      `\n\nIMPORTANT: When finished, send a Discord message to channel ID ${channelId} with a short summary using the message tool.`
    );

    return parts.join('');
  }

  /**
   * Get schedule context if needed for planning tasks
   */
  private async getScheduleContext(task: Task): Promise<string> {
    const needsSchedule =
      task.brainId === 'personal' ||
      task.brainId === 'school' ||
      task.brainId === 'digest';

    if (!needsSchedule) {
      return '';
    }

    if (
      task.description &&
      (task.description.includes('PERSONAL_PLANNING_KIND') ||
        task.description.includes('SCHOOL_PLANNING_KIND') ||
        task.description.includes('REPORT_KIND'))
    ) {
      const schedule = await this.openClawAdapter.getScheduleContext();
      return `\n\nMerged Schedule (America/Chicago) — deterministic output from get-schedule.js:\n\n${schedule}`;
    }

    return '';
  }
}
