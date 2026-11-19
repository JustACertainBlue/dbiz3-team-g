// DEV only (human decision 2026-11-19, part C): load the reviewed UI v3 content draft into the DEV database.
//   node scripts/db/dev-load-content.mjs --dir=<content-draft/out> [--dry-run | --apply]
//   node scripts/db/dev-load-content.mjs --undo=<journal.json> [--dry-run | --apply]
// Reads experiences.csv, providers.csv, villages.csv, agencies.csv and users.csv (columns as in the draft's SPEC.md).
// - Refuses to connect unless DATABASE_URL names the DEV project ref (also for --dry-run); PROD is always refused.
// - Needs migration 20261118120000_hab_ui_v3_content.sql applied (checked before anything else).
// - --dry-run (default): validates the CSVs, then runs every write inside one transaction and rolls it back, so the
//   database's CHECK, FK and trigger rules are exercised (human decision 2026-11-19); prints how many rows would change.
// - --apply: one transaction. Every UPDATE must hit exactly one row, else everything rolls back. Before writing, the
//   current values of every changed column (and the old experience_slots rows) go to an undo journal outside the repo
//   (~/.hab-content-load/), and one audit_logs row (actor NULL = System, action SEED_CONTENT_LOAD) records the run.
// - --undo=<journal>: restores the saved values in one transaction (dry run unless --apply).
// - Prints counts and ids only; no names, e-mails or secrets.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { pathToFileURL } from 'node:url'
import { parse } from 'csv-parse/sync'
import { projectRefFromDatabaseUrl } from './lecturer-accounts.mjs'

export const DEV_PROJECT_REF = 'jfrpnffknjpgmkyquxql'
export const PROD_PROJECT_REF = 'euxclvszgiknjosbwjya'
const MIGRATION = 'supabase/migrations/20261118120000_hab_ui_v3_content.sql'
const FILES = ['experiences.csv', 'providers.csv', 'villages.csv', 'agencies.csv', 'users.csv']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const refuse = message => { throw new Error(`${message} Nothing was changed.`) }

export function parseArgs(argv) {
  const opts = { apply: false, dir: null, undo: null }
  for (const arg of argv) {
    if (arg === '--apply') opts.apply = true
    else if (arg === '--dry-run') opts.dryRun = true
    else if (arg.startsWith('--dir=')) opts.dir = arg.slice(6)
    else if (arg.startsWith('--undo=')) opts.undo = arg.slice(7)
    else refuse(`Unknown option ${arg}.`)
  }
  if (opts.apply && opts.dryRun) refuse('Choose either --dry-run or --apply.')
  if (!opts.dir === !opts.undo) refuse('Give exactly one of --dir=<folder> or --undo=<journal>.')
  delete opts.dryRun
  return opts
}

export function assertDevTarget(env) {
  if (!env.DATABASE_URL) refuse('DATABASE_URL is not configured.')
  const ref = projectRefFromDatabaseUrl(env.DATABASE_URL)
  if (ref === PROD_PROJECT_REF) refuse('DATABASE_URL points to PROD.')
  if (ref !== DEV_PROJECT_REF) refuse(`DATABASE_URL points to project ref "${ref}", which is not the DEV project.`)
  return ref
}

/** suitable_for vocabulary of the migration's CHECK constraint. */
export function vocabulary(sql = readFileSync(MIGRATION, 'utf8')) {
  const list = sql.match(/suitable_for <@ ARRAY\[([\s\S]*?)\]::text\[\]/)?.[1] ?? ''
  return [...list.matchAll(/'([^']+)'/g)].map(m => m[1])
}

export function readDraft(dir) {
  return Object.fromEntries(FILES.map(file => [file.replace('.csv', ''),
    parse(readFileSync(join(dir, file), 'utf8'), { columns: true, skip_empty_lines: true, bom: true })]))
}

const json = (value, what) => { try { return JSON.parse(value) } catch { refuse(`${what} is not valid JSON.`) } }
const nonEmpty = value => typeof value === 'string' && value.trim() !== ''
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

/**
 * The writes, as plain data: [{ table, key: {column: id}, set: {column: value} }] plus slot rows per experience.
 * Throws (nothing written) on any invalid value. JSON columns are passed as JSON text, text[] as JS arrays.
 */
export function plan(draft, vocab = vocabulary()) {
  /** @type {Array<{table: string, key: Record<string, string>, set: Record<string, unknown>, published?: boolean}>} */
  const updates = []
  /** @type {Record<string, Array<{label: string, start_time: string, end_time: string, weekdays: number[]}>>} */
  const slots = {}
  const id = (value, what) => { if (!UUID.test(value ?? '')) refuse(`${what}: "${value}" is not a uuid.`); return value }
  for (const row of draft.experiences) {
    const where = `experience ${id(row.experience_id, 'experience_id')}`
    const highlights = json(row.highlights, `${where} highlights`)
    if (!Array.isArray(highlights) || highlights.length > 4 || highlights.some(item => !nonEmpty(item?.title))) refuse(`${where}: highlights must be 1–4 items with a title.`)
    const inclusions = json(row.inclusions, `${where} inclusions`)
    if (!inclusions || typeof inclusions !== 'object' || Array.isArray(inclusions)) refuse(`${where}: inclusions must be an object.`)
    const suitable = json(row.suitable_for, `${where} suitable_for`)
    const outside = suitable.filter(term => !vocab.includes(term))
    if (outside.length) refuse(`${where}: suitable_for outside the migration vocabulary: ${outside.join(', ')}.`)
    const languages = json(row.guide_languages, `${where} guide_languages`)
    if (!Array.isArray(languages) || !languages.every(nonEmpty)) refuse(`${where}: guide_languages must be a list of strings.`)
    const set = { highlights: JSON.stringify(highlights), inclusions: JSON.stringify(inclusions), guide_languages: languages,
      child_policy: row.child_policy || null, suitable_for: suitable }
    if (nonEmpty(row.new_name)) set.name = row.new_name.trim()
    if (nonEmpty(row.new_description)) set.description = row.new_description.trim()
    updates.push({ table: 'experiences', key: { experience_id: row.experience_id }, set })
    slots[row.experience_id] = json(row.slots, `${where} slots`).map(slot => {
      if (!nonEmpty(slot.label) || !TIME.test(slot.start) || !TIME.test(slot.end) || slot.end <= slot.start) refuse(`${where}: invalid slot.`)
      if (!Array.isArray(slot.weekdays) || !slot.weekdays.length || slot.weekdays.some(day => !Number.isInteger(day) || day < 1 || day > 7)) refuse(`${where}: invalid slot weekdays.`)
      return { label: slot.label, start_time: slot.start, end_time: slot.end, weekdays: slot.weekdays }
    })
  }
  for (const row of draft.providers) {
    const where = `provider ${id(row.provider_id, 'provider_id')}`
    const year = row.founded_year === '' ? null : Number(row.founded_year)
    if (year !== null && !(Number.isInteger(year) && year >= 1000 && year <= 2100)) refuse(`${where}: founded_year out of range.`)
    updates.push({ table: 'provider_profiles', key: { provider_id: row.provider_id }, set: { founded_year: year, parking_note: row.parking_note || null } })
    if (nonEmpty(row.new_business_name)) {
      const set = { business_name: row.new_business_name.trim() }
      if (nonEmpty(row.new_description)) set.description = row.new_description.trim()
      updates.push({ table: 'provider_profile_versions', key: { provider_id: row.provider_id }, published: true, set })
    }
  }
  for (const row of draft.villages) {
    const where = `village ${id(row.village_id, 'village_id')}`
    const km = row.distance_km === '' ? null : Number(row.distance_km)
    if (km !== null && !(Number.isFinite(km) && km >= 0)) refuse(`${where}: distance_km must be a number ≥ 0.`)
    const highlights = row.highlights ? json(row.highlights, `${where} highlights`) : null
    if (highlights && (!Array.isArray(highlights) || highlights.length > 4)) refuse(`${where}: highlights must be at most 4 items.`)
    const object = (value, what) => { if (!value) return null; const data = json(value, `${where} ${what}`); if (!data || typeof data !== 'object' || Array.isArray(data)) refuse(`${where}: ${what} must be an object.`); return JSON.stringify(data) }
    const set = { distance_km: km, visit_notes: object(row.visit_notes, 'visit_notes'), tour_suggestion_detail: object(row.tour_suggestion_detail, 'tour_suggestion_detail'),
      highlights: highlights ? JSON.stringify(highlights) : null }
    if (nonEmpty(row.description_new)) set.description = row.description_new.trim()
    if (nonEmpty(row.editorial_craft)) set.editorial_craft = row.editorial_craft.trim()
    if (nonEmpty(row.tour_suggestion)) set.tour_suggestion = row.tour_suggestion.trim()
    updates.push({ table: 'villages', key: { village_id: row.village_id }, set })
  }
  for (const row of draft.agencies) {
    id(row.agency_id, 'agency_id')
    if (!nonEmpty(row.new_company_name)) refuse(`agency ${row.agency_id}: new_company_name is empty.`)
    updates.push({ table: 'agency_profiles', key: { agency_id: row.agency_id }, set: { company_name: row.new_company_name.trim(), description: row.new_description || null } })
  }
  for (const row of draft.users) {
    id(row.user_id, 'user_id')
    if (!nonEmpty(row.new_full_name)) refuse(`user ${row.user_id}: new_full_name is empty.`)
    updates.push({ table: 'user_accounts', key: { user_id: row.user_id }, set: { full_name: row.new_full_name.trim() } })
  }
  const seen = new Set()
  for (const update of updates) {
    const key = `${update.table}:${Object.values(update.key)[0]}:${update.published ? 'v' : ''}`
    if (seen.has(key)) refuse(`Duplicate row for ${key}.`)
    seen.add(key)
  }
  return { updates, slots }
}

export function summary({ updates, slots }) {
  const counts = {}
  for (const update of updates) counts[update.table] = (counts[update.table] ?? 0) + 1
  counts.experience_slots = Object.values(slots).reduce((n, list) => n + list.length, 0)
  return counts
}

const CAST = { highlights: '::jsonb', inclusions: '::jsonb', visit_notes: '::jsonb', tour_suggestion_detail: '::jsonb', guide_languages: '::text[]', suitable_for: '::text[]' }
const versionWhere = `provider_id = $1 AND version_no = (SELECT published_version_no FROM provider_profiles WHERE provider_id = $1)`

/** SELECT of the current values of the columns an update changes (FOR UPDATE when applying). */
export function selectSql(update, lock) {
  const columns = Object.keys(update.set).map(column => CAST[column] === '::jsonb' ? `${column}::text AS ${column}` : column).join(', ')
  const where = update.published ? versionWhere : `${Object.keys(update.key)[0]} = $1`
  return `SELECT ${columns} FROM ${update.table} WHERE ${where}${lock ? ' FOR UPDATE' : ''}`
}

/** SELECT telling whether the update would change the row (any column IS DISTINCT FROM its new value). */
export function changedSql(update) {
  const columns = Object.keys(update.set)
  const where = update.published ? versionWhere : `${Object.keys(update.key)[0]} = $1`
  const tests = columns.map((column, index) => `${column} IS DISTINCT FROM $${index + 2}${CAST[column] ?? ''}`)
  return { text: `SELECT (${tests.join(' OR ')}) AS changed FROM ${update.table} WHERE ${where}`, values: [Object.values(update.key)[0], ...columns.map(column => update.set[column])] }
}

const slotKey = rows => JSON.stringify(rows.map(row => [row.label, row.start_time, row.end_time, [...row.weekdays].map(Number)]))

export function updateSql(update) {
  const columns = Object.keys(update.set)
  const assignments = columns.map((column, index) => `${column} = $${index + 2}${CAST[column] ?? ''}`)
  if (['experiences', 'provider_profiles', 'villages', 'agency_profiles', 'user_accounts'].includes(update.table)) assignments.push('updated_at = now()')
  const where = update.published ? versionWhere : `${Object.keys(update.key)[0]} = $1`
  return { text: `UPDATE ${update.table} SET ${assignments.join(', ')} WHERE ${where}`, values: [Object.values(update.key)[0], ...columns.map(column => update.set[column])] }
}

const REQUIRED_COLUMNS = [['experiences', 'suitable_for'], ['provider_profiles', 'founded_year'], ['villages', 'highlights'], ['villages', 'distance_km']]

async function assertMigration(client) {
  const { rows } = await client.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND (table_name, column_name) IN (${REQUIRED_COLUMNS.map((_, i) => `($${2 * i + 1}, $${2 * i + 2})`).join(', ')})`, REQUIRED_COLUMNS.flat())
  const slots = await client.query(`SELECT to_regclass('public.experience_slots') IS NOT NULL AS present`)
  if (rows.length !== REQUIRED_COLUMNS.length || !slots.rows[0]?.present) refuse(`Migration ${MIGRATION} is not applied on this database.`)
}

/** @param {{argv: string[], env: object, connect: () => any, log: {log: Function}, now?: () => Date, journalDir?: string, readFile?: Function}} deps */
export async function run({ argv, env, connect, log, now = () => new Date(), journalDir = join(homedir(), '.hab-content-load'), readFile = path => readFileSync(path, 'utf8') }) {
  const opts = parseArgs(argv)
  const ref = assertDevTarget(env)
  const work = opts.undo ? null : plan(readDraft(opts.dir))
  const journal = opts.undo ? JSON.parse(readFile(opts.undo)) : null
  if (journal && journal.projectRef !== DEV_PROJECT_REF) refuse('The journal was not written for the DEV project.')
  log.log(JSON.stringify({ projectRef: ref, isDev: true, mode: `${opts.undo ? 'undo' : 'load'} ${opts.apply ? 'apply' : 'dry-run'}` }))
  log.log(JSON.stringify({ rows: opts.undo ? { restore: journal.before.length, slotExperiences: Object.keys(journal.slots).length } : summary(work) }))
  const client = connect()
  await client.connect()
  try {
    await client.query('BEGIN')
    if (!opts.apply && opts.undo) await client.query('SET TRANSACTION READ ONLY')
    await assertMigration(client)
    if (opts.undo) {
      for (const entry of journal.before) {
        const update = { ...entry, set: entry.values }
        const { text, values } = updateSql(update)
        if (opts.apply && (await client.query(text, values)).rowCount !== 1) refuse(`Restore of ${entry.table} ${Object.values(entry.key)[0]} did not hit one row; rolled back.`)
      }
      if (opts.apply) for (const [experienceId, rows] of Object.entries(journal.slots)) await replaceSlots(client, experienceId, rows)
      if (!opts.apply) { await client.query('ROLLBACK'); log.log('Dry run: READ ONLY transaction rolled back, nothing was written.'); return { restored: 0 } }
      await audit(client, now, { mode: 'undo', journal: opts.undo, rows: journal.before.length })
      await client.query('COMMIT')
      log.log(`Restored ${journal.before.length} row(s) and the slots of ${Object.keys(journal.slots).length} experience(s).`)
      return { restored: journal.before.length }
    }
    const before = [], missing = []
    for (const update of work.updates) {
      const { rows } = await client.query(selectSql(update, true), [Object.values(update.key)[0]])
      if (rows.length !== 1) { missing.push(`${update.table} ${Object.values(update.key)[0]}`); continue }
      before.push({ table: update.table, key: update.key, published: update.published, values: rows[0] })
    }
    if (missing.length) refuse(`${missing.length} target row(s) not found: ${missing.slice(0, 5).join('; ')}.`)
    const oldSlots = {}
    for (const experienceId of Object.keys(work.slots)) {
      oldSlots[experienceId] = (await client.query(`SELECT label, to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time, weekdays FROM experience_slots WHERE experience_id = $1 ORDER BY start_time`, [experienceId])).rows
    }
    let changed = 0
    for (const update of work.updates) {
      const { text, values } = changedSql(update)
      if ((await client.query(text, values)).rows[0]?.changed) changed++
    }
    const slotChanges = Object.keys(work.slots).filter(id => slotKey(oldSlots[id] ?? []) !== slotKey(work.slots[id])).length
    let file = null
    if (opts.apply) {
      mkdirSync(journalDir, { recursive: true })
      file = join(journalDir, `content-load-${now().toISOString().replace(/[:.]/g, '-')}.json`)
      writeFileSync(file, JSON.stringify({ projectRef: ref, createdAt: now().toISOString(), before, slots: oldSlots }, null, 1))
    }
    for (const update of work.updates) {
      const { text, values } = updateSql(update)
      if ((await client.query(text, values)).rowCount !== 1) refuse(`Update of ${update.table} ${Object.values(update.key)[0]} did not hit one row; rolled back.`)
    }
    for (const [experienceId, rows] of Object.entries(work.slots)) await replaceSlots(client, experienceId, rows)
    await audit(client, now, { mode: opts.apply ? 'load' : 'load dry-run', counts: summary(work), journal: file })
    log.log(`${changed} of ${work.updates.length} row(s) would change; slots of ${slotChanges} experience(s) would change.`)
    if (!opts.apply) {
      await client.query('ROLLBACK')
      log.log(`All ${before.length} target rows found and every write passed the database rules. Dry run: rolled back, nothing kept.`)
      return { updated: 0, planned: work.updates.length, changed, slotChanges }
    }
    await client.query('COMMIT')
    log.log(`Updated ${work.updates.length} row(s) and ${summary(work).experience_slots} slot(s). Undo journal: ${file}`)
    return { updated: work.updates.length, journal: file, changed, slotChanges }
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally {
    await client.end()
  }
}

async function replaceSlots(client, experienceId, rows) {
  await client.query('DELETE FROM experience_slots WHERE experience_id = $1', [experienceId])
  for (const row of rows) {
    await client.query('INSERT INTO experience_slots (experience_id, label, start_time, end_time, weekdays) VALUES ($1, $2, $3, $4, $5::smallint[])',
      [experienceId, row.label, row.start_time, row.end_time, row.weekdays])
  }
}

async function audit(client, now, result) {
  await client.query(`INSERT INTO audit_logs (audit_id, actor_user_id, action, target_type, target_id, occurred_at, change_or_result) VALUES ($1, NULL, 'SEED_CONTENT_LOAD', 'content_draft', NULL, $2, $3::jsonb)`,
    [randomUUID(), now().toISOString(), JSON.stringify({ reason: 'seed content load', ...result })])
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const { connection } = await import('./shared.mjs')
  run({ argv: process.argv.slice(2), env: process.env, connect: () => connection('migration'), log: console })
    .catch(error => { console.error(error.message); process.exitCode = 1 })
}
