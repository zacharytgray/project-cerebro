/**
 * OpenClaw adapter - wraps OpenClaw Gateway API client
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { logger } from '../lib/logger';
import { OpenClawError } from '../lib/errors';

const execAsync = promisify(exec);

export interface OpenClawAgentConfig {
  agentId: string;
  gatewayUrl: string;
  token: string;
}

export interface OpenClawTaskPayload {
  prompt: string;
  model?: string;
  thinking?: 'low' | 'medium' | 'high';
}

export class OpenClawAdapter {
  constructor(
    private gatewayUrl: string,
    private token: string
  ) {}

  /**
   * Execute a task with an OpenClaw agent
   */
  async executeTask(agentId: string, payload: OpenClawTaskPayload): Promise<string> {
    logger.info('Executing task with OpenClaw agent', {
      agentId,
      promptLength: payload.prompt.length,
      model: payload.model,
    });

    try {
      // In the existing code, this uses the `openclaw` CLI tool
      // For now, we'll keep the same approach
      const command = this.buildCommand(agentId, payload);
      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        logger.warn('OpenClaw execution warnings', { stderr });
      }

      logger.info('OpenClaw task completed', {
        agentId,
        outputLength: stdout.length,
      });

      return stdout;
    } catch (error) {
      logger.error('OpenClaw task execution failed', error as Error, { agentId });
      throw new OpenClawError('OpenClaw task execution failed');
    }
  }

  /**
   * Build the openclaw CLI command
   */
  private buildCommand(agentId: string, payload: OpenClawTaskPayload): string {
    const parts: string[] = ['openclaw', 'agent', 'run'];
    
    parts.push('--agent', agentId);
    parts.push('--gateway', this.gatewayUrl);
    parts.push('--token', this.token);
    
    if (payload.model) {
      parts.push('--model', payload.model);
    }
    
    if (payload.thinking) {
      parts.push('--thinking', payload.thinking);
    }
    
    // Escape the prompt
    const escapedPrompt = payload.prompt.replace(/"/g, '\\"');
    parts.push('--prompt', `"${escapedPrompt}"`);

    return parts.join(' ');
  }

  /**
   * Get schedule context (calls get-schedule.js script)
   */
  async getScheduleContext(): Promise<string> {
    try {
      const { stdout } = await execAsync('node dist/scripts/get-schedule.js', {
        cwd: process.cwd(),
      });
      logger.debug('Schedule context retrieved', {
        outputLength: stdout.length,
      });
      return stdout;
    } catch (error) {
      logger.error('Failed to get schedule context', error as Error);
      return '';
    }
  }
}
