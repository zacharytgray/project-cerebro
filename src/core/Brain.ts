// Core interface for all Brains
import { Client, TextChannel } from 'discord.js';

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

    constructor(config: BrainConfig, client: Client) {
        this.id = config.id;
        this.name = config.name;
        this.discordChannelId = config.discordChannelId;
        this.description = config.description;
        this.client = client;
    }

    // Lifecycle methods
    public async init(): Promise<void> {
        console.log(`[${this.name}] Initializing...`);
        // Setup hooks, load memory, etc.
    }

    public async wake(): Promise<void> {
        console.log(`[${this.name}] Waking up...`);
        // Check for queued tasks or ready state
    }

    // Core execution hook called by heartbeat
    public async onHeartbeat(): Promise<void> {
        // Default implementation: check execution graph
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
