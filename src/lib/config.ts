/**
 * Type-safe configuration loader
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { logger } from './logger';
import { ValidationError } from './errors';

dotenv.config();

export interface BrainConfig {
  id: string;
  name: string;
  channelKey: string;
  type: 'context' | 'job';
  description: string;
  openClawAgentId?: string;
}

export interface SpecialBrainConfig {
  id: string;
  name: string;
  channelKey: string;
  description: string;
  openClawAgentId?: string;
}

export interface BrainsConfigFile {
  brains: BrainConfig[];
  nexus: SpecialBrainConfig;
  digest: SpecialBrainConfig;
}

export interface DiscordConfig {
  server: string;
  channels: Record<string, string>;
}

export interface AppConfig {
  port: number;
  dbPath: string;
  discordToken: string;
  openClawGatewayUrl: string;
  openClawToken: string;
  logLevel: string;
  timezone: string;
  brains: BrainsConfigFile;
  discord: DiscordConfig;
}

class ConfigLoader {
  private config: AppConfig | null = null;

  load(): AppConfig {
    if (this.config) {
      return this.config;
    }

    try {
      // Load environment variables
      const port = parseInt(process.env.PORT || '3000', 10);
      const dbPath = process.env.DB_PATH || path.join(__dirname, '../../cerebro.db');
      const discordToken = this.requireEnv('DISCORD_BOT_TOKEN');
      const openClawGatewayUrl = this.requireEnv('OPENCLAW_GATEWAY_URL');
      const openClawToken = this.requireEnv('OPENCLAW_TOKEN');
      const logLevel = process.env.LOG_LEVEL || 'info';
      const timezone = process.env.TZ || 'America/Chicago';

      // Load config files
      const brainsPath = path.join(__dirname, '../../config/brains.json');
      const discordPath = path.join(__dirname, '../../config/discord_ids.json');

      if (!fs.existsSync(brainsPath)) {
        throw new ValidationError(`Brains config file not found at ${brainsPath}`);
      }

      if (!fs.existsSync(discordPath)) {
        throw new ValidationError(`Discord config file not found at ${discordPath}`);
      }

      const brains: BrainsConfigFile = JSON.parse(
        fs.readFileSync(brainsPath, 'utf-8')
      );
      const discord: DiscordConfig = JSON.parse(
        fs.readFileSync(discordPath, 'utf-8')
      );

      this.config = {
        port,
        dbPath,
        discordToken,
        openClawGatewayUrl,
        openClawToken,
        logLevel,
        timezone,
        brains,
        discord,
      };

      logger.info('Configuration loaded successfully', {
        port,
        dbPath,
        brainsCount: brains.brains.length,
        timezone,
      });

      return this.config;
    } catch (error) {
      logger.error('Failed to load configuration', error as Error);
      throw error;
    }
  }

  private requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new ValidationError(`Required environment variable ${key} is not set`);
    }
    return value;
  }
}

export const configLoader = new ConfigLoader();
export const getConfig = (): AppConfig => configLoader.load();
