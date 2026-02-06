/**
 * Digest brain - aggregates reports from other brains
 */

import { BaseBrain } from '../base-brain';
import { DigestService } from '../../services';

export class DigestBrain extends BaseBrain {
  private digestService: DigestService;

  constructor(...args: ConstructorParameters<typeof BaseBrain>) {
    super(...args);
    // We'll pass this from runtime
    this.digestService = (args as any)[5] as DigestService;
  }

  /**
   * Handle user messages from Discord
   */
  async handleUserMessage(message: string): Promise<void> {
    const parts = message.split(' ');
    const command = parts[0].toLowerCase();

    switch (command) {
      case '!digest':
        await this.handleDigest();
        break;

      case '!task':
        await this.handleTask(message.replace('!task', '').trim());
        break;

      default:
        // Ignore non-command messages
        break;
    }
  }

  /**
   * Handle !digest command
   */
  private async handleDigest(): Promise<void> {
    await this.sendMessage('🔄 Generating digest...');

    // Get all brain IDs except self
    // This would ideally be injected, but for now we'll hardcode the main brains
    const brainIds = ['personal', 'school', 'research', 'money', 'job'];

    const digest = await this.digestService.generateDigest(brainIds);
    const formatted = this.digestService.formatDigest(digest);

    // Split into chunks if needed (Discord 2000 char limit)
    const chunks = this.splitMessage(formatted, 1900);

    for (const chunk of chunks) {
      await this.sendMessage(chunk);
    }
  }

  /**
   * Handle !task command
   */
  private async handleTask(title: string): Promise<void> {
    const taskTitle = title || 'Manual Digest Task';

    this.taskRepo.create({
      brainId: this.id,
      title: taskTitle,
    });

    await this.sendMessage(`✅ Task "${taskTitle}" created.`);
  }

  /**
   * Split message into chunks
   */
  private splitMessage(text: string, maxLength: number): string[] {
    const chunks: string[] = [];
    let current = '';

    for (const line of text.split('\n')) {
      if (current.length + line.length + 1 > maxLength) {
        chunks.push(current);
        current = line;
      } else {
        current += (current ? '\n' : '') + line;
      }
    }

    if (current) {
      chunks.push(current);
    }

    return chunks;
  }
}
