// Restore the objects of the gallery rows that storage:catalog-copies pointed at a photo of assets/demo-media
// (human request 2026-11-28). PROD only.
//   CONFIRM_PROJECT_REF=<prod ref> npm run storage:restore-demo-copies -- --target-prod [--apply] [--media-dir <dir>] [--notes-dir <dir>]
//   CONFIRM_PROJECT_REF=<prod ref> npm run storage:restore-demo-copies -- --target-prod --undo <dir>/undo.json [--dry-run]
// Why: on 19-20/11 storage:catalog-copies replaced the bytes of non-seed gallery copies with the new demo photo of the same
// craft and set the row's file_size_bytes, width_px and height_px to that photo's. The restored PROD database holds those rows,
// the new bucket holds no object for them, and storage:catalog-copies cannot create a missing object.
// What it does: selects stored_files rows (image/jpeg, storage_key = prf-media/<file_id>) that are linked (profile_media,
// provider_version_media or villages.cover_image_id), are not importer rows (file_name seed-experience|village|workshop-..., those
// belong to storage:restore-from-sets) and whose object is absent. A row matches a demo photo only when (size, width, height) equal
// EXACTLY ONE manifest entry. Before anything is uploaded the local file is checked against its manifest entry (byte length and
// dimensions, hence against the row's file_size_bytes); a difference stops the run. The original .jpg bytes are uploaded as they
// are (no re-encoding) under the existing key, replace:false.
// Never writes to the database: one READ ONLY transaction of SELECTs, always rolled back. The dry run (default) uploads nothing.
// --apply writes <notes-dir>/restore-demo-copies-<UTC>/undo.json (keys and sizes) BEFORE the first upload, uploads, then checks every
// object's size. --undo deletes only keys of that file that still have the recorded size. Prints counts per group only (selected,
// toUpload, alreadyPresent, noMatch); file ids go to plan.json under .demo-data/ (git-ignored).
// Refuses to run unless --target-prod, CONFIRM_PROJECT_REF equals the PROD ref (typed in the shell) and DATABASE_URL and SUPABASE_URL
// both name PROD; a retired ref is refused first. All of that is checked before any connection.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { imageSize } from 'image-size'
import { PROD_PROJECT_REF } from '../db/project-refs.mjs'
import { assertTargets, resolveNotesDir } from './refresh-catalog-copies.mjs'

export const DEFAULT_NOTES_DIR = '.demo-data/restore-demo-copies'
export const DEFAULT_MEDIA_DIR = 'assets/demo-media'
export const TOOL = 'storage:restore-demo-copies'
export const GROUPS = ['experience gallery', 'workshop gallery', 'village cover']
const refuse = message => { throw new Error(message) }
const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

/** @param {string[]} argv */
export function parseArgs(argv) {
  /** @type {{ apply: boolean, targetProd: boolean, undo?: string, notesDir?: string, mediaDir?: string }} */
  const options = { apply: false, targetProd: false }
  let dryRun = false, apply = false
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--apply') apply = true
    else if (arg === '--target-prod') options.targetProd = true
    else if (arg === '--undo' || arg === '--notes-dir' || arg === '--media-dir') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) refuse(`${arg} needs a ${arg === '--undo' ? 'file' : 'folder'}.`)
      options[arg === '--undo' ? 'undo' : arg === '--notes-dir' ? 'notesDir' : 'mediaDir'] = value
      index += 1
    } else refuse(`Unknown option ${arg}; use --dry-run (default), --apply, --undo <file>, --notes-dir <dir>, --media-dir <dir> or --target-prod.`)
  }
  if (dryRun && apply) refuse('Choose either --dry-run or --apply.')
  if (options.undo && apply) refuse('--undo writes by itself; use --undo <file> --dry-run to preview.')
  options.apply = options.undo ? !dryRun : apply
  return options
}

/** Runs before any connection. PROD only: --target-prod, the typed confirmation, PROD for both URLs; retired refs first. */
export function assertDemoCopiesTarget(env, { targetProd = false } = {}) {
  if (!targetProd) refuse(`${TOOL} only runs on PROD: add --target-prod and type CONFIRM_PROJECT_REF=${PROD_PROJECT_REF}. Nothing was changed.`)
  return assertTargets(env, { targetProd: true })
}

const SELECT_ROWS = `SELECT f.file_id::text AS file_id, f.file_size_bytes::text AS file_size_bytes, f.width_px, f.height_px,
    CASE WHEN EXISTS (SELECT 1 FROM public.villages v WHERE v.cover_image_id = f.file_id) THEN 'village cover'
         WHEN EXISTS (SELECT 1 FROM public.provider_version_media m WHERE m.file_id = f.file_id)
           OR EXISTS (SELECT 1 FROM public.profile_media p WHERE p.file_id = f.file_id AND p.provider_id IS NOT NULL) THEN 'workshop gallery'
         ELSE 'experience gallery' END AS link
  FROM public.stored_files f
  WHERE f.media_type = 'image/jpeg' AND f.storage_key = 'prf-media/' || f.file_id::text
    AND f.file_name NOT LIKE 'seed-experience-%' AND f.file_name NOT LIKE 'seed-village-%' AND f.file_name NOT LIKE 'seed-workshop-%'
    AND (EXISTS (SELECT 1 FROM public.profile_media p WHERE p.file_id = f.file_id)
      OR EXISTS (SELECT 1 FROM public.provider_version_media m WHERE m.file_id = f.file_id)
      OR EXISTS (SELECT 1 FROM public.villages v WHERE v.cover_image_id = f.file_id))
  ORDER BY f.file_id`

const emptyGroup = () => ({ selected: 0, toUpload: 0, alreadyPresent: 0, noMatch: 0 })

/** Manifest photos by "bytes:width:height"; a triple used by two photos can never be matched. */
function loadPhotos(mediaDir) {
  const manifest = JSON.parse(readFileSync(resolve(mediaDir, 'manifest.json'), 'utf8'))
  if (!Array.isArray(manifest)) refuse('Invalid manifest: it must be an array.')
  const byTriple = new Map()
  for (const photo of manifest) {
    const key = `${photo.bytes}:${photo.width}:${photo.height}`
    byTriple.set(key, [...(byTriple.get(key) ?? []), photo])
  }
  return byTriple
}

/** The local file must be the photo its manifest entry describes: byte length and dimensions. Returns the original bytes. */
function readPhoto(mediaDir, photo) {
  if (!/^[a-z-]+\.jpg$/.test(photo.file)) refuse('Invalid photo file name in the manifest.')
  const bytes = readFileSync(resolve(mediaDir, photo.file))
  const dimensions = imageSize(bytes)
  if (bytes.length !== photo.bytes || dimensions.width !== photo.width || dimensions.height !== photo.height) refuse(`Photo ${photo.slug} does not match its manifest entry; nothing was uploaded.`)
  return bytes
}

/**
 * @param {{ apply: boolean }} options
 * @param {{ client: any, storage: any, notesDir: string, projectRef: string, mediaDir?: string, now?: Date, onUndoFile?: (path: string) => void }} deps
 * @returns {Promise<any>} report; with --apply also uploaded, failed and undoFile
 */
export async function restoreDemoCopies(options, { client, storage, notesDir, projectRef, mediaDir = DEFAULT_MEDIA_DIR, now = new Date(), onUndoFile }) {
  const byTriple = loadPhotos(mediaDir)
  const groups = Object.fromEntries(GROUPS.map(name => [name, emptyGroup()]))
  const plan = { toUpload: [], noMatch: [] }
  const uploads = []
  await client.query('BEGIN READ ONLY')
  let rows
  try { rows = (await client.query(SELECT_ROWS)).rows } finally { await client.query('ROLLBACK') } // nothing here ever writes
  for (const row of rows) {
    const group = groups[row.link]
    if (!group) continue
    const key = `prf-media/${row.file_id}`
    if (await storage.exists(key)) { group.selected += 1; group.alreadyPresent += 1; continue }
    group.selected += 1
    const matches = byTriple.get(`${Number(row.file_size_bytes)}:${Number(row.width_px)}:${Number(row.height_px)}`) ?? []
    if (matches.length !== 1) { group.noMatch += 1; plan.noMatch.push({ file_id: row.file_id, group: row.link }); continue }
    const bytes = readPhoto(mediaDir, matches[0]) // a mismatch stops the run before any upload
    group.toUpload += 1
    plan.toUpload.push({ file_id: row.file_id, group: row.link, slug: matches[0].slug })
    uploads.push({ file_id: row.file_id, storage_key: key, bytes })
  }
  const totals = GROUPS.reduce((sum, name) => Object.fromEntries(Object.keys(sum).map(field => [field, sum[field] + groups[name][field]])), emptyGroup())
  const dir = join(resolve(notesDir), `restore-demo-copies-${stamp(now)}`)
  mkdirSync(dir, { recursive: true })
  const planFile = join(dir, 'plan.json')
  writeFileSync(planFile, JSON.stringify(plan, null, 2))
  const report = { mode: options.apply ? 'apply' : 'dry-run (reads only; nothing uploaded)', projectRef, groups, totals, planFile }
  if (!options.apply) return report

  const undoFile = join(dir, 'undo.json')
  writeFileSync(undoFile, JSON.stringify({ tool: TOOL, projectRef, createdAt: now.toISOString(), items: uploads.map(({ file_id, storage_key, bytes }) => ({ file_id, storage_key, bytes: bytes.length })) }, null, 2), { flag: 'wx' })
  onUndoFile?.(undoFile)
  let uploaded = 0
  const failed = []
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
    } catch { failed.push(upload.file_id) }
  }
  return { ...report, uploaded, failed, undoFile }
}

/** @param {{ undo: string, apply: boolean }} options @param {{ storage: any, projectRef: string }} deps @returns {Promise<any>} */
export async function undoDemoCopies(options, { storage, projectRef }) {
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
  const projectRef = assertDemoCopiesTarget({ ...process.env, CONFIRM_PROJECT_REF: confirmFromShell }, { targetProd: options.targetProd })
  const notesDir = resolveNotesDir(process.cwd(), options.notesDir ?? DEFAULT_NOTES_DIR)
  const { storageClient } = await import('./client.mjs')
  const storage = storageClient()
  console.log(JSON.stringify({ projectRef, mode: options.undo ? `undo${options.apply ? '' : ' (dry run)'}` : options.apply ? 'apply' : 'dry-run' }))
  if (options.undo) { console.log(JSON.stringify(await undoDemoCopies(options, { storage, projectRef }), null, 2)); return }
  const { connection } = await import('../db/shared.mjs')
  const client = connection('migration')
  await client.connect()
  try {
    const report = await restoreDemoCopies(options, { client, storage, notesDir, projectRef, mediaDir: options.mediaDir ?? DEFAULT_MEDIA_DIR })
    console.log(JSON.stringify(report, null, 2))
    if (!options.apply) console.log('Dry run: nothing was uploaded and the database was only read.')
    else if (report.failed.length) process.exitCode = 2
  } finally { await client.end() }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
}
