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
            await this.generateDigest('morning');
        }
        if (text === '!digest-night') {
            await this.generateDigest('night');
        }
    }

    protected async executeTask(task: Task): Promise<void> {
        if (task.description?.includes('REPORT_KIND:morning')) {
            await this.generateDigest('morning');
            await this.graph.updateTaskStatus(task.id, 'COMPLETED' as any);
            return;
        }
        if (task.description?.includes('REPORT_KIND:night')) {
            await this.generateDigest('night');
            await this.graph.updateTaskStatus(task.id, 'COMPLETED' as any);
            return;
        }
        await super['executeTask'](task as any);
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

    private async generateDigest(kind: 'morning' | 'night'): Promise<void> {
        await this.sendMessage("🔍 **Compiling Daily Digest...**");

        const now = new Date();
        const today = this.getDateString(now);
        const tomorrow = this.getDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000));
        const targetDate = kind === 'morning' ? today : tomorrow;

        const state = await this.readState();
        const lastRunAt = state.lastRun?.[kind] || 0;
        const lastReportedByBrain = state.lastReportedByBrain || {};

        let report = `📅 **Daily Digest (${kind}) — ${today}**\n\n`;
        report += kind === 'morning'
            ? `**Day ahead:** ${today}\n\n`
            : `**Looking ahead:** ${tomorrow}\n\n`;

        let hasContent = false;

        for (const brainId of this.monitoredBrains) {
            const storage = new BrainStorage(brainId);
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
            report += `**${brainId.toUpperCase()} BRAIN**\n`;

            for (const filePath of relevantFiles) {
                const content = await fs.promises.readFile(filePath, 'utf-8');
                const lines = content.split('\n').filter(l => l.trim().length > 0);
                const summary = lines.slice(0, 25).join('\n');
                report += `${summary}\n\n`;
            }

            if (brainId !== 'personal' && brainId !== 'school') {
                lastReportedByBrain[brainId] = Date.now();
            }
        }

        if (!hasContent) {
            report += "*No new reports since the last digest run.*";
        }

        // Split message if too long for Discord (2000 chars)
        if (report.length > 2000) {
            const chunks = report.match(/[\s\S]{1,1900}/g) || [];
            for (const chunk of chunks) {
                await this.sendMessage(chunk);
            }
        } else {
            await this.sendMessage(report);
        }

        // Save digest report
        const digestStorage = new BrainStorage('digest');
        await digestStorage.writeReport(kind, report, today);

        state.lastRun = state.lastRun || {};
        state.lastRun[kind] = Date.now();
        state.lastReportedByBrain = lastReportedByBrain;
        await this.writeState(state);
    }
}
