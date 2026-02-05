import { Brain, BrainConfig } from '../core/Brain';
import { Client } from 'discord.js';
import { ExecutionGraph } from '../core/ExecutionGraph';
import { BrainStorage } from '../core/Storage';
import * as path from 'path';
import * as fs from 'fs';

export class DigestBrain extends Brain {
    private monitoredBrains: string[];

    constructor(config: BrainConfig, client: Client, graph: ExecutionGraph, monitoredBrains: string[]) {
        super(config, client, graph);
        this.monitoredBrains = monitoredBrains;
    }

    public async handleUserMessage(message: string): Promise<void> {
        if (message.trim().toLowerCase() === '!digest') {
            await this.generateDigest();
        }
    }

    private async generateDigest(): Promise<void> {
        await this.sendMessage("🔍 **Compiling Daily Digest...**");
        
        const date = new Date().toISOString().split('T')[0];
        let report = `📅 **Daily Digest - ${date}**\n\n`;
        let hasContent = false;

        for (const brainId of this.monitoredBrains) {
            const storage = new BrainStorage(brainId);
            const reports = await storage.readReportsForDate(date);
            const log = await storage.readTodayLog();

            if (reports.length > 0) {
                hasContent = true;
                report += `**${brainId.toUpperCase()} BRAIN**\n`;
                for (const rep of reports) {
                    const lines = rep.content.split('\n').filter(l => l.trim().length > 0);
                    const summary = lines.slice(0, 20).join('\n');
                    report += `*${rep.kind.toUpperCase()} REPORT*\n${summary}\n\n`;
                }
            } else if (log && log.trim().length > 0) {
                hasContent = true;
                report += `**${brainId.toUpperCase()} BRAIN**\n`;
                const lines = log.split('\n').filter(l => l.trim().length > 0);
                const summary = lines.slice(-5).join('\n');
                report += summary + '\n\n';
            }
        }

        if (!hasContent) {
            report += "*No activity recorded today across any brains.*";
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
    }
}
