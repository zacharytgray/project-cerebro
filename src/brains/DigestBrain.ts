import { Brain, BrainConfig } from '../core/Brain';
import { Client } from 'discord.js';
import { ExecutionGraph } from '../core/ExecutionGraph';
import { BrainStorage } from '../core/Storage';
import { Task } from '../core/Task';
import * as path from 'path';
import * as fs from 'fs';

export class DigestBrain extends Brain {
    private monitoredBrains: string[];
    private statePath: string;

    constructor(config: BrainConfig, client: Client, graph: ExecutionGraph, monitoredBrains: string[]) {
        super(config, client, graph);
        this.monitoredBrains = monitoredBrains;
        this.statePath = path.join(process.cwd(), 'data', 'digest', 'state.json');
    }

    public async handleUserMessage(message: string): Promise<void> {
        const text = message.trim().toLowerCase();
        if (text === '!digest') {
            await this.runDigestTask({ id: Date.now().toString(), description: 'REPORT_KIND:morning' } as any, 'morning');
        }
        if (text === '!digest-night') {
            await this.runDigestTask({ id: Date.now().toString(), description: 'REPORT_KIND:night' } as any, 'night');
        }
    }

    protected async executeTask(task: Task): Promise<void> {
        if (task.description?.includes('REPORT_KIND:morning')) {
            await this.runDigestTask(task, 'morning');
            return;
        }
        if (task.description?.includes('REPORT_KIND:night')) {
            await this.runDigestTask(task, 'night');
            return;
        }
        await super['executeTask'](task as any);
    }

    private async runDigestTask(task: Task, kind: 'morning' | 'night'): Promise<void> {
        this.status = 'EXECUTING';
        await this.graph.updateTaskStatus(task.id, 'EXECUTING' as any);
        try {
            await this.sendMessage("🔍 **Compiling Daily Digest...**");
            const { prompt, reportBundle, state } = await this.buildDigestPrompt(kind);

            const response = await fetch('http://localhost:18789/tools/invoke', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GATEWAY_TOKEN}`
                },
                body: JSON.stringify({
                    tool: 'sessions_spawn',
                    args: {
                        task: prompt,
                        agentId: this.openClawAgentId || 'digest',
                        model: task.modelOverride || undefined,
                        label: `Cerebro: ${this.name}`,
                        thinking: 'low'
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gateway returned ${response.status}: ${await response.text()}`);
            }

            const result = await response.json();
            const details = result?.result?.details || result?.details;
            if (!result?.ok || details?.status !== 'accepted') {
                throw new Error(`Gateway spawn failed: ${JSON.stringify(details || result)}`);
            }

            // Save deterministic bundle for traceability
            const digestStorage = new BrainStorage('digest');
            const today = this.getDateString(new Date());
            await digestStorage.writeReport(kind, reportBundle, today);

            await this.writeState(state);
            await this.graph.updateTaskStatus(task.id, 'COMPLETED' as any);
        } catch (error) {
            console.error(`[${this.name}] Digest task failed:`, error);
            await this.sendMessage(`❌ **Digest Failed:** ${String(error)}`);
            await this.graph.updateTaskStatus(task.id, 'FAILED' as any, String(error));
        } finally {
            this.status = 'IDLE';
        }
    }

    private async readState(): Promise<any> {
        try {
            const raw = await fs.promises.readFile(this.statePath, 'utf-8');
            return JSON.parse(raw);
        } catch (e) {
            return { lastRun: {}, lastReportedByBrain: {} };
        }
    }

    private async writeState(state: any): Promise<void> {
        await fs.promises.mkdir(path.dirname(this.statePath), { recursive: true });
        await fs.promises.writeFile(this.statePath, JSON.stringify(state, null, 2));
    }

    private getDateString(d: Date): string {
        return d.toISOString().split('T')[0];
    }

    private async listReportFiles(brainId: string): Promise<{ file: string; date: string; kind: 'morning' | 'night' }[]> {
        const reportsDir = path.join(process.cwd(), 'data', brainId, 'reports');
        try {
            const files = await fs.promises.readdir(reportsDir);
            return files
                .filter(f => f.endsWith('.md'))
                .map(f => {
                    const match = f.match(/(\d{4}-\d{2}-\d{2})-(morning|night)\.md/);
                    if (!match) return null;
                    return { file: path.join(reportsDir, f), date: match[1], kind: match[2] as 'morning' | 'night' };
                })
                .filter(Boolean) as any;
        } catch (e) {
            return [];
        }
    }

    private async buildDigestPrompt(kind: 'morning' | 'night'): Promise<{ prompt: string; reportBundle: string; state: any }> {
        const now = new Date();
        const today = this.getDateString(now);
        const tomorrow = this.getDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000));
        const targetDate = kind === 'morning' ? today : tomorrow;

        const state = await this.readState();
        const lastRunAt = state.lastRun?.[kind] || 0;
        const lastReportedByBrain = state.lastReportedByBrain || {};

        let bundle = `DIGEST_KIND: ${kind}\nRUN_DATE: ${today}\nTARGET_DATE: ${targetDate}\n\n`;
        bundle += kind === 'morning'
            ? `Focus: day ahead (${today}).\n\n`
            : `Focus: following day (${tomorrow}).\n\n`;

        let hasContent = false;

        for (const brainId of this.monitoredBrains) {
            const files = await this.listReportFiles(brainId);

            const relevantFiles: string[] = [];
            for (const f of files) {
                const stat = await fs.promises.stat(f.file);
                const mtime = stat.mtimeMs || 0;

                const isPersonalOrSchool = brainId === 'personal' || brainId === 'school';
                const isRepeatAllowed = isPersonalOrSchool;

                if (isRepeatAllowed) {
                    if (mtime > lastRunAt) relevantFiles.push(f.file);
                } else {
                    const lastBrain = lastReportedByBrain[brainId] || 0;
                    if (mtime > lastBrain) relevantFiles.push(f.file);
                }
            }

            if (relevantFiles.length === 0) continue;

            hasContent = true;
            bundle += `=== ${brainId.toUpperCase()} BRAIN ===\n`;

            for (const filePath of relevantFiles) {
                const content = await fs.promises.readFile(filePath, 'utf-8');
                bundle += `--- ${path.basename(filePath)} ---\n${content}\n\n`;
            }

            if (brainId !== 'personal' && brainId !== 'school') {
                lastReportedByBrain[brainId] = Date.now();
            }
        }

        if (!hasContent) {
            bundle += "NO_NEW_REPORTS\n";
        }

        const prompt = `You are the Daily Digest Brain. Summarize the bundled reports below into ONE cohesive message for Discord.

Constraints:
- Output ONE message only.
- Use 12-hour AM/PM time.
- Location context: use local timezone (America/Chicago). Never mention Chicago.
- If kind=morning, outline the day ahead (today). Only mention tomorrow if there's something actionable/important that affects today (e.g., earliest event forcing an early bedtime, a critical deadline, or a morning commitment that requires prep today). If kind=night, outline the following day (tomorrow).
- Explicitly call out calendar additions from Personal and Schoolwork brains.
- Do NOT repeat items from money/job/research that were already reported previously (the bundle already filters these).
- Do NOT include generic news or unrelated headlines.
- Keep it concise but complete.
- End with a short "Actionable Highlights" bullet list.
- When mentioning bedtime, DO NOT estimate. Use the deterministic script: \`node dist/scripts/bedtime.js\` and report its output verbatim.

Report Bundle:
${bundle}

IMPORTANT: When finished, send a Discord message to channel ID ${this.discordChannelId} using the message tool.`;

        state.lastRun = state.lastRun || {};
        state.lastRun[kind] = Date.now();
        state.lastReportedByBrain = lastReportedByBrain;

        return { prompt, reportBundle: bundle, state };
    }
}
