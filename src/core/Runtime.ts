import { Client, GatewayIntentBits, Message } from 'discord.js';
import * as dotenv from 'dotenv';
import { Brain } from './Brain';

dotenv.config();

export class CerebroRuntime {
    private client: Client;
    private brains: Map<string, Brain> = new Map();
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private channelMap: Map<string, string> = new Map(); // ChannelID -> BrainID

    constructor() {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent
            ]
        });

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
        this.heartbeatInterval = setInterval(() => {
            this.brains.forEach(async (brain) => {
                try {
                    await brain.onHeartbeat();
                } catch (e) {
                    console.error(`Error in heartbeat for ${brain.name}:`, e);
                }
            });
        }, 30000); // 30s heartbeat
    }

    private async handleMessage(message: Message) {
        if (message.author.bot) return;

        const brainId = this.channelMap.get(message.channelId);
        if (brainId) {
            const brain = this.brains.get(brainId);
            // Route message to brain (to be implemented in Brain class)
            console.log(`Routing message from ${message.author.username} to ${brain?.name}`);
        }
    }
}
