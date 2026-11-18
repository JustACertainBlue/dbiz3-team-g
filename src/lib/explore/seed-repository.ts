import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import type { CsvRow, ExploreSeed } from './catalog';
import { demoRepository } from '../db/application-store';

const tables = [
  'experiences', 'provider_profiles', 'provider_profile_versions', 'villages',
  'user_accounts', 'agency_profiles', 'agency_preference_profiles',
  'profile_media', 'stored_files', 'provider_operating_hours', 'bookings',
  'experience_discount_rules', 'provider_version_media', 'ranking_parameter_versions', 'explore_interactions', 'explore_sessions'
] as const;

export function loadExploreSeed(root = process.cwd()): ExploreSeed {
  const result: Partial<ExploreSeed> = {};
  for (const table of tables) {
    const csv = readFileSync(join(root, 'data', 'seed', `${table}.csv`), 'utf8');
    result[table] = parse(csv, { columns: true, skip_empty_lines: true, bom: true }) as CsvRow[];
  }
  return result as ExploreSeed;
}

export async function loadExploreRuntime(): Promise<ExploreSeed> {
  return (await demoRepository().snapshot(tables)) as unknown as ExploreSeed;
}

/**
 * experience_slots (migration 20261118120000_hab_ui_v3_content.sql, UI v3 Đợt 1). Until the migration is applied the
 * table does not exist (live store: "Unknown persisted table"; JSON fixtures: no such table), so an empty list is
 * returned and the slot table on the detail page shows its empty state.
 */
export async function loadExperienceSlots(): Promise<CsvRow[]> {
  try { return (await demoRepository().all('experience_slots')) as unknown as CsvRow[] } catch { return [] }
}
