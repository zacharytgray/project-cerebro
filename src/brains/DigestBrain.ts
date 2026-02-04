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
            const log = await storage.readTodayLog();
            
            if (log && log.trim().length > 0) {
                hasContent = true;
                report += `**${brainId.toUpperCase()} BRAIN**\n`;
                // Simple summary: take last 3 lines or just link it? 
                // For now, let's just show the log content (truncated if too long)
                const lines = log.split('\n').filter(l => l.trim().length > 0);
                const summary = lines.slice(-5).join('\n'); // Last 5 entries
                
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
