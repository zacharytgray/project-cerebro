// Core interface for all Brains
import { Client, TextChannel } from 'discord.js';
import { ExecutionGraph } from './ExecutionGraph';
import { Task } from './Task';

export interface BrainConfig {
    id: string;
    name: string;
    discordChannelId: string;
    description: string;
    openClawAgentId?: string; // The ID of the specialized agent in OpenClaw
}

export abstract class Brain {
    public id: string;
    public name: string;
    protected discordChannelId: string;
    protected description: string;
    protected openClawAgentId?: string;
    protected client: Client;
    protected graph: ExecutionGraph;
    public status: 'IDLE' | 'EXECUTING' = 'IDLE';
    public autoMode: boolean = false;

    constructor(config: BrainConfig, client: Client, graph: ExecutionGraph) {
        this.id = config.id;
        this.name = config.name;
        this.discordChannelId = config.discordChannelId;
        this.description = config.description;
        this.openClawAgentId = config.openClawAgentId;
        this.client = client;
        this.graph = graph;
    }

    // Lifecycle methods
    public async init(): Promise<void> {
        console.log(`[${this.name}] Initializing...`);
    }

    public toggleAutoMode(enabled: boolean) {
        this.autoMode = enabled;
        console.log(`[${this.name}] AutoMode set to ${enabled}`);
    }

    // Called when a user types in this brain's channel
    public abstract handleUserMessage(message: string): Promise<void>;

    // Core execution hook called by heartbeat
    public async onHeartbeat(): Promise<void> {
        await this.processTasks(false);
    }

    public async forceRun(): Promise<void> {
        console.log(`[${this.name}] Force run triggered.`);
        await this.processTasks(true);
    }

    protected async processTasks(force: boolean): Promise<void> {
        // Only execute if AutoMode is ON or Forced
        if (!this.autoMode && !force) {
            return;
        }

        // 1. Get READY tasks for this brain
        const tasks = await this.graph.getReadyTasks(this.id);
        
        if (tasks.length > 0) {
            console.log(`[${this.name}] Found ${tasks.length} ready tasks (Auto: ${this.autoMode}, Force: ${force}).`);
            for (const task of tasks) {
                await this.executeTask(task);
            }
        }
    }

    protected async executeTask(task: Task): Promise<void> {
        console.log(`[${this.name}] Executing task: ${task.title} (${task.id})`);
        
        // Mark as EXECUTING
        this.status = 'EXECUTING';
        await this.graph.updateTaskStatus(task.id, 'EXECUTING' as any);

        try {
            await this.sendMessage(`🤖 **${this.name}** is processing task: "${task.title}"...`);

            // Handoff to OpenClaw Sub-Agent via tool invocation
            const response = await fetch('http://localhost:18789/tools/invoke', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.GATEWAY_TOKEN}`
                },
                body: JSON.stringify({
                    tool: 'sessions_spawn',
                    args: {
                        task: `You are the ${this.name}. \n\nContext: ${this.description}. \n\nYour task is: ${task.title}. ${task.description ? `\n\nTask Details: ${task.description}` : ''} \n\nIMPORTANT: When finished, you MUST use the 'message' tool to send your final response/confirmation to Discord channel ID: ${this.discordChannelId}`,
                        agentId: this.openClawAgentId || 'main',
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
            
            // Mark as COMPLETED (spawn accepted; sub-agent will deliver content to Discord)
            await this.graph.updateTaskStatus(task.id, 'COMPLETED' as any);

        } catch (error) {
            console.error(`[${this.name}] Task failed:`, error);
            await this.sendMessage(`❌ **Task Failed:** ${String(error)}`);
            await this.graph.updateTaskStatus(task.id, 'FAILED' as any, String(error));
        } finally {
            this.status = 'IDLE';
        }
    }

    public async sendMessage(content: string): Promise<void> {
        try {
            const channel = await this.client.channels.fetch(this.discordChannelId);
            if (channel?.isTextBased()) {
                await (channel as TextChannel).send(content);
            }
        } catch (error) {
            console.error(`[${this.name}] Failed to send message:`, error);
        }
    }
}
