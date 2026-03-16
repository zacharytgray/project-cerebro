/**
 * Task executor implementation using OpenClaw agents
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';
import { logger } from '../lib/logger';
import { Task } from '../domain/types';
import { TaskExecutor } from '../services/task-executor.service';
import { OpenClawAdapter, DiscordAdapter } from '../integrations';
import { BrainConfigRepository, TaskRepository, RecurringTaskRepository } from '../data/repositories';
import { ReportService } from '../services';
import { format, toZonedTime } from 'date-fns-tz';

const OFFICE_EMAIL = 'zach.gray.office@gmail.com';
const BLOCKED_PERSONAL_EMAIL = 'zacharytgray@gmail.com';
const execAsync = promisify(exec);

function resolveTodoistPath(): string {
  if (process.env.TODOIST_CLI_PATH && process.env.TODOIST_CLI_PATH.trim()) {
    return process.env.TODOIST_CLI_PATH.trim();
  }

  const home = os.homedir();
  const candidates = [
    '/home/linuxbrew/.linuxbrew/bin/todoist',
    path.join(home, '.linuxbrew', 'bin', 'todoist'),
    path.join(home, '.npm-global', 'bin', 'todoist'),
    '/usr/local/bin/todoist',
    '/usr/bin/todoist',
    'todoist',
  ];

  for (const candidate of candidates) {
    if (candidate === 'todoist') return candidate;
    try {
      if (fs.existsSync(candidate)) return candidate;
    } catch {
      // ignore
    }
  }

  return 'todoist';
}

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
    const executorDeliversNotification = this.shouldExecutorDeliverNotification(task);

    this.enforceEmailPolicy(task, prompt, brainConfigData);

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
      // Keep executor chatter low-noise; the agent's final message is the source of truth.
      // Start announcements are intentionally suppressed.
    }

    // Execute with OpenClaw
    // NOTE: `openclaw agent` CLI does not currently accept an explicit model flag.
    // Model selection is handled by the OpenClaw agent config (or session defaults).
    let output = await this.openClawAdapter.executeTask(openClawAgentId, {
      prompt,
      thinking: 'low',
    });
    output = this.normalizeCapabilityOutput(task, output);

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
        output = this.normalizeCapabilityOutput(task, output);
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
    if (announceFromExecutor && executorDeliversNotification) {
      const message = this.buildExecutorNotificationMessage(task, output);
      await this.openClawAdapter.sendMessage(notifyTarget, message, notifyChannel);
    } else if (announceFromExecutor) {
      // Completion announcements are intentionally suppressed to avoid double messaging.
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

  private extractLatestReportRun(content: string): string {
    const text = (content || '').trim();
    if (!text) return '';

    // Reports are appended with blocks like:
    // ---
    // [time] KIND RUN
    // <content>
    const marker = /\n---\n\[[^\]]+\]\s+[A-Z]+\s+RUN\n/g;
    let lastMatch: RegExpExecArray | null = null;
    let m: RegExpExecArray | null;

    while ((m = marker.exec(text)) !== null) {
      lastMatch = m;
    }

    if (!lastMatch) return text;

    const start = lastMatch.index + 5; // skip leading "\n---\n"
    return text.slice(start).trim();
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
    parts.push(`You are executing a task for an internal capability under Nexus with this context:`);
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

    parts.push(`\nEmail Safety Policy (hard rule):`);
    parts.push(`\n- Allowed sender account for outbound email: office (${OFFICE_EMAIL})`);
    parts.push(`\n- Forbidden sender account/address: personal (${BLOCKED_PERSONAL_EMAIL})`);
    parts.push(`\n- If a task asks to send from personal, refuse and explain policy violation.`);

    parts.push(`\nYour task is: ${task.title}`);

    if (task.description) {
      parts.push(`\nTask Details: ${task.description}`);
    }

    parts.push(this.buildDelegationContractInstructions(task));

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

    if (task.description?.includes('DAILY_DIGEST_KIND') || task.description?.includes('DAILY_DIGEST_NIGHT_KIND')) {
      parts.push(
        `\n\nCRITICAL DIGEST RULES:\n` +
        `- The "Reports for <date>" context above is the source of truth.\n` +
        `- Do NOT claim files are missing if report content is present in context.\n` +
        `- Do NOT run filesystem checks.\n` +
        `- If reports are present, aggregate them directly and cite the capability+kind headers provided.\n` +
        `- Only say "none found" when the context explicitly says: Reports for <date>: (none found).`
      );
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
      const optionalNotify = task.description?.includes('OPTIONAL_NOTIFY');

      if (this.shouldExecutorDeliverNotification(task)) {
        parts.push(
          `\n\nIMPORTANT: Do NOT send any Discord messages yourself for this task.` +
          `\nThe executor will deliver the final notification.` +
          `\nYour job is to output the final digest content only.` +
          `\nNever reply with NO_REPLY for this task.` +
          `\nMessage quality rules:` +
          `\n- Do NOT write meta commentary about what you are about to summarize.` +
          `\n- Include concrete outputs (decisions, scheduled blocks, due items, blockers).` +
          `\n- If the source reports contain no concrete outputs, say that plainly and concisely.` +
          `\n- Keep concise but informative (roughly 8-15 bullets max for planning/digest tasks).`
        );
      } else if (optionalNotify) {
        parts.push(
          `\n\nIMPORTANT: This task supports OPTIONAL notifications.` +
          `\nSend ONE message using the message tool to ${notifyChannel} target ${notifyTarget} ONLY if trigger conditions are met.` +
          `\nIf no trigger condition is met, send no message.` +
          `\nIf you do send a message: keep it concise, actionable, and specific to the trigger condition.`
        );
      } else {
        parts.push(
          `\n\nIMPORTANT: When finished, send exactly ONE message using the message tool to ${notifyChannel} target ${notifyTarget}.` +
          `\nDo not reply with NO_REPLY unless you have already successfully sent the message tool call.` +
          `\nMessage quality rules:` +
          `\n- Do NOT write meta commentary about what you are about to summarize.` +
          `\n- Include concrete outputs (decisions, scheduled blocks, due items, blockers).` +
          `\n- If you wrote/updated a report file, include its path.` +
          `\n- Keep concise but informative (roughly 8-15 bullets max for planning/digest tasks).`
        );
      }
    } else {
      parts.push(
        `\n\nIMPORTANT: Do NOT send any Discord messages for this task. Your output will be captured into a markdown report file.`
      );
    }

    return parts.join('');
  }

  private buildDelegationContractInstructions(task: Task): string {
    const isNexus = task.brainId === 'nexus';
    const isDigest = this.shouldExecutorDeliverNotification(task);

    if (isNexus || isDigest) {
      return (
        `\n\nNEXUS OUTPUT CONTRACT:` +
        `\n- You are preparing the final integrated answer for Nexus.` +
        `\n- Prioritize crisp synthesis over internal process narration.` +
        `\n- Use concrete findings, decisions, blockers, and next actions.` +
        `\n- Do not mention sub-agents unless operationally necessary for debugging.`
      );
    }

    return (
      `\n\nDELEGATION RETURN CONTRACT (required):` +
      `\nReturn your result using these exact sections so Nexus can absorb it cleanly:` +
      `\n## Summary` +
      `\n- What you concluded or produced` +
      `\n## Facts Learned` +
      `\n- Key factual findings discovered during execution` +
      `\n## Actions Taken` +
      `\n- Edits made, files written, reports updated, services restarted, or "- None"` +
      `\n## Artifacts` +
      `\n- Paths, task IDs, report files, message IDs, URLs, or "- None"` +
      `\n## Blockers / Risks` +
      `\n- Remaining issues, uncertainty, constraints, or "- None"` +
      `\n## Recommended Next Steps` +
      `\n- What Nexus should do next, or "- None"` +
      `\n## Confidence` +
      `\n- High / Medium / Low with one short reason` +
      `\nKeep sections concise and grounded.`
    );
  }

  private normalizeCapabilityOutput(task: Task, output: string): string {
    const trimmed = (output || '').trim();
    if (!trimmed) return trimmed;

    if (task.brainId === 'nexus' || this.shouldExecutorDeliverNotification(task)) {
      return trimmed;
    }

    const hasContractSections =
      trimmed.includes('## Summary') &&
      trimmed.includes('## Facts Learned') &&
      trimmed.includes('## Actions Taken') &&
      trimmed.includes('## Artifacts') &&
      trimmed.includes('## Blockers / Risks') &&
      trimmed.includes('## Recommended Next Steps') &&
      trimmed.includes('## Confidence');

    if (hasContractSections) {
      return trimmed;
    }

    return [
      '## Summary',
      '- Returned useful output, but it did not follow the full delegation contract exactly.',
      '',
      '## Facts Learned',
      ...trimmed.split('\n').map((line) => (line.trim() ? `- ${line.replace(/^[-*]\s*/, '')}` : '-')).slice(0, 12),
      '',
      '## Actions Taken',
      '- None explicitly reported.',
      '',
      '## Artifacts',
      '- None explicitly reported.',
      '',
      '## Blockers / Risks',
      '- Output format did not follow the required contract exactly.',
      '',
      '## Recommended Next Steps',
      '- If this capability is reused, tighten prompt compliance or post-process more aggressively.',
      '',
      '## Confidence',
      '- Medium - content appears useful, but structure had to be normalized by the executor.',
    ].join('\n');
  }

  private shouldExecutorDeliverNotification(task: Task): boolean {
    const desc = task.description || '';
    return desc.includes('DAILY_DIGEST_KIND') || desc.includes('DAILY_DIGEST_NIGHT_KIND');
  }

  private buildExecutorNotificationMessage(task: Task, output: string): string {
    const trimmed = (output || '').trim();

    if (
      trimmed &&
      trimmed !== 'NO_REPLY' &&
      !trimmed.startsWith('(no agent output)') &&
      trimmed !== '(no agent output)'
    ) {
      return trimmed;
    }

    const tz = 'America/Chicago';
    const today = format(toZonedTime(new Date(), tz), 'yyyy-MM-dd', { timeZone: tz });
    const kind = (task.description || '').includes('DAILY_DIGEST_NIGHT_KIND') ? 'night' : 'morning';
    const reportPath = `data/${task.brainId}/reports/${today}-${kind}.md`;

    return [
      `Daily Digest — ${today}`,
      '',
      '- Personal, School, and Nexus source reports ran, but they did not contain usable digest content.',
      '- No concrete decisions, scheduled blocks, due items, or blockers were captured in the source outputs.',
      `- Stored report: ${reportPath}`,
      '- Action needed: fix upstream planning/report generation or rerun the source reports before the next digest.',
    ].join('\n');
  }

  private enforceEmailPolicy(task: Task, prompt: string, brainConfig: Record<string, any>): void {
    const promptLower = prompt.toLowerCase();
    const taskText = `${task.title}\n${task.description || ''}`;
    const looksLikeEmailAction =
      /\b(send|reply|draft|compose)\b/i.test(taskText) &&
      /\b(email|gmail|outreach|mail)\b/i.test(taskText);
    const referencesBlockedPersonal = promptLower.includes(BLOCKED_PERSONAL_EMAIL.toLowerCase());

    const configuredDefaultAccount = brainConfig?.tools?.config?.email?.defaultAccount;
    const configuredLegacyAccount = brainConfig?.email?.account;
    const configuredLegacyAddress = brainConfig?.email?.address;

    if (configuredDefaultAccount === 'personal') {
      throw new Error(
        `Email policy violation: brain ${task.brainId} configured with forbidden defaultAccount=personal. Allowed sender is office (${OFFICE_EMAIL}).`
      );
    }

    if (typeof configuredLegacyAddress === 'string' && configuredLegacyAddress.toLowerCase() === BLOCKED_PERSONAL_EMAIL.toLowerCase()) {
      throw new Error(
        `Email policy violation: brain ${task.brainId} configured with forbidden personal sender address (${BLOCKED_PERSONAL_EMAIL}).`
      );
    }

    if (configuredLegacyAccount === 'personal') {
      throw new Error(
        `Email policy violation: brain ${task.brainId} configured with legacy email.account=personal. Allowed sender is office (${OFFICE_EMAIL}).`
      );
    }

    if (looksLikeEmailAction && referencesBlockedPersonal) {
      throw new Error(
        `Email policy violation: task ${task.id} references forbidden personal sender (${BLOCKED_PERSONAL_EMAIL}). Only office sender (${OFFICE_EMAIL}) is allowed.`
      );
    }

    const isMoneySpecSiteTask =
      task.brainId === 'money' &&
      /spec[-\s]?site|outbox|local business website/i.test(`${task.title}\n${task.description || ''}`);

    if (isMoneySpecSiteTask) {
      const explicitlyAsksToSendEmail = /\bsend\b[\s\S]{0,80}\b(email|gmail|outreach)\b/i.test(
        `${task.title}\n${task.description || ''}`
      );
      const allowsOutboxOnly = /outbox/i.test(`${task.title}\n${task.description || ''}`);

      if (explicitlyAsksToSendEmail && !allowsOutboxOnly) {
        throw new Error(
          `Policy violation: money/spec-site tasks are outbox-only and cannot send email directly. Use manual send from Project Cerebro dashboard.`
        );
      }
    }
  }

  /**
   * Get schedule context if needed for planning tasks
   */
  private async getScheduleContext(task: Task): Promise<string> {
    const needsAnyContext =
      task.brainId === 'personal' ||
      task.brainId === 'school' ||
      task.brainId === 'trainer' ||
      task.description?.includes('DAILY_DIGEST_KIND') ||
      task.description?.includes('DAILY_DIGEST_NIGHT_KIND');

    if (!needsAnyContext) {
      return '';
    }

    const blocks: string[] = [];

    // 1) Schedule context (only when explicitly requested by task kind)
    if (
      task.brainId === 'trainer' ||
      (task.description &&
        (task.description.includes('PERSONAL_PLANNING_KIND') ||
          task.description.includes('SCHOOL_PLANNING_KIND') ||
          task.description.includes('REPORT_KIND') ||
          task.description.includes('TRAINER_KIND')))
    ) {
      const schedule = await this.openClawAdapter.getScheduleContext();
      blocks.push(
        `Merged Schedule (America/Chicago) — deterministic output from get-schedule.js:\n\n${schedule}`
      );
    }

    // 2) Todoist context for school planning/report tasks
    if (
      task.brainId === 'school' &&
      task.description &&
      (task.description.includes('SCHOOL_PLANNING_KIND') || task.description.includes('REPORT_KIND'))
    ) {
      const todoistContext = await this.getTodoistContext(task);
      if (todoistContext) {
        blocks.push(todoistContext);
      }
    }

    // 3) Digest context: today's reports across brains (only when explicitly requested)
    // Digest brain removed; Nexus can run digest tasks when the task includes DAILY_DIGEST_KIND.
    if (task.description?.includes('DAILY_DIGEST_KIND') || task.description?.includes('DAILY_DIGEST_NIGHT_KIND')) {
      const tz = 'America/Chicago';
      const now = new Date();
      const today = format(toZonedTime(now, tz), 'yyyy-MM-dd', { timeZone: tz });
      const brainIds = ['personal', 'school', 'trainer', 'nexus'];
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
        const availability = ['personal', 'school', 'trainer', 'nexus']
          .flatMap((brainId) => ['morning', 'night'].map((kind) => ({ brainId, kind })))
          .map(({ brainId, kind }) => {
            const found = reports.some((r) => r.brainId === brainId && r.kind === kind);
            return `- ${brainId}/${kind}: ${found ? 'FOUND' : 'MISSING'}`;
          })
          .join('\n');

        const reportText = reports
          .map((r) => {
            const header = `## ${r.brainId.toUpperCase()} — ${r.kind.toUpperCase()}`;
            const latest = this.extractLatestReportRun(r.content || '');
            const compact = latest.slice(0, 2200);
            return `${header}\n\n${compact}`;
          })
          .join('\n\n');

        blocks.push(`Report availability for ${today}:\n${availability}`);
        blocks.push(`Reports for ${today} (latest run per file):\n\n${reportText}`);
      }
    }

    if (blocks.length === 0) return '';

    return `\n\nContext:\n\n${blocks.join('\n\n---\n\n')}`;
  }

  private async getTodoistContext(task: Task): Promise<string> {
    try {
      const todoistPath = resolveTodoistPath();
      const env = {
        ...process.env,
        PATH: `${path.dirname(todoistPath)}:${process.env.PATH || '/usr/local/bin:/usr/bin:/bin'}`,
      };
      const [{ stdout: tasksStdout }, { stdout: projectsStdout }, { stdout: labelsStdout }] = await Promise.all([
        execAsync(`${todoistPath} tasks --all --json`, { maxBuffer: 10 * 1024 * 1024, env }),
        execAsync(`${todoistPath} projects --json`, { maxBuffer: 2 * 1024 * 1024, env }),
        execAsync(`${todoistPath} labels --json`, { maxBuffer: 2 * 1024 * 1024, env }),
      ]);

      const rawTasks = JSON.parse(tasksStdout || '[]');
      const rawProjects = JSON.parse(projectsStdout || '[]');
      const rawLabels = JSON.parse(labelsStdout || '[]');

      const projectNameById = new Map<string, string>(
        rawProjects.map((p: any) => [String(p.id), String(p.name || p.id)])
      );
      const labelNameById = new Map<string, string>(
        rawLabels.map((l: any) => [String(l.id), String(l.name || l.id)])
      );

      const schoolLabelNames = new Set(['homework', 'research', 'exam', 'quiz']);
      const schoolKeywords = /\b(alg|algorithm|bio|bioinformatics|exam|quiz|homework|assignment|project|presentation|class|course|study|grade|gradebook|ta|lecture|lab|midterm|final)\b/i;
      const personalKeywords = /\b(allowance|dad|mom|grocer|bank|doctor|dentist|rent|bill|call|text)\b/i;

      const tasks = rawTasks
        .filter((t: any) => !t.checked && !t.isDeleted)
        .map((t: any) => {
          const labelNames = Array.isArray(t.labels)
            ? t.labels.map((label: any) => labelNameById.get(String(label)) || String(label))
            : [];
          const projectName = projectNameById.get(String(t.projectId)) || String(t.projectId || 'Unknown');
          const textBlob = `${t.content || ''}\n${t.description || ''}`;
          const hasSchoolLabel = labelNames.some((name: string) => schoolLabelNames.has(name.toLowerCase()));
          const hasSchoolKeyword = schoolKeywords.test(textBlob);
          const looksPersonal = personalKeywords.test(textBlob);
          const inboxWithDueDate = projectName.toLowerCase() === 'inbox' && !!t.due?.date;
          const projectLooksSchool = /\b(school|class|course|study|homework|assignment|exam|quiz|research)\b/i.test(projectName);

          return {
            content: String(t.content || '').trim(),
            description: String(t.description || '').trim(),
            dueDate: t.due?.date ? String(t.due.date) : null,
            dueString: t.due?.string ? String(t.due.string) : null,
            projectName,
            labelNames,
            hasSchoolLabel,
            hasSchoolKeyword,
            projectLooksSchool,
            inboxWithDueDate,
            looksPersonal,
          };
        })
        .filter((t: any) => (t.hasSchoolLabel || t.hasSchoolKeyword || t.projectLooksSchool || t.inboxWithDueDate) && !t.looksPersonal)
        .sort((a: any, b: any) => {
          const aDue = a.dueDate || '9999-12-31';
          const bDue = b.dueDate || '9999-12-31';
          return aDue.localeCompare(bDue) || a.content.localeCompare(b.content);
        });

      const limited = tasks.slice(0, 25);
      const lines = limited.map((t: any) => {
        const duePart = t.dueDate ? `due ${t.dueDate}` : 'no due date';
        const labelPart = t.labelNames.length > 0 ? ` | labels: ${t.labelNames.join(', ')}` : '';
        const descPart = t.description ? `\n  notes: ${t.description.slice(0, 240)}` : '';
        return `- ${t.content} (${duePart} | project: ${t.projectName}${labelPart})${descPart}`;
      });

      const summary = [
        `Todoist school-task snapshot (${limited.length} shown of ${tasks.length} matched active tasks):`,
        `- Filtering is label-agnostic: tasks may match by due date, project, labels, or school-related keywords.`,
        `- Do NOT say Todoist data was missing if tasks are listed below.`,
        ...lines,
      ];

      if (tasks.length === 0) {
        return `Todoist school-task snapshot:\n- No active school-related Todoist tasks matched the current heuristic filter.`;
      }

      return summary.join('\n');
    } catch (error) {
      logger.warn('Failed to get Todoist context', {
        taskId: task.id,
        brainId: task.brainId,
        error: error instanceof Error ? error.message : String(error),
      });
      return 'WARNING: Failed to retrieve Todoist context.';
    }
  }
}
