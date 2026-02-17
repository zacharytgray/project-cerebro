import * as path from 'path';
import { getDatabase, closeDatabase } from '../data/database';
import { BrainConfigRepository } from '../data/repositories/brain-config.repository';
import { BrainConfigFileSyncService } from '../services/brain-config-file-sync.service';

function parseArgs() {
  const mode = process.argv[2] || 'export';
  if (!['export', 'import', 'roundtrip'].includes(mode)) {
    throw new Error(`Invalid mode: ${mode}. Use export | import | roundtrip`);
  }
  return { mode } as const;
}

async function main() {
  const { mode } = parseArgs();
  const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'cerebro.db');

  const db = getDatabase(dbPath);
  const repo = new BrainConfigRepository(db);
  const sync = new BrainConfigFileSyncService(repo);

  if (mode === 'export') {
    sync.exportDbToFiles();
    console.log('Exported DB brain configs -> config/brain-configs/*.json');
  } else if (mode === 'import') {
    const allBrainIds = repo.getAll().map((r) => r.brainId);
    sync.applyFilesToDb(allBrainIds);
    console.log('Imported file brain configs -> DB');
  } else {
    // roundtrip: create missing files first, then apply files back to DB
    const allBrainIds = repo.getAll().map((r) => r.brainId);
    sync.bootstrapMissingFilesFromDb(allBrainIds);
    sync.applyFilesToDb(allBrainIds);
    console.log('Roundtrip complete (bootstrap missing files + apply files to DB)');
  }

  closeDatabase();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
