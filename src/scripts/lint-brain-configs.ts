import * as fs from 'fs';
import * as path from 'path';
import { validateBrainConfig } from '../lib/brain-config-validator';

function main() {
  const dir = path.join(process.cwd(), 'config', 'brain-configs');

  if (!fs.existsSync(dir)) {
    console.error(`Directory not found: ${dir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();

  if (files.length === 0) {
    console.log('No brain config JSON files found.');
    process.exit(0);
  }

  let hasErrors = false;

  for (const file of files) {
    const p = path.join(dir, file);
    try {
      const raw = fs.readFileSync(p, 'utf-8');
      const parsed = JSON.parse(raw || '{}');
      const result = validateBrainConfig(parsed);
      if (!result.valid) {
        hasErrors = true;
        console.error(`✗ ${file}`);
        for (const err of result.errors) {
          console.error(`  - ${err}`);
        }
      } else {
        console.log(`✓ ${file}`);
      }
    } catch (error) {
      hasErrors = true;
      console.error(`✗ ${file}`);
      console.error(`  - ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (hasErrors) {
    console.error('\nBrain config lint failed.');
    process.exit(1);
  }

  console.log('\nBrain config lint passed.');
}

main();
