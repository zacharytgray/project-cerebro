/**
 * Discord adapter - wraps Discord client for cleaner interface
 */

import { Client, GatewayIntentBits, TextChannel, Message } from 'discord.js';
import { logger } from '../lib/logger';
import { DiscordError } from '../lib/errors';

export class DiscordAdapter {
  private client: Client;
  private ready: boolean = false;

  constructor(private token: string) {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    });

    this.client.on('ready', () => {
      this.ready = true;
      logger.info('Discord client ready', {
        username: this.client.user?.username,
        id: this.client.user?.id,
      });
    });

    this.client.on('error', (error) => {
      logger.error('Discord client error', error);
    });
  }

  /**
   * Connect to Discord
   */
  async connect(): Promise<void> {
    try {
      await this.client.login(this.token);
      logger.info('Discord client logged in');
    } catch (error) {
      logger.error('Failed to connect to Discord', error as Error);
      throw new DiscordError('Failed to connect to Discord');
    }
  }

  /**
   * Disconnect from Discord
   */
  async disconnect(): Promise<void> {
    try {
      await this.client.destroy();
      this.ready = false;
      logger.info('Discord client disconnected');
    } catch (error) {
      logger.error('Failed to disconnect from Discord', error as Error);
      throw new DiscordError('Failed to disconnect from Discord');
    }
  }

  /**
   * Send a message to a channel
   */
  async sendMessage(channelId: string, content: string): Promise<void> {
    if (!this.ready) {
      throw new DiscordError('Discord client not ready');
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      if (!channel || !channel.isTextBased()) {
        throw new DiscordError(`Channel ${channelId} not found or not text-based`);
      }

      await (channel as TextChannel).send(content);
      logger.debug('Message sent to Discord', {
        channelId,
        contentLength: content.length,
      });
    } catch (error) {
      logger.error('Failed to send message to Discord', error as Error, { channelId });
      throw new DiscordError('Failed to send message to Discord');
    }
  }

  /**
   * Register a message handler for a specific channel
   */
  onMessage(channelId: string, handler: (message: string) => void | Promise<void>): void {
    this.client.on('messageCreate', async (message: Message) => {
      // Ignore bot messages
      if (message.author.bot) {
        return;
      }

      // Only handle messages from the specified channel
      if (message.channelId !== channelId) {
        return;
      }

      try {
        await handler(message.content);
      } catch (error) {
        logger.error('Message handler error', error as Error, {
          channelId,
          messageId: message.id,
        });
      }
    });

    logger.debug('Message handler registered', { channelId });
  }

  /**
   * Get the underlying Discord client
   */
  getClient(): Client {
    return this.client;
  }

  /**
   * Check if client is ready
   */
  isReady(): boolean {
    return this.ready;
  }
}
