// Load the content DEV holds into PROD (human request 2026-11-21), modelled on storage:catalog-copies.
//   node scripts/db/prod-content-load.mjs --export [--snapshot <file>]                       (DEV only, read only)
//   node scripts/db/prod-content-load.mjs [--dry-run | --apply] [--snapshot <file>]          (DEV by default)
//   CONFIRM_PROJECT_REF=<prod ref> node scripts/db/prod-content-load.mjs --target-prod [--apply] [--snapshot <file>]
//   CONFIRM_PROJECT_REF=<prod ref> node scripts/db/prod-content-load.mjs --target-prod --undo <file> [--dry-run]
// What it loads: experiences (name, description, highlights, group_note, inclusions, guide_languages, child_policy,
// suitable_for), villages (description, editorial_craft, tour_suggestion, distance_km, visit_notes,
// tour_suggestion_detail, highlights), provider_profiles (founded_year, parking_note), the published provider_profile_versions
// (business_name, description) and experience_slots. Never accounts: user_accounts and agency_profiles are not on the allowlist,
// so a snapshot that names them is refused; PROD keeps its seed accounts. --export takes every experience, village and
// provider profile DEV has; a row PROD lacks makes the load refuse (nothing written).
// - --export reads DEV (ref guarded, READ ONLY transaction) and writes a checksummed snapshot under .demo-data/prod-content/.
// - The load refuses unless DATABASE_URL names DEV, or, with --target-prod, PROD and CONFIRM_PROJECT_REF equals the PROD ref
//   (typed in the shell, not read from a .env file). Checked before any connection.
// - Before writing: the migration ledger (hab_internal.migrations) must hold every migration in REQUIRED_MIGRATIONS, the columns
//   must exist, and every target row must exist. Row counts of eight tables are taken before and after.
// - Dry run (default): runs every write inside one transaction, verifies, ROLLBACK. --apply: writes the undo file first, then
//   the same writes, and COMMITs only if every table count is as expected and every row now equals the snapshot.
// - Only rows whose values differ are written, so a database that already holds the content gives 0 changes and no write.
// - --undo restores the saved values and slots, only for rows that still hold what the load wrote.
// - Prints counts and ids only; no names, e-mails or secrets.
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { projectRefFromDatabaseUrl } from './lecturer-accounts.mjs'
import { DEV_PROJECT_REF, PROD_PROJECT_REF, changedSql, replaceSlots, selectSql, slotKey, updateSql, vocabulary } from './dev-load-content.mjs'
import { resolveNotesDir } from '../storage/refresh-catalog-copies.mjs'

export { DEV_PROJECT_REF, PROD_PROJECT_REF }
export const DEFAULT_DIR = '.demo-data/prod-content'
export const DEFAULT_SNAPSHOT = `${DEFAULT_DIR}/snapshot.json`
export const REQUIRED_MIGRATIONS = Object.freeze([
  '20261117120000_hab_catalog_editorial_content.sql', '20261118101709_hab_db_only_content_columns.sql',
  '20261118120000_hab_ui_v3_content.sql', '20261119100000_hab_highlights_shape.sql',
])
/** table -> [key column, writable columns]. Anything else in a snapshot is refused. */
export const ALLOWED_COLUMNS = Object.freeze({
  experiences: { key: 'experience_id', columns: ['name', 'description', 'highlights', 'group_note', 'inclusions', 'guide_languages', 'child_policy', 'suitable_for'] },
  provider_profiles: { key: 'provider_id', columns: ['founded_year', 'parking_note'] },
  provider_profile_versions: { key: 'provider_id', columns: ['business_name', 'description'] },
  villages: { key: 'village_id', columns: ['description', 'editorial_craft', 'tour_suggestion', 'distance_km', 'visit_notes', 'tour_suggestion_detail', 'highlights'] },
})
const COUNTED = ['experiences', 'villages', 'provider_profiles', 'provider_profile_versions', 'experience_slots', 'audit_logs', 'user_accounts', 'agency_profiles']
const JSON_COLUMNS = ['highlights', 'inclusions', 'visit_notes', 'tour_suggestion_detail']
const NAME_COLUMNS = ['name', 'description', 'business_name']
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/

const refuse = message => { throw new Error(`${message} Nothing was changed.`) }
export const checksum = content => createHash('sha256').update(JSON.stringify(content)).digest('hex')
const keyOf = update => Object.values(update.key)[0]

export function parseArgs(argv) {
  const options = { apply: false, targetProd: false, export: false, undo: undefined, snapshot: DEFAULT_SNAPSHOT }
  let dryRun = false, apply = false
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--apply') apply = true
    else if (arg === '--target-prod') options.targetProd = true
    else if (arg === '--export') options.export = true
    else if (arg === '--undo' || arg === '--snapshot') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) refuse(`${arg} needs a file.`)
      options[arg === '--undo' ? 'undo' : 'snapshot'] = value
      index += 1
    } else refuse(`Unknown option ${arg}; use --export, --dry-run (default), --apply, --undo <file>, --snapshot <file> or --target-prod.`)
  }
  if (dryRun && apply) refuse('Choose either --dry-run or --apply.')
  if (options.export && (apply || dryRun || options.targetProd || options.undo)) refuse('--export is DEV only and takes no other mode (only --snapshot).')
  if (options.undo && apply) refuse('--undo writes by itself; use --undo <file> --dry-run to preview.')
  options.apply = options.undo ? !dryRun : apply
  return options
}

/** Runs before any connection. DEV unless --target-prod; with it PROD and CONFIRM_PROJECT_REF must both be the PROD ref. */
export function assertTarget(env, { targetProd = false } = {}) {
  if (!env.DATABASE_URL) refuse('DATABASE_URL is not configured.')
  const ref = projectRefFromDatabaseUrl(env.DATABASE_URL)
  if (targetProd && env.CONFIRM_PROJECT_REF !== PROD_PROJECT_REF) refuse(`--target-prod needs CONFIRM_PROJECT_REF=${PROD_PROJECT_REF} (missing or different).`)
  const expected = targetProd ? PROD_PROJECT_REF : DEV_PROJECT_REF
  if (ref !== expected) refuse(`DATABASE_URL points to project ref "${ref}", which is not the ${targetProd ? 'confirmed PROD' : 'DEV'} project.`)
  return expected
}

/** Validates a snapshot (or the before/after rows of an undo file) and returns { updates, slots }. */
export function validateSnapshot(snapshot, vocab = vocabulary()) {
  if (!snapshot || snapshot.kind !== 'hab-content-snapshot' || snapshot.version !== 1) refuse('Not a content snapshot.')
  const { updates, slots } = snapshot
  if (!Array.isArray(updates) || !slots || typeof slots !== 'object') refuse('The snapshot is incomplete.')
  if (snapshot.sha256 !== checksum({ updates, slots })) refuse('The snapshot checksum does not match its content.')
  checkUpdates(updates, vocab)
  for (const [experienceId, rows] of Object.entries(slots)) {
    if (!UUID.test(experienceId) || !Array.isArray(rows)) refuse(`Slots of "${experienceId}": not a uuid or not a list.`)
    for (const slot of rows) {
      const ok = typeof slot.label === 'string' && slot.label.trim() && TIME.test(slot.start_time) && TIME.test(slot.end_time) && slot.end_time > slot.start_time
        && Array.isArray(slot.weekdays) && slot.weekdays.length && slot.weekdays.every(day => Number.isInteger(day) && day >= 1 && day <= 7)
      if (!ok) refuse(`Experience ${experienceId}: invalid slot.`)
    }
  }
  return { updates, slots }
}

function checkUpdates(updates, vocab, { demoTag = true } = {}) {
  const seen = new Set()
  for (const update of updates) {
    const rule = ALLOWED_COLUMNS[update.table]
    if (!rule) refuse(`Table ${update.table} is not on the allowlist.`)
    const keyColumns = Object.keys(update.key ?? {})
    if (keyColumns.length !== 1 || keyColumns[0] !== rule.key || !UUID.test(keyOf(update) ?? '')) refuse(`${update.table}: key must be ${rule.key} and a uuid.`)
    if ((update.table === 'provider_profile_versions') !== Boolean(update.published)) refuse(`${update.table}: published flag is wrong.`)
    const columns = Object.keys(update.set ?? {})
    if (!columns.length) refuse(`${update.table} ${keyOf(update)}: nothing to set.`)
    for (const column of columns) if (!rule.columns.includes(column)) refuse(`${update.table}: column ${column} is not on the allowlist.`)
    for (const column of NAME_COLUMNS) if (demoTag && typeof update.set[column] === 'string' && /\[DEMO\]/i.test(update.set[column])) refuse(`${update.table} ${keyOf(update)}: ${column} still contains [DEMO].`)
    for (const term of update.set.suitable_for ?? []) if (!vocab.includes(term)) refuse(`${update.table} ${keyOf(update)}: suitable_for outside the vocabulary: ${term}.`)
    const id = `${update.table}:${keyOf(update)}`
    if (seen.has(id)) refuse(`Duplicate row for ${id}.`)
    seen.add(id)
  }
}

async function countRows(client, tables = COUNTED) {
  const counts = {}
  for (const table of tables) counts[table] = (await client.query(`SELECT count(*)::int AS n FROM public.${table}`)).rows[0].n
  return counts
}

const REQUIRED_COLUMNS = Object.entries(ALLOWED_COLUMNS).flatMap(([table, { columns }]) => columns.map(column => [table, column]))

async function assertReady(client) {
  const applied = (await client.query('SELECT name FROM hab_internal.migrations')).rows.map(row => row.name)
  const missing = REQUIRED_MIGRATIONS.filter(name => !applied.includes(name))
  if (missing.length) refuse(`The migration ledger lacks: ${missing.join(', ')}.`)
  const { rows } = await client.query(`SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND (table_name, column_name) IN (${REQUIRED_COLUMNS.map((_, i) => `($${2 * i + 1}, $${2 * i + 2})`).join(', ')})`, REQUIRED_COLUMNS.flat())
  const have = new Set(rows.map(row => `${row.table_name}.${row.column_name}`))
  const lacking = REQUIRED_COLUMNS.filter(([table, column]) => !have.has(`${table}.${column}`))
  if (lacking.length) refuse(`Columns missing on this database: ${lacking.map(pair => pair.join('.')).join(', ')}.`)
  const slotsTable = await client.query(`SELECT to_regclass('public.experience_slots') IS NOT NULL AS present`)
  if (slotsTable.rows[0]?.present === false) refuse('Table experience_slots does not exist on this database.')
}

const readSlots = async (client, experienceId) => (await client.query(`SELECT label, to_char(start_time, 'HH24:MI') AS start_time, to_char(end_time, 'HH24:MI') AS end_time, weekdays FROM experience_slots WHERE experience_id = $1 ORDER BY start_time, label`, [experienceId])).rows

async function audit(client, now, result) {
  await client.query(`INSERT INTO audit_logs (audit_id, actor_user_id, action, target_type, target_id, occurred_at, change_or_result) VALUES ($1, NULL, 'SEED_CONTENT_LOAD', 'content_draft', NULL, $2, $3::jsonb)`,
    [randomUUID(), now.toISOString(), JSON.stringify({ reason: 'seed content load into PROD', ...result })])
}

function checkCounts(before, after, expected, log) {
  const wrong = COUNTED.filter(table => after[table] !== expected[table])
  log.log(JSON.stringify({ rowCounts: Object.fromEntries(COUNTED.map(table => [table, `${before[table]} -> ${after[table]}`])) }))
  if (wrong.length) throw new Error(`Row counts are not as expected after the writes (${wrong.map(table => `${table} ${before[table]} -> ${after[table]}, expected ${expected[table]}`).join('; ')}); rolled back. Nothing was changed.`)
}

const stamp = now => now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

/**
 * @param {{apply: boolean, undo?: string, targetProd?: boolean}} options
 * @returns {Promise<any>} load report, or undo report with --undo
 * @param {{client: any, snapshot?: any, vocab?: string[], outDir: string, now?: Date, projectRef: string, log?: {log: Function}}} deps
 */
export async function run(options, deps) {
  const { client, projectRef, outDir, now = new Date(), log = console } = deps
  const work = options.undo ? null : validateSnapshot(deps.snapshot, deps.vocab)
  const undoDoc = options.undo ? readUndo(options.undo, projectRef, deps.vocab ?? vocabulary()) : null
  log.log(JSON.stringify({ projectRef, isProd: projectRef === PROD_PROJECT_REF, mode: `${options.undo ? 'undo' : 'load'} ${options.apply ? 'apply' : 'dry-run'}` }))
  await client.query('BEGIN')
  try {
    const report = options.undo ? await undoRun(options, { client, doc: undoDoc, now, log, outDir }) : await load(options, { client, work, now, log, outDir, projectRef })
    if (report.commit) await client.query('COMMIT')
    else await client.query('ROLLBACK')
    return report.result
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  }
}

async function load(options, { client, work, now, log, outDir, projectRef }) {
  await assertReady(client)
  const before = await countRows(client)
  const olds = [], missing = []
  for (const update of work.updates) {
    const { rows } = await client.query(selectSql(update, true), [keyOf(update)])
    if (rows.length !== 1) { missing.push(`${update.table} ${keyOf(update)}`); continue }
    olds.push(rows[0])
  }
  if (missing.length) refuse(`${missing.length} target row(s) not found: ${missing.slice(0, 5).join('; ')}.`)
  const changedUpdates = []
  for (const [index, update] of work.updates.entries()) {
    const { text, values } = changedSql(update)
    if ((await client.query(text, values)).rows[0]?.changed) changedUpdates.push({ update, old: olds[index] })
  }
  const oldSlots = {}, changedSlotIds = []
  for (const [experienceId, rows] of Object.entries(work.slots)) {
    oldSlots[experienceId] = await readSlots(client, experienceId)
    if (slotKey(oldSlots[experienceId]) !== slotKey(rows)) changedSlotIds.push(experienceId)
  }
  const snapshotSlots = Object.values(work.slots).reduce((n, rows) => n + rows.length, 0)
  const plan = { rows: work.updates.length, snapshotSlots, changedRows: changedUpdates.length, slotExperiencesChanged: changedSlotIds.length }
  log.log(JSON.stringify({ snapshot: plan }))
  log.log(`${plan.changedRows} of ${plan.rows} row(s) would change; slots of ${plan.slotExperiencesChanged} experience(s) would change.`)
  if (!plan.changedRows && !plan.slotExperiencesChanged) {
    log.log('Already up to date: 0 changes, nothing written.')
    return { commit: false, result: { ...plan, applied: false } }
  }

  let undoFile
  if (options.apply) {
    mkdirSync(outDir, { recursive: true })
    undoFile = join(resolve(outDir), `content-load-undo-${stamp(now)}.json`)
    const doc = {
      kind: 'hab-content-load-undo', version: 1, projectRef, createdAt: now.toISOString(),
      before: changedUpdates.map(({ update, old }) => ({ table: update.table, key: update.key, published: update.published, before: old, after: update.set })),
      slotsBefore: Object.fromEntries(changedSlotIds.map(id => [id, oldSlots[id]])), slotsAfter: Object.fromEntries(changedSlotIds.map(id => [id, work.slots[id]])),
    }
    writeFileSync(undoFile, `${JSON.stringify(doc, null, 1)}\n`, { flag: 'wx' }) // a file is never overwritten
  }
  for (const { update } of changedUpdates) {
    const { text, values } = updateSql(update)
    if ((await client.query(text, values)).rowCount !== 1) refuse(`Update of ${update.table} ${keyOf(update)} did not hit one row; rolled back.`)
  }
  for (const id of changedSlotIds) await replaceSlots(client, id, work.slots[id])
  await audit(client, now, { mode: options.apply ? 'load' : 'load dry-run', changedRows: plan.changedRows, slotExperiencesChanged: plan.slotExperiencesChanged, undoFile: undoFile ? 'written' : null })

  // Verify: every row now equals the snapshot, and no table changed except slots and one audit row.
  for (const update of work.updates) {
    const { text, values } = changedSql(update)
    if ((await client.query(text, values)).rows[0]?.changed) refuse(`${update.table} ${keyOf(update)} still differs from the snapshot after the write; rolled back.`)
  }
  for (const [experienceId, rows] of Object.entries(work.slots)) {
    if (slotKey(await readSlots(client, experienceId)) !== slotKey(rows)) refuse(`Slots of ${experienceId} differ from the snapshot after the write; rolled back.`)
  }
  const expected = { ...before, audit_logs: before.audit_logs + 1,
    experience_slots: before.experience_slots + changedSlotIds.reduce((n, id) => n + work.slots[id].length - oldSlots[id].length, 0) }
  checkCounts(before, await countRows(client), expected, log)
  if (!options.apply) {
    log.log('Dry run: every write passed the database rules and the checks; rolled back, nothing kept.')
    return { commit: false, result: { ...plan, applied: false } }
  }
  log.log(`Committed. Undo file: ${undoFile}`)
  return { commit: true, result: { ...plan, applied: true, undoFile } }
}

function readUndo(file, projectRef, vocab) {
  const doc = JSON.parse(readFileSync(resolve(file), 'utf8'))
  if (!doc || doc.kind !== 'hab-content-load-undo' || doc.version !== 1) refuse('Not a content-load undo file.')
  if (doc.projectRef !== projectRef) refuse('The undo file was not made on this project.')
  if (!Array.isArray(doc.before) || !doc.slotsBefore || !doc.slotsAfter) refuse('The undo file is incomplete.')
  checkUpdates(doc.before.map(entry => ({ ...entry, set: entry.after })), vocab)
  return doc
}

async function undoRun(options, { client, doc, now, log }) {
  await assertReady(client)
  const before = await countRows(client)
  const conflicts = []
  for (const entry of doc.before) {
    const { rows } = await client.query(selectSql({ ...entry, set: entry.after }, true), [keyOf(entry)])
    if (rows.length !== 1) { conflicts.push(`${entry.table} ${keyOf(entry)}: row not found`); continue }
    const { text, values } = changedSql({ ...entry, set: entry.after })
    if ((await client.query(text, values)).rows[0]?.changed) conflicts.push(`${entry.table} ${keyOf(entry)}: no longer holds the loaded values`)
  }
  for (const [experienceId, rows] of Object.entries(doc.slotsAfter)) {
    if (slotKey(await readSlots(client, experienceId)) !== slotKey(rows)) conflicts.push(`slots of ${experienceId}: no longer hold the loaded values`)
  }
  const plan = { restorable: doc.before.length, slotExperiences: Object.keys(doc.slotsBefore).length, conflicts }
  log.log(JSON.stringify({ undo: plan }))
  if (conflicts.length) refuse(`${conflicts.length} row(s) no longer hold the loaded values (${conflicts.slice(0, 5).join('; ')}).`)
  for (const entry of doc.before) {
    const { text, values } = updateSql({ ...entry, set: entry.before })
    if ((await client.query(text, values)).rowCount !== 1) refuse(`Restore of ${entry.table} ${keyOf(entry)} did not hit one row; rolled back.`)
  }
  for (const [experienceId, rows] of Object.entries(doc.slotsBefore)) await replaceSlots(client, experienceId, rows)
  await audit(client, now, { mode: options.apply ? 'undo' : 'undo dry-run', restored: doc.before.length })
  const expected = { ...before, audit_logs: before.audit_logs + 1,
    experience_slots: before.experience_slots + Object.keys(doc.slotsBefore).reduce((n, id) => n + doc.slotsBefore[id].length - doc.slotsAfter[id].length, 0) }
  checkCounts(before, await countRows(client), expected, log)
  if (!options.apply) { log.log('Dry run: rolled back, nothing kept.'); return { commit: false, result: { ...plan, applied: false } } }
  log.log(`Restored ${doc.before.length} row(s) and the slots of ${plan.slotExperiences} experience(s).`)
  return { commit: true, result: { restored: doc.before.length, applied: true } }
}

const SELECT_COLUMNS = columns => columns.map(column => JSON_COLUMNS.includes(column) ? `${column}::text AS ${column}` : column === 'distance_km' ? `${column}::float8 AS ${column}` : column).join(', ')

/** DEV only: read the allowlisted content of the given ids. `ids` = { experiences, provider_profiles, villages } (uuid lists). */
export async function exportSnapshot(client, { ids, projectRef, now = new Date() }) {
  const updates = []
  /** @type {Record<string, any[]>} */
  const slots = {}
  const read = async (table, keyColumn, list, whereVersion) => {
    const { columns } = ALLOWED_COLUMNS[table]
    const sql = whereVersion
      ? `SELECT provider_id AS id, ${SELECT_COLUMNS(columns)} FROM provider_profile_versions v WHERE provider_id = ANY($1::uuid[]) AND version_no = (SELECT published_version_no FROM provider_profiles p WHERE p.provider_id = v.provider_id) ORDER BY provider_id`
      : `SELECT ${keyColumn} AS id, ${SELECT_COLUMNS(columns)} FROM ${table} WHERE ${keyColumn} = ANY($1::uuid[]) ORDER BY ${keyColumn}`
    for (const row of (await client.query(sql, [list])).rows) {
      const { id, ...set } = row
      updates.push({ table, key: { [keyColumn]: id }, ...(whereVersion ? { published: true } : {}), set })
    }
  }
  await read('experiences', 'experience_id', ids.experiences)
  await read('provider_profiles', 'provider_id', ids.provider_profiles)
  await read('provider_profile_versions', 'provider_id', ids.provider_profiles, true)
  await read('villages', 'village_id', ids.villages)
  for (const update of updates.filter(item => item.table === 'experiences')) slots[update.key.experience_id] = await readSlots(client, update.key.experience_id)
  const content = { updates, slots }
  return { kind: 'hab-content-snapshot', version: 1, sourceRef: projectRef, createdAt: now.toISOString(), sha256: checksum(content), ...content }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const { default: nextEnv } = await import('@next/env')
  const confirmFromShell = process.env.CONFIRM_PROJECT_REF // typed with the command, not read from a .env file
  nextEnv.loadEnvConfig(process.cwd())
  const projectRef = assertTarget({ ...process.env, CONFIRM_PROJECT_REF: confirmFromShell }, { targetProd: options.targetProd })
  const snapshotFile = resolve(options.snapshot)
  resolveNotesDir(process.cwd(), dirname(options.snapshot)) // the snapshot folder must be under .demo-data/
  const outDir = resolveNotesDir(process.cwd(), DEFAULT_DIR)
  const { connection } = await import('./shared.mjs')
  const client = connection('migration')
  if (options.export) {
    if (existsSync(snapshotFile)) refuse(`${options.snapshot} already exists; move it away or choose another --snapshot.`)
    await client.connect()
    try {
      await client.query('BEGIN'); await client.query('SET TRANSACTION READ ONLY')
      const all = async (table, column) => (await client.query(`SELECT ${column}::text AS id FROM ${table} ORDER BY ${column}`)).rows.map(row => row.id)
      const ids = { experiences: await all('experiences', 'experience_id'), provider_profiles: await all('provider_profiles', 'provider_id'), villages: await all('villages', 'village_id') }
      const snapshot = await exportSnapshot(client, { ids, projectRef })
      await client.query('ROLLBACK')
      validateSnapshot(snapshot)
      mkdirSync(dirname(snapshotFile), { recursive: true })
      writeFileSync(snapshotFile, `${JSON.stringify(snapshot, null, 1)}\n`, { flag: 'wx' })
      const perTable = {}
      for (const update of snapshot.updates) perTable[update.table] = (perTable[update.table] ?? 0) + 1
      console.log(JSON.stringify({ projectRef, snapshot: options.snapshot, rows: perTable, experience_slots: Object.values(snapshot.slots).reduce((n, rows) => n + rows.length, 0), sha256: snapshot.sha256 }))
    } finally { await client.end() }
    return
  }
  const snapshot = options.undo ? null : JSON.parse(readFileSync(snapshotFile, 'utf8'))
  await client.connect()
  try {
    const report = await run(options, { client, snapshot, outDir, projectRef })
    console.log(JSON.stringify(report))
  } finally { await client.end() }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => {
    const { message } = error instanceof Error ? error : { message: '' }
    console.error(/Nothing was changed|rolled back/.test(message) ? message : `Operation failed (${error?.code ?? error?.name ?? 'UNKNOWN'}). Nothing was committed; read the undo file before retrying.`)
    process.exitCode = 1
  })
}
