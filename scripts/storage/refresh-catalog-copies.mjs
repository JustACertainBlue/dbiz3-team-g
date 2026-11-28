// DEV by default (PROD only with --target-prod, see below): replace the byte copies of the six old CC BY-SA catalog photos that are not seed files
// (runbook-replace-photos step 2, human request 2026-11-19).
//   npm run storage:catalog-copies [-- --dry-run | --apply] [--notes-dir <dir>]
//   npm run storage:catalog-copies -- --undo <dir>/undo.json [--dry-run]
//   CONFIRM_PROJECT_REF=<prod ref> npm run storage:catalog-copies -- --target-prod [--apply | --undo <file>]
// A copy is a stored_files row outside data/seed with storage_key = prf-media/<file_id>, whose size and SHA-256 equal one of
// the old photos (OLD_CATALOG_PHOTOS, taken from git 320bf9a). --apply writes the object's old bytes and the row's old
// size/width/height to <notes-dir>/catalog-copies-<UTC>/ before any write, then overwrites the object with the new photo of
// the same slug (assets/demo-media) and updates the row. --undo restores rows that still hold the new photo.
// Refuses to run unless DATABASE_URL and SUPABASE_URL both name the DEV project, or, with --target-prod (human request
// 2026-11-19), both name PROD and CONFIRM_PROJECT_REF equals that ref; checked before any connection. The dry run (default)
// only reads. The undo folder is always under .demo-data/ of the folder the command runs from (git-ignored).
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { projectRefFromDatabaseUrl } from '../db/lecturer-accounts.mjs'
import { DEV_PROJECT_REF, PROD_PROJECT_REF, assertNoRetiredRef } from '../db/project-refs.mjs'

export { DEV_PROJECT_REF, PROD_PROJECT_REF }
export const DEFAULT_NOTES_DIR = '.demo-data/catalog-copies'

/** The six photos replaced in PR #270, as they were in git 320bf9a (assets/demo-media/<slug>.jpg). */
export const OLD_CATALOG_PHOTOS = Object.freeze({
  silk: { bytes: 571347, sha256: '0f4bfde00efc5e864b38bd74b2d82bfca051d70569d16f7dca846674b62357ba' },
  ceramics: { bytes: 229731, sha256: 'c32806ee9e6bbc0b079e394c0fe8ffc78862b8454fe1458b11d239655499e746' },
  bamboo: { bytes: 271565, sha256: 'b556a9831d576d39dcc614a61207d1339f3c7b89cca27f7f98680dc5302d7c68' },
  'conical-hats': { bytes: 250589, sha256: 'f1e5b0f3f04ec9c51e2a70f89dee0a87ae4ee524e371dafc4ec967021942fe34' },
  'wood-carving': { bytes: 362730, sha256: '2eba38e6aa4a5953ce77ab5aa3849320d50e8fea867c08b7a0fbf7c943b5c14d' },
  'water-puppets': { bytes: 354368, sha256: '20cbdf6d7c2892612b0d84cd192918682d5fe796c90804c171b244008a1ee02a' },
})

const refuse = message => { throw new Error(`${message} Nothing was changed.`) }
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex')

export function parseArgs(argv) {
  const options = { apply: false, undo: undefined, notesDir: undefined, targetProd: false }
  let dryRun = false, apply = false
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--apply') apply = true
    else if (arg === '--target-prod') options.targetProd = true
    else if (arg === '--undo' || arg === '--notes-dir') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) refuse(`${arg} needs a ${arg === '--undo' ? 'file' : 'folder'}.`)
      options[arg === '--undo' ? 'undo' : 'notesDir'] = value
      index += 1
    } else refuse(`Unknown option ${arg}; use --dry-run (default), --apply, --undo <file>, --notes-dir <dir> or --target-prod.`)
  }
  if (dryRun && apply) refuse('Choose either --dry-run or --apply.')
  if (options.undo && apply) refuse('--undo writes by itself; use --undo <file> --dry-run to preview.')
  options.apply = options.undo ? !dryRun : apply
  return options
}

/**
 * Runs before any connection. Without --target-prod both the database and Storage must be the DEV project. With it, both
 * must be the PROD project and CONFIRM_PROJECT_REF must equal that ref exactly. Returns the ref or throws.
 */
export function assertTargets(env, { targetProd = false } = {}) {
  if (!env.DATABASE_URL || !env.SUPABASE_URL) refuse('DATABASE_URL or SUPABASE_URL is not configured.')
  assertNoRetiredRef('DATABASE_URL', env.DATABASE_URL) // first: a retired project is refused in every mode, confirmed or not
  assertNoRetiredRef('SUPABASE_URL', env.SUPABASE_URL)
  const dbRef = projectRefFromDatabaseUrl(env.DATABASE_URL)
  let storageRef = null
  try { storageRef = new URL(env.SUPABASE_URL).hostname.match(/^([a-z0-9]+)\.supabase\.co$/i)?.[1] ?? null } catch { storageRef = null }
  const expected = targetProd ? PROD_PROJECT_REF : DEV_PROJECT_REF
  if (targetProd && env.CONFIRM_PROJECT_REF !== PROD_PROJECT_REF) refuse(`--target-prod needs CONFIRM_PROJECT_REF=${PROD_PROJECT_REF} (missing or different).`)
  for (const [what, ref] of [['DATABASE_URL', dbRef], ['SUPABASE_URL', storageRef]]) {
    if (ref !== expected) refuse(`${what} points to project ref "${ref ?? 'unknown'}", which is not the ${targetProd ? 'confirmed PROD' : 'DEV'} project.`)
  }
  return expected
}

/** Runs before any connection: both the database and Storage must be the DEV project. */
export const assertDevTargets = env => assertTargets(env, { targetProd: false })

/** The undo folder: always inside <cwd>/.demo-data/ (git-ignored), never elsewhere. */
export function resolveNotesDir(cwd, notesDir, pathApi = path) {
  const base = pathApi.resolve(cwd, '.demo-data'), dir = pathApi.resolve(cwd, notesDir ?? DEFAULT_NOTES_DIR)
  const inside = pathApi.relative(base, dir) // separator-independent (Windows uses "\\")
  if (!inside || inside.startsWith('..') || pathApi.isAbsolute(inside)) refuse(`--notes-dir must be a folder under .demo-data/ of ${cwd}.`)
  return dir
}

const SELECT_COPIES = `SELECT file_id::text, storage_key, media_type, file_size_bytes, width_px, height_px FROM public.stored_files
  WHERE file_size_bytes = ANY($1::bigint[]) AND storage_key = 'prf-media/' || file_id::text AND NOT file_id = ANY($2::uuid[]) ORDER BY file_id`
const UPDATE_ROW = `UPDATE public.stored_files SET file_size_bytes = $1, width_px = $2, height_px = $3 WHERE file_id = $4 AND file_size_bytes = $5`

async function updateRow(client, fileId, to, fromBytes) {
  const result = await client.query(UPDATE_ROW, [to.bytes, to.width, to.height, fileId, fromBytes])
  return result.rowCount === 1
}

/**
 * @param {{ apply: boolean, undo?: string }} options
 * @param {{ client: any, storage: any, oldPhotos?: Record<string, { bytes: number, sha256: string }>, newPhotos: Map<string, any>,
 *   seedIds: string[], notesDir: string, now?: Date, projectRef: string }} deps
 * @returns {Promise<any>} refresh report, or undo report with --undo
 */
export async function run(options, deps) {
  return options.undo ? undo(options, deps) : refresh(options, deps)
}

async function refresh(options, { client, storage, oldPhotos = OLD_CATALOG_PHOTOS, newPhotos, seedIds, notesDir, now = new Date(), projectRef }) {
  const bySize = new Map(Object.entries(oldPhotos).map(([slug, photo]) => [photo.bytes, { slug, ...photo }]))
  const { rows } = await client.query(SELECT_COPIES, [[...bySize.keys()], seedIds])
  const toReplace = [], skipped = [], items = []
  for (const row of rows) {
    const old = bySize.get(Number(row.file_size_bytes))
    if (!old || seedIds.includes(row.file_id) || row.storage_key !== `prf-media/${row.file_id}`) continue
    const bytes = await storage.read(row.storage_key)
    if (!bytes) { skipped.push({ file_id: row.file_id, reason: 'object missing' }); continue }
    if (sha256(bytes) !== old.sha256) { skipped.push({ file_id: row.file_id, reason: 'bytes differ from the old photo' }); continue }
    const photo = newPhotos.get(old.slug)
    if (!photo) refuse(`No new photo for ${old.slug}.`)
    toReplace.push({ file_id: row.file_id, slug: old.slug })
    items.push({ row, bytes, slug: old.slug, photo })
  }
  const report = { toReplace, skipped, replaced: 0 }
  if (!options.apply || !items.length) return report

  const dir = join(resolve(notesDir), `catalog-copies-${now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')}`)
  mkdirSync(dirname(dir), { recursive: true })
  mkdirSync(dir) // fails if it exists: a backup is never overwritten
  const files = items.map(({ row, bytes, slug, photo }) => ({
    file_id: row.file_id, storage_key: row.storage_key, slug, backup: `${row.file_id}.jpg`,
    from: { bytes: Number(row.file_size_bytes), width: row.width_px, height: row.height_px, sha256: sha256(bytes) },
    to: { bytes: photo.bytes, width: photo.width, height: photo.height, sha256: sha256(photo.data) },
  }))
  for (const { row, bytes } of items) writeFileSync(join(dir, `${row.file_id}.jpg`), bytes, { flag: 'wx' })
  writeFileSync(join(dir, 'undo.json'), `${JSON.stringify({ kind: 'hab-catalog-copies-undo', version: 1, projectRef, createdAt: now.toISOString(), files }, null, 2)}\n`, { flag: 'wx' })
  report.undoFile = join(dir, 'undo.json')

  for (const [index, { row, bytes, photo }] of items.entries()) {
    await storage.write(row.storage_key, photo.data, 'image/jpeg', { replace: true })
    if (!(await updateRow(client, row.file_id, files[index].to, files[index].from.bytes))) {
      await storage.write(row.storage_key, bytes, row.media_type, { replace: true })
      throw new Error(`Row ${row.file_id} changed during the run; its object was restored. ${report.replaced} file(s) were already replaced, see ${report.undoFile}.`)
    }
    report.replaced += 1
  }
  return report
}

function validateUndo(doc, projectRef) {
  if (!doc || doc.kind !== 'hab-catalog-copies-undo' || doc.version !== 1) refuse('Not a catalog-copies undo file.')
  if (doc.projectRef !== projectRef) refuse('The undo file was not made on this project.')
  if (!Array.isArray(doc.files)) refuse('The undo file is incomplete.')
  for (const file of doc.files) {
    if (!/^[0-9a-f-]{36}$/i.test(file.file_id ?? '') || file.storage_key !== `prf-media/${file.file_id}` || file.backup !== `${file.file_id}.jpg`) refuse('An undo entry has a wrong key.')
    if (![file.from, file.to].every(side => side && Number.isInteger(side.bytes) && typeof side.sha256 === 'string')) refuse('An undo entry is incomplete.')
  }
  return doc
}

async function undo(options, { client, storage, projectRef }) {
  const file = resolve(options.undo), dir = dirname(file)
  const doc = validateUndo(JSON.parse(readFileSync(file, 'utf8')), projectRef)
  const conflicts = [], ready = []
  for (const entry of doc.files) {
    const backup = readFileSync(join(dir, entry.backup))
    if (sha256(backup) !== entry.from.sha256) { conflicts.push(`${entry.file_id}: backup file changed`); continue }
    const current = await storage.read(entry.storage_key)
    if (!current || sha256(current) !== entry.to.sha256) { conflicts.push(`${entry.file_id}: object no longer holds the new photo`); continue }
    ready.push({ entry, backup, current })
  }
  if (!options.apply) return { restorable: ready.length, conflicts }
  if (conflicts.length) refuse(`${conflicts.length} file(s) no longer match the undo file.`)
  let restored = 0
  for (const { entry, backup, current } of ready) {
    await storage.write(entry.storage_key, backup, 'image/jpeg', { replace: true })
    if (!(await updateRow(client, entry.file_id, entry.from, entry.to.bytes))) {
      await storage.write(entry.storage_key, current, 'image/jpeg', { replace: true })
      throw new Error(`Row ${entry.file_id} changed; its object was put back. ${restored} file(s) were already restored.`)
    }
    restored += 1
  }
  return { restored, conflicts: [] }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const { default: nextEnv } = await import('@next/env')
  const confirmFromShell = process.env.CONFIRM_PROJECT_REF // typed with the command, not read from a .env file
  nextEnv.loadEnvConfig(process.cwd())
  const projectRef = assertTargets({ ...process.env, CONFIRM_PROJECT_REF: confirmFromShell }, { targetProd: options.targetProd })
  const notesDir = resolveNotesDir(process.cwd(), options.notesDir)
  const { parse } = await import('csv-parse/sync')
  const { imageSize } = await import('image-size')
  const { connection } = await import('../db/shared.mjs')
  const { storageClient } = await import('./client.mjs')
  const manifest = JSON.parse(readFileSync('assets/demo-media/manifest.json', 'utf8'))
  const newPhotos = new Map()
  for (const photo of manifest.filter(item => OLD_CATALOG_PHOTOS[item.slug])) {
    const data = readFileSync(join('assets/demo-media', photo.file)), size = imageSize(data)
    if (data.length !== photo.bytes || size.width !== photo.width || size.height !== photo.height) refuse(`${photo.file} does not match its manifest.`)
    if (sha256(data) === OLD_CATALOG_PHOTOS[photo.slug].sha256) refuse(`${photo.file} is still the old photo.`)
    newPhotos.set(photo.slug, { slug: photo.slug, bytes: data.length, width: size.width, height: size.height, data })
  }
  const seedIds = parse(readFileSync('data/seed/stored_files.csv', 'utf8'), { columns: true, skip_empty_lines: true }).map(row => row.file_id)
  console.log(JSON.stringify({ projectRef, isDev: projectRef === DEV_PROJECT_REF, isProd: projectRef === PROD_PROJECT_REF, mode: options.undo ? `undo${options.apply ? '' : ' (dry run)'}` : options.apply ? 'apply' : 'dry-run' }))
  const client = connection('migration')
  await client.connect()
  try {
    if (!options.apply) { await client.query('BEGIN'); await client.query('SET TRANSACTION READ ONLY') }
    const report = await run(options, { client, storage: storageClient(), newPhotos, seedIds, notesDir, projectRef })
    if (!options.apply) await client.query('ROLLBACK')
    const bySlug = report.toReplace ? Object.fromEntries(Object.keys(OLD_CATALOG_PHOTOS).map(slug => [slug, report.toReplace.filter(item => item.slug === slug).length])) : undefined
    console.log(JSON.stringify({ ...report, ...(bySlug ? { toReplaceCount: report.toReplace.length, bySlug } : {}) }, null, 2))
    if (!options.apply) console.log('Dry run: nothing was written.')
  } finally { await client.end() }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => {
    const { message } = error instanceof Error ? error : { message: '' }
    console.error(/Nothing was changed|already replaced|already restored|put back|restored/.test(message) ? message : `Operation failed (${error?.code ?? error?.name ?? 'UNKNOWN'}). Read the undo file before retrying.`)
    process.exitCode = 1
  })
}
