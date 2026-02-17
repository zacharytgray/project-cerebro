import * as fs from 'fs';
import * as path from 'path';
import { BrainConfigRepository } from '../data/repositories/brain-config.repository';
import { logger } from '../lib/logger';

export class BrainConfigFileSyncService {
  constructor(
    private brainConfigRepo: BrainConfigRepository,
    private configDir: string = path.join(process.cwd(), 'config', 'brain-configs')
  ) {}

  private filePath(brainId: string): string {
    return path.join(this.configDir, `${brainId}.json`);
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
  }

  /**
   * Create missing files from DB (one-time bootstrap behavior).
   */
  bootstrapMissingFilesFromDb(brainIds: string[]): void {
    this.ensureDir();

    for (const brainId of brainIds) {
      const p = this.filePath(brainId);
      if (fs.existsSync(p)) continue;

      const dbConfig = this.brainConfigRepo.get(brainId);
      if (!dbConfig) continue;

      fs.writeFileSync(p, JSON.stringify(dbConfig, null, 2) + '\n', 'utf-8');
      logger.info('Bootstrapped brain config file from DB', { brainId, path: p });
    }
  }

  /**
   * File-first sync: if file exists, apply it to DB.
   */
  applyFilesToDb(brainIds: string[]): void {
    this.ensureDir();

    for (const brainId of brainIds) {
      const p = this.filePath(brainId);
      if (!fs.existsSync(p)) continue;

      try {
        const raw = fs.readFileSync(p, 'utf-8');
        const parsed = JSON.parse(raw || '{}');
        this.brainConfigRepo.set(brainId, parsed);
        logger.info('Applied brain config file to DB', { brainId, path: p });
      } catch (error) {
        logger.error('Failed to apply brain config file', error as Error, { brainId, path: p });
      }
    }
  }

  /**
   * Export all DB configs to files (manual sync helper).
   */
  exportDbToFiles(): void {
    this.ensureDir();

    const all = this.brainConfigRepo.getAll();
    for (const row of all) {
      const p = this.filePath(row.brainId);
      fs.writeFileSync(p, JSON.stringify(row.config || {}, null, 2) + '\n', 'utf-8');
      logger.info('Exported brain config DB row to file', { brainId: row.brainId, path: p });
    }
  }
}
