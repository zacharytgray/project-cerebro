/**
 * Task executor implementation using OpenClaw agents
 */

import { logger } from '../lib/logger';
import { Task } from '../domain/types';
import { TaskExecutor } from '../services/task-executor.service';
import { OpenClawAdapter, DiscordAdapter } from '../integrations';
import { BrainConfigRepository, TaskRepository, RecurringTaskRepository } from '../data/repositories';

export class OpenClawTaskExecutor implements TaskExecutor {
  constructor(
    private openClawAdapter: OpenClawAdapter,
    private discordAdapter: DiscordAdapter,
    private brainConfigRepo: BrainConfigRepository,
    private brainConfigs: Map<string, { openClawAgentId?: string; discordChannelId: string; description: string }>,
    private taskRepo?: TaskRepository,
    private recurringRepo?: RecurringTaskRepository
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

    // Load brain config from DB (system prompt, tools, skills, report template)
    const brainConfigData = this.brainConfigRepo.get(task.brainId) || {};

    // Build the prompt
    const scheduleContext = await this.getScheduleContext(task);
    const prompt = this.buildPrompt(task, description, discordChannelId, scheduleContext, brainConfigData);

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

    // Trigger report task if this task was from a recurring task with triggersReport enabled
    await this.triggerReportTaskIfNeeded(task);
  }

  /**
   * Create a report task if the parent recurring task has triggersReport enabled
   */
  private async triggerReportTaskIfNeeded(task: Task): Promise<void> {
    if (!this.recurringRepo || !this.taskRepo) {
      return;
    }

    const recurringTaskId = task.payload?.recurringTaskId;
    if (!recurringTaskId) {
      return;
    }

    try {
      const recurringTask = this.recurringRepo.findById(recurringTaskId);
      if (!recurringTask || !recurringTask.triggersReport) {
        return;
      }

      const delayMs = (recurringTask.reportDelayMinutes ?? 0) * 60 * 1000;
      const executeAt = Date.now() + delayMs;

      // Create report task
      const reportTask = this.taskRepo.create({
        brainId: task.brainId,
        title: `${task.title} - Report`,
        description: `REPORT_KIND\n\nAuto-generated report for: ${task.title}\nOriginal task ID: ${task.id}`,
        payload: {
          parentTaskId: task.id,
          recurringTaskId: recurringTaskId,
          autoTriggered: true,
        },
        executeAt: delayMs > 0 ? executeAt : undefined, // If no delay, create as READY
      });

      logger.info('Report task created', {
        reportTaskId: reportTask.id,
        parentTaskId: task.id,
        recurringTaskId: recurringTaskId,
        delayMinutes: recurringTask.reportDelayMinutes ?? 0,
      });
    } catch (error) {
      logger.error('Failed to create report task', error as Error, {
        taskId: task.id,
        recurringTaskId,
      });
    }
  }

  /**
   * Build the prompt for the task
   */
  private buildPrompt(
    task: Task,
    brainDescription: string,
    channelId: string,
    scheduleContext: string,
    brainConfig: Record<string, any>
  ): string {
    const parts: string[] = [];

    const systemPrompt = brainConfig.systemPrompt || brainDescription;
    parts.push(`You are executing a task for the brain with this context:`);
    parts.push(`\nSystem Prompt: ${systemPrompt}`);

    // Tools and skills
    const toolConfig = brainConfig.tools || {};
    const enabledTools = toolConfig.enabled || {};
    const toolSettings = toolConfig.config || {};
    const enabledToolList = Object.entries(enabledTools)
      .filter(([, v]) => v)
      .map(([k]) => k);

    if (enabledToolList.length > 0) {
      parts.push(`\nEnabled Tools: ${enabledToolList.join(', ')}`);
      parts.push(`\nTool Settings: ${JSON.stringify(toolSettings, null, 2)}`);
    }

    const skills = brainConfig.skills || [];
    if (skills.length > 0) {
      parts.push(`\nSkills: ${JSON.stringify(skills, null, 2)}`);
    }

    parts.push(`\nYour task is: ${task.title}`);

    if (task.description) {
      parts.push(`\nTask Details: ${task.description}`);
    }

    if (scheduleContext) {
      parts.push(scheduleContext);
    }

    // Report template (if this is a report task)
    if (task.description?.includes('REPORT_KIND') && brainConfig.reportTemplate) {
      parts.push(`\n\nReport Template (JSON expected):\n${brainConfig.reportTemplate}`);
      parts.push(`\n\nIMPORTANT: Output MUST be valid JSON matching the template.`);
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
