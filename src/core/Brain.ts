// Core interface for all Brains
import { Client, TextChannel } from 'discord.js';
import { ExecutionGraph } from './ExecutionGraph';
import { Task } from './Task';

export interface BrainConfig {
    id: string;
    name: string;
    discordChannelId: string;
    description: string;
}

export abstract class Brain {
    public id: string;
    public name: string;
    protected discordChannelId: string;
    protected description: string;
    protected client: Client;
    protected graph: ExecutionGraph;

    constructor(config: BrainConfig, client: Client, graph: ExecutionGraph) {
        this.id = config.id;
        this.name = config.name;
        this.discordChannelId = config.discordChannelId;
        this.description = config.description;
        this.client = client;
        this.graph = graph;
    }

    // Lifecycle methods
    public async init(): Promise<void> {
        console.log(`[${this.name}] Initializing...`);
        // Setup hooks, load memory, etc.
    }

    public async wake(): Promise<void> {
        // Check for queued tasks or ready state
    }

    // Core execution hook called by heartbeat
    public async onHeartbeat(): Promise<void> {
        // 1. Get READY tasks for this brain
        const tasks = await this.graph.getReadyTasks(this.id);
        
        if (tasks.length > 0) {
            console.log(`[${this.name}] Found ${tasks.length} ready tasks.`);
            for (const task of tasks) {
                await this.executeTask(task);
            }
        }
    }

    protected async executeTask(task: Task): Promise<void> {
        console.log(`[${this.name}] Executing task: ${task.title} (${task.id})`);
        
        // Mark as EXECUTING
        await this.graph.updateTaskStatus(task.id, 'EXECUTING' as any);

        try {
            // Actual execution logic would go here (or be abstract)
            // For now, we simulate success
            await this.sendMessage(`✅ Executed Task: **${task.title}**`);
            
            // Mark as COMPLETED
            await this.graph.updateTaskStatus(task.id, 'COMPLETED' as any);
        } catch (error) {
            console.error(`[${this.name}] Task failed:`, error);
            await this.graph.updateTaskStatus(task.id, 'FAILED' as any, String(error));
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
