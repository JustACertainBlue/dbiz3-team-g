// Backfill WebP display variants for every showcase image already stored (step 2A, human request 2026-11-20). DEV only.
//   npm run storage:media-variants [-- --dry-run | --apply] [--notes-dir <dir>]
//   npm run storage:media-variants -- --undo <dir>/undo.json [--dry-run]
// Showcase image = an image at prf-media/<file_id> linked as Experience/profile media, workshop version media or village
// cover, and never a provider document. For each one whose variants are missing, the original is read and
// prf-media/<file_id>.w400|w800|w1600.webp are made with media-variants.mjs (never enlarged, WebP ~72, no metadata).
// The dry run (default) reads and encodes only and reports the sizes; nothing is uploaded. --apply writes
// <notes-dir>/media-variants-<UTC>/undo.json (the keys it will create) first, then uploads without replacing. --undo
// removes those keys. Refuses to run unless DATABASE_URL and SUPABASE_URL both name the DEV project.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { DEV_PROJECT_REF, assertDevTargets, resolveNotesDir } from './refresh-catalog-copies.mjs'
import { VARIANT_WIDTHS, isVariantKey, makeVariants, variantKey } from './media-variants.mjs'

export const DEFAULT_NOTES_DIR = '.demo-data/media-variants'
const refuse = message => { throw new Error(message) }
/** Storage calls time out after 30 s each; a busy network should not end a long run. @param {() => Promise<any>} call */
const retry = async (call, attempts = 3) => { for (let attempt = 1; ; attempt += 1) { try { return await call() } catch (error) { if (attempt >= attempts) throw error } } }

export const DISPLAY_IMAGES_SQL = `SELECT f.file_id::text AS file_id,f.storage_key,f.media_type,f.file_size_bytes FROM public.stored_files f
  WHERE f.media_type LIKE 'image/%' AND f.storage_key = 'prf-media/' || f.file_id::text
    AND (EXISTS (SELECT 1 FROM public.profile_media pm WHERE pm.file_id=f.file_id)
      OR EXISTS (SELECT 1 FROM public.provider_version_media m WHERE m.file_id=f.file_id)
      OR EXISTS (SELECT 1 FROM public.villages v WHERE v.cover_image_id=f.file_id))
    AND NOT EXISTS (SELECT 1 FROM public.provider_version_documents d WHERE d.file_id=f.file_id)
  ORDER BY f.file_id`

/** @param {string[]} argv */
export function parseArgs(argv) {
  /** @type {{apply:boolean,undo?:string,notesDir?:string}} */
  const options = { apply: false }
  let dryRun = false, apply = false
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--apply') apply = true
    else if (arg === '--undo' || arg === '--notes-dir') {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) refuse(`${arg} needs a value.`)
      if (arg === '--undo') options.undo = value
      else options.notesDir = value
      index += 1
    } else refuse(`Unknown option ${arg}; use --dry-run (default), --apply, --undo <file> or --notes-dir <dir>.`)
  }
  if (dryRun && apply) refuse('Choose either --dry-run or --apply.')
  if (options.undo && apply) refuse('--undo writes by itself; use --undo <file> --dry-run to preview.')
  options.apply = options.undo ? !dryRun : apply
  return options
}

/**
 * @param {Array<Array<{width:number,bytes:number}>>} results
 * @returns {Record<number,{count:number,averageKB:number,maxKB:number}>}
 */
export function summarizeVariants(results) {
  /** @type {Record<number,{count:number,averageKB:number,maxKB:number}>} */
  const summary = {}
  for (const width of VARIANT_WIDTHS) {
    const sizes = results.flatMap(variants => variants.filter(variant => variant.width === width).map(variant => variant.bytes))
    summary[width] = {
      count: sizes.length,
      averageKB: sizes.length ? Math.round(sizes.reduce((sum, size) => sum + size, 0) / sizes.length / 1024) : 0,
      maxKB: sizes.length ? Math.round(Math.max(...sizes) / 1024) : 0,
    }
  }
  return summary
}

/** @param {any} options @param {any} deps @returns {Promise<any>} */
async function backfill(options, { client, storage, notesDir, projectRef, now = new Date() }) {
  const files = (await client.query(DISPLAY_IMAGES_SQL)).rows
  const work = [], skipped = []
  for (const file of files) {
    const missing = []
    for (const width of VARIANT_WIDTHS) if (!(await retry(() => storage.exists(variantKey(file.file_id, width))))) missing.push(width)
    if (missing.length) work.push({ file, missing }); else skipped.push(file.file_id)
  }
  const results = [], failures = [], originals = []
  const made = new Map()
  for (const { file } of work) {
    const original = await retry(() => storage.read(file.storage_key))
    if (!original) { failures.push({ file_id: file.file_id, reason: 'original missing in Storage' }); continue }
    try {
      const variants = await makeVariants(original)
      made.set(file.file_id, variants)
      originals.push(original.length)
      results.push(variants.map(variant => ({ width: variant.width, bytes: variant.bytes.length })))
    } catch (error) { failures.push({ file_id: file.file_id, reason: error instanceof Error ? error.message : String(error) }) }
  }
  const heaviest = [...made.entries()].map(([fileId, variants]) => ({ file_id: fileId, KB: Object.fromEntries(variants.map(variant => [variant.width, Math.round(variant.bytes.length / 1024)])) }))
    .sort((a, b) => b.KB[1600] - a.KB[1600]).slice(0, 5)
  const report = {
    showcaseImages: files.length, alreadyComplete: skipped.length, toProcess: work.length, encoded: made.size, failures,
    originalsAverageKB: originals.length ? Math.round(originals.reduce((sum, size) => sum + size, 0) / originals.length / 1024) : 0,
    originalsMaxKB: originals.length ? Math.round(Math.max(...originals) / 1024) : 0,
    byWidth: summarizeVariants(results), heaviest1600: heaviest,
  }
  if (!options.apply) return report
  const keys = work.filter(({ file }) => made.has(file.file_id)).flatMap(({ file, missing }) => missing.map(width => variantKey(file.file_id, width)))
  const dir = join(notesDir, `media-variants-${now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'undo.json'), JSON.stringify({ projectRef, createdAt: now.toISOString(), keys }, null, 2), { flag: 'wx' })
  let uploaded = 0
  for (const { file, missing } of work) {
    const variants = made.get(file.file_id)
    if (!variants) continue
    for (const variant of variants.filter(item => missing.includes(item.width))) {
      await retry(() => storage.write(variantKey(file.file_id, variant.width), variant.bytes, 'image/webp', { replace: false }))
      uploaded += 1
    }
  }
  return { ...report, uploaded, undoFile: join(dir, 'undo.json') }
}

/** @param {any} options @param {any} deps @returns {Promise<any>} */
async function undoBackfill(options, { storage, projectRef }) {
  const doc = JSON.parse(readFileSync(options.undo, 'utf8'))
  if (!doc || doc.projectRef !== projectRef || !Array.isArray(doc.keys) || !doc.keys.every(isVariantKey)) refuse('Not an undo file of storage:media-variants for this project.')
  if (!options.apply) return { mode: 'undo (dry run)', keys: doc.keys.length }
  for (const key of doc.keys) await storage.remove(key)
  return { mode: 'undo', removed: doc.keys.length }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const { default: nextEnv } = await import('@next/env')
  nextEnv.loadEnvConfig(process.cwd())
  const projectRef = assertDevTargets(process.env)
  const notesDir = resolveNotesDir(process.cwd(), options.notesDir ?? DEFAULT_NOTES_DIR)
  const { connection } = await import('../db/shared.mjs')
  const { storageClient } = await import('./client.mjs')
  console.log(JSON.stringify({ projectRef, isDev: projectRef === DEV_PROJECT_REF, mode: options.undo ? `undo${options.apply ? '' : ' (dry run)'}` : options.apply ? 'apply' : 'dry-run (read and encode only; no upload)' }))
  if (options.undo) { console.log(JSON.stringify(await undoBackfill(options, { storage: storageClient(), projectRef }), null, 2)); return }
  const client = connection('migration')
  await client.connect()
  try {
    await client.query('BEGIN'); await client.query('SET TRANSACTION READ ONLY')
    const report = await backfill(options, { client, storage: storageClient(), notesDir, projectRef })
    await client.query('ROLLBACK')
    console.log(JSON.stringify(report, null, 2))
    if (!options.apply) console.log('Dry run: nothing was uploaded.')
  } finally { await client.end() }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
}
