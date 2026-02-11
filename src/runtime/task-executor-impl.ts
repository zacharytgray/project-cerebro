/**
 * Task executor implementation using OpenClaw agents
 */

import { logger } from '../lib/logger';
import { Task } from '../domain/types';
import { TaskExecutor } from '../services/task-executor.service';
import { OpenClawAdapter, DiscordAdapter } from '../integrations';
import { BrainConfigRepository, TaskRepository, RecurringTaskRepository } from '../data/repositories';
import { ReportService } from '../services';
import { format, toZonedTime } from 'date-fns-tz';

export class OpenClawTaskExecutor implements TaskExecutor {
  constructor(
    private openClawAdapter: OpenClawAdapter,
    private discordAdapter: DiscordAdapter,
    private brainConfigRepo: BrainConfigRepository,
    private brainConfigs: Map<string, { openClawAgentId?: string; notifyChannel: string; notifyTarget: string; description: string }>, 
    private reportService: ReportService,
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

    const { openClawAgentId, notifyChannel, notifyTarget, description } = brainConfig;

    if (!openClawAgentId) {
      throw new Error(`Brain ${task.brainId} has no OpenClaw agent configured`);
    }

    // Load brain config from DB (system prompt, tools, skills, report template)
    const brainConfigData = this.brainConfigRepo.get(task.brainId) || {};

    // Build the prompt
    const scheduleContext = await this.getScheduleContext(task);
    const prompt = this.buildPrompt(task, description, notifyChannel, notifyTarget, scheduleContext, brainConfigData);

    logger.info('Executing task with OpenClaw', {
      taskId: task.id,
      brainId: task.brainId,
      agentId: openClawAgentId,
      promptLength: prompt.length,
    });

    // Send start message to Discord (if enabled)
    // For Digest tasks, the agent is instructed to send exactly one final message,
    // so we suppress executor-level start/complete announcements to avoid double-posting.
    const announceFromExecutor = task.sendDiscordNotification !== false;

    if (announceFromExecutor) {
      await this.openClawAdapter.sendMessage(notifyTarget, `▶️ **Task started:** ${task.title}`, notifyChannel);
    }

    // Execute with OpenClaw
    // NOTE: `openclaw agent` CLI does not currently accept an explicit model flag.
    // Model selection is handled by the OpenClaw agent config (or session defaults).
    let output = await this.openClawAdapter.executeTask(openClawAgentId, {
      prompt,
      thinking: 'low',
    });

    // Some agent workspaces can fail with provider-side schema errors before doing any real work
    // (example seen: Invalid 'input[73].name' string too long). If that happens on non-nexus brains,
    // retry once via nexus agent as a safe fallback so report pipelines keep working.
    if (this.isFatalAgentOutput(output) && task.brainId !== 'nexus') {
      const nexusConfig = this.brainConfigs.get('nexus');
      if (nexusConfig?.openClawAgentId) {
        logger.warn('Primary agent returned fatal output; retrying with nexus fallback', {
          taskId: task.id,
          brainId: task.brainId,
          primaryAgent: openClawAgentId,
          fallbackAgent: nexusConfig.openClawAgentId,
          outputPreview: output.slice(0, 200),
        });

        output = await this.openClawAdapter.executeTask(nexusConfig.openClawAgentId, {
          prompt,
          thinking: 'low',
        });
      }
    }

    if (this.isFatalAgentOutput(output)) {
      throw new Error(`Agent returned fatal output: ${output.slice(0, 220)}`);
    }

    logger.info('Task execution completed', {
      taskId: task.id,
      outputLength: output.length,
    });

    // Persist output for visibility
    if (this.taskRepo) {
      this.taskRepo.update({
        id: task.id,
        output: output || '(no output)',
      });
    }

    // Persist as a markdown report for planning/digest/report tasks
    await this.writeReportIfNeeded(task, output);

    // Send completion message to Discord (if enabled)
    if (announceFromExecutor) {
      await this.openClawAdapter.sendMessage(
        notifyTarget,
        `✅ **Task completed:** ${task.title}`,
        notifyChannel
      );
    }

    // Trigger report task if this task was from a recurring task with triggersReport enabled
    await this.triggerReportTaskIfNeeded(task);
  }

  private isFatalAgentOutput(output: string): boolean {
    const text = (output || '').trim();
    if (!text) return true;

    return (
      /^ERROR:/i.test(text) ||
      /Invalid 'input\[\d+\]\.name'/i.test(text) ||
      /OpenClaw task execution failed/i.test(text)
    );
  }

  /**
   * Write markdown reports for key recurring tasks.
   *
   * We keep storage in markdown for flexibility/human readability.
   */
  private async writeReportIfNeeded(task: Task, output: string): Promise<void> {
    try {
      const desc = task.description || '';

      const isReportLike =
        desc.includes('PERSONAL_PLANNING_KIND') ||
        desc.includes('SCHOOL_PLANNING_KIND') ||
        desc.includes('DAILY_DIGEST_KIND') ||
        desc.includes('DAILY_DIGEST_NIGHT_KIND') ||
        desc.includes('REPORT_KIND');

      if (!isReportLike) return;

      // Determine kind. Default morning unless explicitly night.
      const kind =
        /REPORT_KIND\s*:\s*night/i.test(desc) ||
        /\bnight\b/i.test(task.title) ||
        /\bnight\b/i.test(desc)
          ? 'night'
          : 'morning';

      await this.reportService.writeReport(task.brainId, kind as any, output);
    } catch (e) {
      logger.warn('Failed to write report for task output', {
        taskId: task.id,
        brainId: task.brainId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
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
    notifyChannel: string,
    notifyTarget: string,
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

    // Enforce deterministic sectioning for planning reports so digest can parse reliably.
    if (task.description?.includes('PERSONAL_PLANNING_KIND')) {
      parts.push(`\n\nOutput format is REQUIRED:\n## Part A — Today\nDate: <YYYY-MM-DD in America/Chicago>\n- Include today's schedule summary first\n- Then recommendations for navigating the day (health, breaks, pacing, priorities)\n\n## Part B — Tomorrow\nDate: <YYYY-MM-DD in America/Chicago>\n- Overview of tomorrow\n- Mental prep checklist for tomorrow\n\nUse clear date separation. No ambiguity about which day each section targets.`);
    }

    if (task.description?.includes('SCHOOL_PLANNING_KIND')) {
      parts.push(`\n\nOutput format is REQUIRED:\n## Part A — Today\nDate: <YYYY-MM-DD in America/Chicago>\n- Today's classes, deadlines, and study plan\n\n## Part B — Tomorrow\nDate: <YYYY-MM-DD in America/Chicago>\n- Tomorrow's classes and prep plan\n\n## Part C — Upcoming (Next 7 Days)\nDate Range: <YYYY-MM-DD to YYYY-MM-DD in America/Chicago>\n- Exams/assignments due soon\n- Recommended prep blocks\n\nUse explicit dates in each section.`);
    }

    if (scheduleContext) {
      parts.push(scheduleContext);
    }

    // Report template (if this is a report task)
    if (task.description?.includes('REPORT_KIND') && brainConfig.reportTemplate) {
      const reportFormat = brainConfig.reportFormat || 'markdown';

      if (reportFormat === 'json') {
        parts.push(`\n\nReport Template (JSON expected):\n${brainConfig.reportTemplate}`);
        parts.push(`\n\nIMPORTANT: Output MUST be valid JSON matching the template.`);
      } else {
        parts.push(`\n\nReport Template (markdown suggested):\n${brainConfig.reportTemplate}`);
        parts.push(`\n\nIMPORTANT: Output should be well-structured markdown (headings + bullets).`);
      }
    }

    // Only ask the agent to message Discord when notifications are enabled for this task.
    if (task.sendDiscordNotification !== false) {
      parts.push(
        `\n\nIMPORTANT: When finished, send a message using the message tool to ${notifyChannel} target ${notifyTarget} with a short summary.`
      );
    } else {
      parts.push(
        `\n\nIMPORTANT: Do NOT send any Discord messages for this task. Your output will be captured into a markdown report file.`
      );
    }

    return parts.join('');
  }

  /**
   * Get schedule context if needed for planning tasks
   */
  private async getScheduleContext(task: Task): Promise<string> {
    const needsAnyContext =
      task.brainId === 'personal' ||
      task.brainId === 'school';

    if (!needsAnyContext) {
      return '';
    }

    const blocks: string[] = [];

    // 1) Schedule context (only when explicitly requested by task kind)
    if (
      task.description &&
      (task.description.includes('PERSONAL_PLANNING_KIND') ||
        task.description.includes('SCHOOL_PLANNING_KIND') ||
        task.description.includes('REPORT_KIND'))
    ) {
      const schedule = await this.openClawAdapter.getScheduleContext();
      blocks.push(
        `Merged Schedule (America/Chicago) — deterministic output from get-schedule.js:\n\n${schedule}`
      );
    }

    // 2) Digest context: today's reports across brains (only when explicitly requested)
    // Digest brain removed; Nexus can run digest tasks when the task includes DAILY_DIGEST_KIND.
    if (task.description?.includes('DAILY_DIGEST_KIND') || task.description?.includes('DAILY_DIGEST_NIGHT_KIND')) {
      const tz = 'America/Chicago';
      const now = new Date();
      const today = format(toZonedTime(now, tz), 'yyyy-MM-dd', { timeZone: tz });
      const brainIds = ['personal', 'school', 'nexus'];
      const reports = await this.reportService.getAllReportsForDate(brainIds, today);

      const reportPaths = brainIds
        .map((id) => [
          `data/${id}/reports/${today}-morning.md`,
          `data/${id}/reports/${today}-night.md`,
        ])
        .flat();

      blocks.push(`Report files checked for ${today} (America/Chicago):\n${reportPaths.map((p) => `- ${p}`).join('\n')}`);

      if (reports.length === 0) {
        blocks.push(`Reports for ${today}: (none found)`);
      } else {
        const reportText = reports
          .map((r) => {
            const header = `## ${r.brainId.toUpperCase()} — ${r.kind.toUpperCase()}`;
            const content = (r.content || '').trim().slice(-6000);
            return `${header}\n\n${content}`;
          })
          .join('\n\n');

        blocks.push(`Reports for ${today} (by brain):\n\n${reportText}`);
      }
    }

    if (blocks.length === 0) return '';

    return `\n\nContext:\n\n${blocks.join('\n\n---\n\n')}`;
  }
}
