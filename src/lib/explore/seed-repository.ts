import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import type { CsvRow, ExploreSeed } from './catalog';

const tables = [
  'experiences', 'provider_profiles', 'provider_profile_versions', 'villages',
  'user_accounts', 'agency_profiles', 'agency_preference_profiles',
  'profile_media', 'stored_files'
] as const;

export function loadExploreSeed(root = process.cwd()): ExploreSeed {
  const result: Partial<ExploreSeed> = {};
  for (const table of tables) {
    const csv = readFileSync(join(root, 'data', 'seed', `${table}.csv`), 'utf8');
    result[table] = parse(csv, { columns: true, skip_empty_lines: true, bom: true }) as CsvRow[];
  }
  return result as ExploreSeed;
}
