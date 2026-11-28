import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'csv-parse/sync';
import type { CsvRow, ExploreSeed } from './catalog';
import { demoRepository } from '../db/application-store';
import { cachedRows } from '../db/read-cache';

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

// Egress audit: pages used to snapshot 16 tables (including the unbounded explore_sessions / explore_interactions and
// every password hash) on each render. Now: catalog tables come from a 30 s in-process cache, the live ones
// (bookings, agencies, accounts) are read fresh, accounts without secrets, and the session tables only on request.
const CATALOG = ['experiences', 'provider_profiles', 'provider_profile_versions', 'villages', 'profile_media', 'stored_files',
  'provider_operating_hours', 'experience_discount_rules', 'provider_version_media', 'ranking_parameter_versions'] as const;
const LIVE = ['agency_profiles', 'agency_preference_profiles', 'bookings'] as const;
const SESSION = ['explore_interactions', 'explore_sessions'] as const;
const ACCOUNT_COLUMNS = ['user_id', 'role_code', 'account_status', 'full_name'] as const;

export async function loadExploreRuntime(options: { sessions?: boolean } = {}): Promise<ExploreSeed> {
  const repository = demoRepository();
  const read = async (names: readonly string[], load: (name: string) => Promise<CsvRow[]>) =>
    Object.fromEntries(await Promise.all(names.map(async name => [name, await load(name)] as const)));
  const [catalog, live, sessions, accounts] = await Promise.all([
    read(CATALOG, name => cachedRows(name, () => repository.all(name)) as Promise<CsvRow[]>),
    read(LIVE, name => repository.all(name) as Promise<CsvRow[]>),
    options.sessions ? read(SESSION, name => repository.all(name) as Promise<CsvRow[]>) : {},
    repository.project('user_accounts', ACCOUNT_COLUMNS),
  ]);
  return { ...catalog, ...live, ...sessions, user_accounts: accounts } as unknown as ExploreSeed;
}

/**
 * experience_slots (migration 20261118120000_hab_ui_v3_content.sql, UI v3 Đợt 1). Until the migration is applied the
 * table does not exist (live store: "Unknown persisted table"; JSON fixtures: no such table), so an empty list is
 * returned and the slot table on the detail page shows its empty state.
 */
export async function loadExperienceSlots(): Promise<CsvRow[]> {
  try { return (await cachedRows('experience_slots', () => demoRepository().all('experience_slots'))) as unknown as CsvRow[] } catch { return [] }
}
