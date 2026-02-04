import { Client, GatewayIntentBits, Message } from 'discord.js';
import * as dotenv from 'dotenv';
import { Brain } from './Brain';
import { ExecutionGraph } from './ExecutionGraph';
import * as path from 'path';

dotenv.config();

export class CerebroRuntime {
    private client: Client;
    private brains: Map<string, Brain> = new Map();
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private channelMap: Map<string, string> = new Map(); // ChannelID -> BrainID
    public graph: ExecutionGraph;

    public getBrains(): Brain[] {
        return Array.from(this.brains.values());
    }

    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

        // Initialize Graph (DB)
        const dbPath = path.join(process.cwd(), 'cerebro.db');
        this.graph = new ExecutionGraph(dbPath);

        this.client.on('ready', () => {
            console.log(`Cerebro Online. Logged in as ${this.client.user?.tag}`);
            this.startHeartbeat();
        });

        this.client.on('messageCreate', this.handleMessage.bind(this));
    }

    public registerBrain(brain: Brain) {
        this.brains.set(brain.id, brain);
        // @ts-ignore - Accessing protected property for setup
        this.channelMap.set(brain.discordChannelId, brain.id);
        console.log(`Registered brain: ${brain.name} -> ${brain.id}`);
    }

    public async start(token: string) {
        await this.client.login(token);
    }

    private startHeartbeat() {
        if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
        
        console.log('Starting heartbeat loop (30s)...');
        this.heartbeatInterval = setInterval(async () => {
            
            // 1. Evaluate Graph (Promote Waiting -> Ready)
            await this.graph.evaluateGraph();

            // 2. Spawn due recurring tasks
            await this.evaluateRecurringTasks();

            // 3. Tick Brains
            this.brains.forEach(async (brain) => {
                try {
                    await brain.onHeartbeat();
                } catch (e) {
                    console.error(`Error in heartbeat for ${brain.name}:`, e);
                }
            });
        }, 30000); // 30s heartbeat
    }

    private async evaluateRecurringTasks(): Promise<void> {
        const now = Date.now();
        const due = await this.graph.getDueRecurringTasks(now);

        for (const recurring of due) {
            const taskId = now.toString() + '-' + Math.floor(Math.random() * 1000).toString();
            await this.graph.createTask({
                id: taskId,
                brainId: recurring.brainId,
                brainName: recurring.brainName,
                status: 'READY' as any,
                title: recurring.title,
                description: recurring.description,
                payload: { recurringTaskId: recurring.id },
                modelOverride: recurring.modelOverride,
                dependencies: [],
                executeAt: now,
                createdAt: now,
                updatedAt: now,
                attempts: 0
            });

            const nextRunAt = now + recurring.intervalMs;
            await this.graph.updateRecurringTaskNextRun(recurring.id, nextRunAt, now);
        }
    }

    private async handleMessage(message: Message) {
        if (message.author.bot) return;

        const brainId = this.channelMap.get(message.channelId);
        if (brainId) {
            const brain = this.brains.get(brainId);
            console.log(`Routing message from ${message.author.username} to ${brain?.name}`);
            
            // Delegate to the specific brain implementation
            if (brain) {
                await brain.handleUserMessage(message.content);
            }
        }
    }
}
