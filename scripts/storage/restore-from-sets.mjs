// Restore the BYTES of the 20/11 and 21/11 photo sets under the existing object keys of a restored PROD database
// (runbook docs/build/prod-migrate-supabase.md §7.4.2, branch b, human request 2026-11-28). PROD only.
//   CONFIRM_PROJECT_REF=<prod ref> npm run storage:restore-from-sets -- --target-prod \
//     --set <approved-photos.json> <photos-dir> [--set <manifest> <photos-dir> ...] [--apply] [--notes-dir <dir>]
//   CONFIRM_PROJECT_REF=<prod ref> npm run storage:restore-from-sets -- --target-prod --undo <dir>/undo.json [--dry-run]
// Why it exists: storage:seed-images is not idempotent (it would add every photo again under new ids), and the old bucket cannot be
// read before 07/12. The restored database already holds every stored_files / profile_media / provider_version_media / villages
// row; only the objects are missing.
// What it does: selects the stored_files rows written by the importer (file_name seed-experience|village|workshop-<id8>-<n>.jpg,
// storage_key prf-media/<file_id>) that still have a link row (profile_media, provider_version_media, villages.cover_image_id) and
// whose object is absent. Rows with no link (the face-removal unlinks) are NOT restored: those photos showed people without consent.
// For each row it finds the manifest entries with the same kind, id prefix and file number, checks the local file's SHA-256 against the
// manifest (a mismatch stops the run), re-encodes it with processImage (the importer's own function) and accepts it only when the
// bytes length, width and height equal the row. Several candidates (the same name in the 20/11 and the 21/11 set) are fine when exactly
// one distinct re-encoding matches. A row with no entry (noSource), no matching size (sizeDrift) or two different matches (ambiguous)
// is reported and not uploaded.
// Never writes to the database: one READ ONLY transaction of SELECTs, always rolled back. Never replaces an object (replace:false).
// The dry run (default) reads and encodes only. --apply writes <notes-dir>/restore-from-sets-<UTC>/undo.json (the keys it will create,
// with their size) BEFORE the first upload, uploads, then checks every object's size. --undo deletes only the keys of that file that
// still have the recorded size. Prints counts only; ids go to plan.json under .demo-data/ (git-ignored).
// Refuses to run unless --target-prod, CONFIRM_PROJECT_REF equals the PROD ref (typed in the shell) and DATABASE_URL and SUPABASE_URL
// both name PROD; a retired ref is refused first. All of that is checked before any connection.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { PROD_PROJECT_REF } from '../db/project-refs.mjs'
import { assertTargets, resolveNotesDir } from './refresh-catalog-copies.mjs'
import { processImage, validateEntry, validateWorkshopEntry, verifySha256 } from './seed-image-import-plan.mjs'

export const DEFAULT_NOTES_DIR = '.demo-data/restore-from-sets'
export const TOOL = 'storage:restore-from-sets'
const GROUPS = ['experience', 'village', 'workshop']
const NAME = /^seed-(experience|village|workshop)-([0-9a-f]{8})-([1-9]\.jpg)$/
const refuse = message => { throw new Error(message) }
const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

/** @param {string[]} argv */
export function parseArgs(argv) {
  /** @type {{ apply: boolean, targetProd: boolean, sets: Array<{ manifest: string, photosDir: string }>, undo?: string, notesDir?: string }} */
  const options = { apply: false, targetProd: false, sets: [] }
  let dryRun = false, apply = false
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--apply') apply = true
    else if (arg === '--target-prod') options.targetProd = true
    else if (arg === '--set') {
      const [manifest, photosDir] = [argv[index + 1], argv[index + 2]]
      if (!manifest || !photosDir || manifest.startsWith('--') || photosDir.startsWith('--')) refuse('--set needs a manifest file and a photos folder: --set <approved-photos.json> <photos-dir>.')
      options.sets.push({ manifest, photosDir })
      index += 2
    } else if (arg === '--undo' || arg === '--notes-dir') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) refuse(`${arg} needs a ${arg === '--undo' ? 'file' : 'folder'}.`)
      options[arg === '--undo' ? 'undo' : 'notesDir'] = value
      index += 1
    } else refuse(`Unknown option ${arg}; use --set <manifest> <photos-dir>, --dry-run (default), --apply, --undo <file>, --notes-dir <dir> or --target-prod.`)
  }
  if (dryRun && apply) refuse('Choose either --dry-run or --apply.')
  if (options.undo && apply) refuse('--undo writes by itself; use --undo <file> --dry-run to preview.')
  if (!options.undo && !options.sets.length) refuse('At least one --set <manifest> <photos-dir> is required.')
  options.apply = options.undo ? !dryRun : apply
  return options
}

/** Runs before any connection. PROD only: --target-prod, the typed confirmation, and PROD for both URLs; retired refs first. */
export function assertRestoreTarget(env, { targetProd = false } = {}) {
  if (!targetProd) refuse('storage:restore-from-sets only runs on PROD: add --target-prod and type CONFIRM_PROJECT_REF=' + PROD_PROJECT_REF + '. Nothing was changed.')
  return assertTargets(env, { targetProd: true })
}

const SELECT_ROWS = `SELECT f.file_id::text AS file_id, f.file_name, f.file_size_bytes::text AS file_size_bytes, f.width_px, f.height_px,
    (EXISTS (SELECT 1 FROM public.profile_media pm WHERE pm.file_id = f.file_id)
      OR EXISTS (SELECT 1 FROM public.provider_version_media m WHERE m.file_id = f.file_id)
      OR EXISTS (SELECT 1 FROM public.villages v WHERE v.cover_image_id = f.file_id)) AS linked
  FROM public.stored_files f
  WHERE f.media_type = 'image/jpeg' AND f.storage_key = 'prf-media/' || f.file_id::text
    AND (f.file_name LIKE 'seed-experience-%' OR f.file_name LIKE 'seed-village-%' OR f.file_name LIKE 'seed-workshop-%')
  ORDER BY f.file_id`

const emptyGroup = () => ({ selected: 0, alreadyPresent: 0, unlinked: 0, toUpload: 0, bytes: 0, sizeDrift: 0, noSource: 0, ambiguous: 0 })

/** Reads and validates the manifests; returns the candidates by `<kind>:<id8>:<n>.jpg`. Nothing is read from the database yet. */
function loadCandidates(sets) {
  const index = new Map()
  for (const set of sets) {
    const entries = JSON.parse(readFileSync(set.manifest, 'utf8'))
    if (!Array.isArray(entries)) refuse('Invalid manifest: it must be an array.')
    const invalid = entries.map(item => ({ file: item.file, errors: item.loai === 'workshop' ? validateWorkshopEntry(item) : validateEntry(item) })).filter(item => item.errors.length)
    if (invalid.length) refuse(`Invalid entries in a manifest (${invalid.length}); nothing was read from the database.`)
    for (const item of entries) {
      const key = `${item.loai}:${(item.loai === 'workshop' ? item.provider_id : item.id).slice(0, 8)}:${item.file.split('/')[2]}`
      index.set(key, [...(index.get(key) ?? []), { item, photosDir: set.photosDir, processed: undefined }])
    }
  }
  return index
}

async function encode(candidate) {
  if (!candidate.processed) {
    let bytes
    try { bytes = readFileSync(resolve(candidate.photosDir, candidate.item.file)) } catch { candidate.processed = { missingFile: true }; return candidate.processed }
    verifySha256(bytes, candidate.item) // a mismatch stops the run
    candidate.processed = await processImage(bytes)
  }
  return candidate.processed
}

/**
 * @param {{ apply: boolean, sets: Array<{ manifest: string, photosDir: string }> }} options
 * @param {{ client: any, storage: any, notesDir: string, projectRef: string, now?: Date, onUndoFile?: (path: string) => void }} deps
 * @returns {Promise<any>} dry-run report; with --apply also uploaded, failed, uploadedSha256 and undoFile
 */
export async function restoreFromSets(options, { client, storage, notesDir, projectRef, now = new Date(), onUndoFile }) {
  const candidates = loadCandidates(options.sets)
  const groups = Object.fromEntries(GROUPS.map(name => [name, emptyGroup()]))
  const plan = { toUpload: [], sizeDrift: [], noSource: [], ambiguous: [] }
  const uploads = []
  await client.query('BEGIN READ ONLY')
  let rows
  try { rows = (await client.query(SELECT_ROWS)).rows } finally { await client.query('ROLLBACK') } // nothing here ever writes
  for (const row of rows) {
    const match = NAME.exec(row.file_name)
    if (!match) continue
    const [, kind, id8, number] = match
    const group = groups[kind]
    group.selected += 1
    const key = `prf-media/${row.file_id}`
    if (!row.linked) { group.unlinked += 1; continue }
    if (await storage.exists(key)) { group.alreadyPresent += 1; continue }
    const found = candidates.get(`${kind}:${id8}:${number}`) ?? []
    const accepted = new Map()
    let readable = 0
    for (const candidate of found) {
      const processed = await encode(candidate)
      if (processed.missingFile) continue
      readable += 1
      if (processed.bytes.length === Number(row.file_size_bytes) && processed.width === Number(row.width_px) && processed.height === Number(row.height_px)) accepted.set(processed.sha256, processed)
    }
    if (!readable) { group.noSource += 1; plan.noSource.push({ file_id: row.file_id, group: kind }); continue }
    if (accepted.size === 0) { group.sizeDrift += 1; plan.sizeDrift.push({ file_id: row.file_id, group: kind }); continue }
    if (accepted.size > 1) { group.ambiguous += 1; plan.ambiguous.push({ file_id: row.file_id, group: kind }); continue }
    const [processed] = accepted.values()
    group.toUpload += 1
    group.bytes += processed.bytes.length
    plan.toUpload.push({ file_id: row.file_id, group: kind })
    uploads.push({ file_id: row.file_id, storage_key: key, bytes: processed.bytes, sha256: processed.sha256 })
  }
  const unresolved = GROUPS.reduce((sum, name) => sum + groups[name].sizeDrift + groups[name].noSource + groups[name].ambiguous, 0)
  const dir = join(resolve(notesDir), `restore-from-sets-${stamp(now)}`)
  mkdirSync(dir, { recursive: true })
  const planFile = join(dir, 'plan.json')
  writeFileSync(planFile, JSON.stringify(plan, null, 2))
  const totals = GROUPS.reduce((sum, name) => ({ selected: sum.selected + groups[name].selected, toUpload: sum.toUpload + groups[name].toUpload, bytes: sum.bytes + groups[name].bytes }), { selected: 0, toUpload: 0, bytes: 0 })
  const report = { mode: options.apply ? 'apply' : 'dry-run (reads only; nothing uploaded)', projectRef, groups, totals, unresolved, planFile }
  if (!options.apply) return report

  const undoFile = join(dir, 'undo.json')
  writeFileSync(undoFile, JSON.stringify({ tool: TOOL, projectRef, createdAt: now.toISOString(), items: uploads.map(({ file_id, storage_key, bytes }) => ({ file_id, storage_key, bytes: bytes.length })) }, null, 2), { flag: 'wx' })
  onUndoFile?.(undoFile)
  let uploaded = 0
  const failed = [], uploadedSha256 = {}
  for (const upload of uploads) {
    try {
      for (let attempt = 1; ; attempt += 1) {
        try { await storage.write(upload.storage_key, upload.bytes, 'image/jpeg', { replace: false }); break } catch (error) {
          // a write that timed out may still be stored; a retry without replace is then refused, so the stored size decides
          if ((await storage.size(upload.storage_key).catch(() => null)) === upload.bytes.length) break
          if (attempt >= 3) throw error
        }
      }
      if ((await storage.size(upload.storage_key)) !== upload.bytes.length) throw new Error('size check failed')
      uploaded += 1
      uploadedSha256[upload.file_id] = upload.sha256
    } catch { failed.push(upload.file_id) }
  }
  return { ...report, uploaded, failed, uploadedSha256, undoFile }
}

/** @param {{ undo: string, apply: boolean }} options @param {{ storage: any, projectRef: string }} deps @returns {Promise<any>} */
export async function undoRestore(options, { storage, projectRef }) {
  const doc = JSON.parse(readFileSync(options.undo, 'utf8'))
  if (!doc || doc.tool !== TOOL || doc.projectRef !== projectRef || !Array.isArray(doc.items)) refuse(`Not an undo file of ${TOOL} for this project.`)
  let toRemove = 0, skipped = 0, removed = 0
  for (const item of doc.items) {
    if ((await storage.size(item.storage_key)) !== item.bytes) { skipped += 1; continue }
    toRemove += 1
    if (options.apply) { await storage.remove(item.storage_key); removed += 1 }
  }
  return { mode: options.apply ? 'undo' : 'undo (dry run)', toRemove, skipped, removed }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const confirmFromShell = process.env.CONFIRM_PROJECT_REF // typed with the command, not read from a .env file
  const { default: nextEnv } = await import('@next/env')
  nextEnv.loadEnvConfig(process.cwd())
  const projectRef = assertRestoreTarget({ ...process.env, CONFIRM_PROJECT_REF: confirmFromShell }, { targetProd: options.targetProd })
  const notesDir = resolveNotesDir(process.cwd(), options.notesDir ?? DEFAULT_NOTES_DIR)
  const { storageClient } = await import('./client.mjs')
  const storage = storageClient()
  console.log(JSON.stringify({ projectRef, mode: options.undo ? `undo${options.apply ? '' : ' (dry run)'}` : options.apply ? 'apply' : 'dry-run' }))
  if (options.undo) { console.log(JSON.stringify(await undoRestore(options, { storage, projectRef }), null, 2)); return }
  const { connection } = await import('../db/shared.mjs')
  const client = connection('migration')
  await client.connect()
  try {
    const report = await restoreFromSets(options, { client, storage, notesDir, projectRef })
    console.log(JSON.stringify(report, null, 2))
    if (!options.apply) console.log('Dry run: nothing was uploaded and the database was only read.')
    else if (report.unresolved || report.failed.length) process.exitCode = 2
  } finally { await client.end() }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
}
