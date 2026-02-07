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
    const command = this.buildCommand(agentId, payload);
    
    logger.info('Executing task with OpenClaw agent', {
      agentId,
      promptLength: payload.prompt.length,
      model: payload.model,
      thinking: payload.thinking,
      command: command.substring(0, 200) + (command.length > 200 ? '...' : ''), // Log truncated command for debugging
    });

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 600000, // 10 minute timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer for large responses
      });

      if (stderr) {
        logger.warn('OpenClaw execution stderr output', { 
          agentId,
          stderr: stderr.substring(0, 500),
        });
      }

      logger.info('OpenClaw task completed successfully', {
        agentId,
        outputLength: stdout.length,
        outputPreview: stdout.substring(0, 200),
      });

      // If using --json, parse the response and extract text from payloads
      try {
        const jsonResponse = JSON.parse(stdout);
        // Extract text from result.payloads array (OpenClaw JSON format)
        if (jsonResponse.result?.payloads && Array.isArray(jsonResponse.result.payloads)) {
          const texts = jsonResponse.result.payloads
            .map((p: any) => p.text?.trim())
            .filter((t: string | null) => t && t.length > 0);
          
          // Deduplicate texts (agent sometimes sends same content multiple times)
          const uniqueTexts: string[] = [];
          for (const text of texts) {
            // Check if this text is a substring of any already-seen text (or vice versa)
            const isDuplicate = uniqueTexts.some(
              seen => seen.includes(text) || text.includes(seen)
            );
            if (!isDuplicate) {
              uniqueTexts.push(text);
            }
          }
          
          if (uniqueTexts.length > 0) {
            return uniqueTexts.join('\n\n');
          }
        }
        // Fallback to other common fields
        return jsonResponse.output || jsonResponse.message || jsonResponse.text || stdout;
      } catch {
        // Not JSON, return raw output
        return stdout;
      }
    } catch (error: any) {
      // Capture detailed error information
      const errorDetails = {
        agentId,
        promptLength: payload.prompt.length,
        exitCode: error.code,
        signal: error.signal,
        killed: error.killed,
        stdout: error.stdout?.substring(0, 1000) || '',
        stderr: error.stderr?.substring(0, 1000) || '',
        message: error.message,
        command: command.substring(0, 100) + '...',
      };
      
      logger.error('OpenClaw task execution failed', error as Error, errorDetails);
      
      // Include more context in the thrown error
      const detailedMessage = `OpenClaw task execution failed for agent "${agentId}": ${error.message || 'Unknown error'}. ` +
        `Exit code: ${error.code || 'N/A'}. ` +
        `Stderr: ${error.stderr?.substring(0, 200) || 'None'}`;
      
      throw new OpenClawError(detailedMessage);
    }
  }

  /**
   * Build the openclaw CLI command
   * 
   * OpenClaw CLI usage:
   *   openclaw agent --agent <id> --message <text> [--thinking <level>] [--json]
   * 
   * Note: --gateway and --token are not CLI flags; they're configured via
   * ~/.openclaw/openclaw.json or environment variables.
   * 
   * We use the full path to openclaw because the PATH may not be set correctly
   * when running from a systemd service or backgrounded node process.
   */
  private buildCommand(agentId: string, payload: OpenClawTaskPayload): string {
    // Use full path to openclaw CLI to ensure it's found regardless of PATH
    const openclawPath = process.env.OPENCLAW_CLI_PATH || '/home/zgray/.npm-global/bin/openclaw';
    const parts: string[] = [openclawPath, 'agent'];
    
    parts.push('--agent', agentId);
    
    if (payload.thinking) {
      parts.push('--thinking', payload.thinking);
    }
    
    // Use --json for structured output that's easier to parse
    parts.push('--json');
    
    // Escape the message for shell. The message goes via --message (not --prompt).
    // Use single quotes and escape any single quotes in the content.
    const escapedMessage = payload.prompt.replace(/'/g, "'\\''");
    parts.push('--message', `'${escapedMessage}'`);

    return parts.join(' ');
  }

  /**
   * Send a message via OpenClaw CLI
   */
  async sendMessage(to: string, message: string): Promise<void> {
    const openclawPath = process.env.OPENCLAW_CLI_PATH || '/home/zgray/.npm-global/bin/openclaw';
    const parts: string[] = [openclawPath, 'message', 'send'];
    
    // Target channel or user
    parts.push('--to', to); // OpenClaw CLI uses --to which maps to target in the message tool
    
    // Message content (escaped)
    const escapedMessage = message.replace(/'/g, "'\\''");
    parts.push('--message', `'${escapedMessage}'`);

    const command = parts.join(' ');

    logger.debug('Sending message via OpenClaw', { to, command: command.substring(0, 50) + '...' });

    try {
      await execAsync(command);
      logger.info('Message sent via OpenClaw', { to });
    } catch (error: any) {
      logger.error('Failed to send message via OpenClaw', error as Error, { to });
      throw new OpenClawError(`Failed to send message: ${error.message}`);
    }
  }

  /**
   * Get schedule context (calls get-schedule.js script)
   */
  async getScheduleContext(): Promise<string> {
    try {
      // Use absolute path to ensure script is found regardless of cwd
      const scriptPath = '/home/zgray/.openclaw/workspace/project-cerebro/dist/scripts/get-schedule.js';
      const { stdout } = await execAsync(`node ${scriptPath}`);
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
