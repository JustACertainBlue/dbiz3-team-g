// Seed image import, DEV only (human decisions 2026-11-18 and 2026-11-20).
//   npm run storage:seed-images -- --json <approved-photos.json> --photos-dir <dir> [--dry-run | --apply] [--notes-dir <dir>]
//   npm run storage:seed-images -- --undo <dir>/undo.json [--dry-run]
// Reads the reviewed approved-photos.json and the photos under --photos-dir (<loai>/<id>/<n>.jpg), checks each file's SHA-256,
// leaves out the rejected and the face images (seed-image-import-plan.mjs), and processes each photo with sharp (EXIF turn,
// no metadata, longest side 1600 px or 1280 px wide for portraits, progressive JPEG q80). Then, in one transaction:
//   - stored_files + image_sources (author → nguoi_chup; provenance is never shown in the UI) for every photo;
//   - experience: the experience's profile_media rows whose file is also used by another experience are unlinked
//     (stored_files and objects stay), the remaining rows move one place down, the new photo becomes display_order 0;
//   - village: villages.cover_image_id.
// The dry run (default) does all writes and rolls back; it uploads nothing. --apply writes <notes-dir>/seed-image-import-<UTC>/undo.json
// first, uploads the objects (prf-media/<new file_id> and its WebP variants .w400/.w800/.w1600.webp), then commits; a failed upload or commit removes the uploaded objects.
// Refuses to run unless DATABASE_URL and SUPABASE_URL both name the DEV project. Never reads a .env file itself: the
// environment comes from @next/env in the folder the command runs from.
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { resolveNotesDir } from './refresh-catalog-copies.mjs'
import { VARIANT_WIDTHS, makeVariants, variantKey } from './media-variants.mjs'
import {
  DEV_PROJECT_REF, assertImportTarget, filterEntries, orderPlan, processImage, toRecords, validateEntry, verifySha256,
} from './seed-image-import-plan.mjs'

export const DEFAULT_NOTES_DIR = '.demo-data/seed-image-import'
const refuse = message => { throw new Error(message) }

/** @param {string[]} argv */
export function parseArgs(argv) {
  /** @type {{apply:boolean,undo?:string,notesDir?:string,json?:string,photosDir?:string}} */
  const options = { apply: false }
  let dryRun = false, apply = false
  const takes = { '--undo': 'undo', '--notes-dir': 'notesDir', '--json': 'json', '--photos-dir': 'photosDir' }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--apply') apply = true
    else if (arg in takes) {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) refuse(`${arg} needs a value.`)
      Object.assign(options, { [/** @type {Record<string,string>} */ (takes)[arg]]: value })
      index += 1
    } else refuse(`Unknown option ${arg}; use --json <file> --photos-dir <dir> [--dry-run | --apply] [--notes-dir <dir>] or --undo <file> [--dry-run].`)
  }
  if (dryRun && apply) refuse('Choose either --dry-run or --apply.')
  if (options.undo && apply) refuse('--undo writes by itself; use --undo <file> --dry-run to preview.')
  if (!options.undo && (!options.json || !options.photosDir)) refuse('--json and --photos-dir are required.')
  options.apply = options.undo ? !dryRun : apply
  return options
}

const average = values => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0

/** @param {any} options @param {any} deps @returns {Promise<any>} */
async function importPhotos(options, { client, storage, notesDir, projectRef, now = new Date() }) {
  const entries = JSON.parse(readFileSync(options.json, 'utf8'))
  if (!Array.isArray(entries)) refuse('approved-photos.json must be an array.')
  const invalid = entries.map(item => ({ id: item.id, file: item.file, errors: validateEntry(item) })).filter(item => item.errors.length)
  if (invalid.length) refuse(`Invalid entries: ${JSON.stringify(invalid)}`)
  const { kept, excluded } = filterEntries(entries)

  const processed = new Map()
  for (const item of kept) {
    const bytes = readFileSync(resolve(options.photosDir, item.file))
    verifySha256(bytes, item)
    processed.set(item, await processImage(bytes))
  }

  const experienceIds = kept.filter(item => item.loai === 'experience').map(item => item.id)
  const villageIds = kept.filter(item => item.loai === 'village').map(item => item.id)
  const experiences = await client.query('SELECT experience_id,name,archived_at FROM public.experiences WHERE experience_id=ANY($1::uuid[])', [experienceIds])
  const villages = await client.query('SELECT village_id,name AS village_name,cover_image_id FROM public.villages WHERE village_id=ANY($1::uuid[])', [villageIds])
  const missing = [...experienceIds.filter(id => !experiences.rows.some(row => row.experience_id === id)), ...villageIds.filter(id => !villages.rows.some(row => row.village_id === id))]
  if (missing.length) refuse(`Unknown experience or village ids: ${missing.join(', ')}`)
  const media = await client.query(`SELECT pm.*, EXISTS(SELECT 1 FROM public.profile_media o WHERE o.file_id=pm.file_id AND o.experience_id IS DISTINCT FROM pm.experience_id) AS shared
    FROM public.profile_media pm WHERE pm.experience_id=ANY($1::uuid[]) ORDER BY pm.experience_id, pm.display_order`, [experienceIds])
  const sharedExperiences = new Set(media.rows.filter(row => row.shared).map(row => row.experience_id))
  const previousCover = new Map(villages.rows.map(row => [row.village_id, row.cover_image_id]))

  const plan = orderPlan(kept, sharedExperiences)
  const undo = { projectRef, createdAt: now.toISOString(), items: [], removedProfileMedia: [], shiftedProfileMedia: [] }
  const focal = []
  for (const item of plan) {
    const records = toRecords(item, { fileId: randomUUID(), mediaId: item.loai === 'experience' ? randomUUID() : null, processed: processed.get(item) })
    const file = records.storedFile, source = records.imageSource
    await client.query(`INSERT INTO public.stored_files(file_id,storage_key,file_name,media_type,file_size_bytes,width_px,height_px,uploaded_by,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [file.file_id, file.storage_key, file.file_name, file.media_type, file.file_size_bytes, file.width_px, file.height_px, file.uploaded_by, now.toISOString()])
    await client.query(`INSERT INTO public.image_sources(file_id,source_type,page_url,license_url,nguoi_chup,ngay_chup,co_nguoi_ro_mat,da_xin_phep)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [source.file_id, source.source_type, source.page_url, source.license_url, source.nguoi_chup, source.ngay_chup, source.co_nguoi_ro_mat, source.da_xin_phep])
    const link = records.link
    if (link.kind === 'experience') {
      const rows = media.rows.filter(row => row.experience_id === item.id)
      for (const row of rows.filter(row => row.shared)) {
        await client.query('DELETE FROM public.profile_media WHERE profile_media_id=$1', [row.profile_media_id])
        const { shared, ...original } = row
        undo.removedProfileMedia.push(original)
      }
      for (const row of rows.filter(row => !row.shared)) {
        await client.query('UPDATE public.profile_media SET display_order=display_order+1 WHERE profile_media_id=$1', [row.profile_media_id])
        undo.shiftedProfileMedia.push({ profile_media_id: row.profile_media_id, display_order: row.display_order })
      }
      await client.query(`INSERT INTO public.profile_media(profile_media_id,file_id,experience_id,category,display_order) VALUES($1,$2,$3,$4,$5)`,
        [link.profile_media_id, link.file_id, link.experience_id, link.category, link.display_order])
      undo.items.push({ kind: 'experience', file_id: file.file_id, storage_key: file.storage_key, variant_keys: VARIANT_WIDTHS.map(width => variantKey(file.file_id, width)), profile_media_id: link.profile_media_id, experience_id: item.id })
    } else {
      await client.query('UPDATE public.villages SET cover_image_id=$2 WHERE village_id=$1', [link.village_id, link.cover_image_id])
      undo.items.push({ kind: 'village', file_id: file.file_id, storage_key: file.storage_key, variant_keys: VARIANT_WIDTHS.map(width => variantKey(file.file_id, width)), village_id: item.id, previous_cover_image_id: previousCover.get(item.id) ?? null })
    }
    if (records.focal) focal.push({ loai: item.loai, id: item.id, ten: item.ten, size: `${file.width_px}x${file.height_px}`, focal: records.focal })
  }

  const emptyExperiences = await client.query(`SELECT e.experience_id,e.name,v.name AS village_name FROM public.experiences e
    JOIN public.provider_profiles p ON p.provider_id=e.provider_id JOIN public.villages v ON v.village_id=p.village_id
    WHERE e.archived_at IS NULL AND NOT EXISTS(SELECT 1 FROM public.profile_media pm WHERE pm.experience_id=e.experience_id)
    ORDER BY v.name,e.name`)
  const emptyVillages = await client.query(`SELECT village_id,name AS village_name FROM public.villages WHERE is_active AND cover_image_id IS NULL ORDER BY name`)

  const sizes = plan.map(item => processed.get(item).bytes.length)
  const report = {
    imported: plan.length,
    byKind: { village: plan.filter(item => item.loai === 'village').length, experience: plan.filter(item => item.loai === 'experience').length },
    sharedExperiencesFirst: plan.filter(item => sharedExperiences.has(item.id)).length,
    byVillage: Object.fromEntries([...new Set(plan.map(item => item.lang))].sort().map(lang => [lang, {
      village: plan.filter(item => item.lang === lang && item.loai === 'village').length,
      experience: plan.filter(item => item.lang === lang && item.loai === 'experience').length }])),
    excluded: excluded.map(({ entry, reason }) => ({ loai: entry.loai, id: entry.id, lang: entry.lang, ten: entry.ten, reason })),
    archivedExperiencesImported: experiences.rows.filter(row => row.archived_at).map(row => ({ id: row.experience_id, name: row.name })),
    villagesWithPreviousCover: villages.rows.filter(row => row.cover_image_id).map(row => row.village_name),
    unlinkedSharedRows: undo.removedProfileMedia.length, shiftedRows: undo.shiftedProfileMedia.length,
    averageBytes: average(sizes), averageKB: Math.round(average(sizes) / 1024), minKB: Math.round(Math.min(...sizes) / 1024), maxKB: Math.round(Math.max(...sizes) / 1024),
    portraitsDefaultFocal: focal.length, focalNote: 'no focal/object-position column in the schema: reported only, nothing stored',
    focal,
    stillEmptyExperiences: emptyExperiences.rows, stillEmptyVillages: emptyVillages.rows,
  }
  if (!options.apply) return report

  const dir = join(notesDir, `seed-image-import-${now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'undo.json'), JSON.stringify(undo, null, 2), { flag: 'wx' })
  const uploaded = []
  try {
    for (const item of plan) {
      const entry = undo.items.find(row => row.kind === item.loai && (row.experience_id ?? row.village_id) === item.id)
      await storage.write(entry.storage_key, processed.get(item).bytes, 'image/jpeg', { replace: false })
      uploaded.push(entry.storage_key)
      // WebP display variants (step 2A, media-variants.mjs), listed in the undo file as variant_keys
      for (const variant of await makeVariants(processed.get(item).bytes)) {
        const key = variantKey(entry.file_id, variant.width)
        await storage.write(key, variant.bytes, 'image/webp', { replace: false })
        uploaded.push(key)
      }
    }
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    for (const key of uploaded) await storage.remove(key).catch(() => {})
    throw error
  }
  return { ...report, undoFile: join(dir, 'undo.json') }
}

/** @param {any} doc @param {string} projectRef */
function validateUndo(doc, projectRef) {
  if (!doc || doc.projectRef !== projectRef || !Array.isArray(doc.items) || !Array.isArray(doc.removedProfileMedia) || !Array.isArray(doc.shiftedProfileMedia))
    refuse('Not an undo file of storage:seed-images for this project.')
}

/** @param {any} options @param {any} deps @returns {Promise<any>} */
async function undoImport(options, { client, storage, projectRef }) {
  const doc = JSON.parse(readFileSync(options.undo, 'utf8'))
  validateUndo(doc, projectRef)
  for (const item of doc.items.filter(row => row.kind === 'village'))
    await client.query('UPDATE public.villages SET cover_image_id=$2 WHERE village_id=$1 AND cover_image_id=$3', [item.village_id, item.previous_cover_image_id, item.file_id])
  const newMedia = doc.items.filter(row => row.kind === 'experience').map(row => row.profile_media_id)
  await client.query('DELETE FROM public.profile_media WHERE profile_media_id=ANY($1::uuid[])', [newMedia])
  for (const row of doc.shiftedProfileMedia) await client.query('UPDATE public.profile_media SET display_order=$2 WHERE profile_media_id=$1', [row.profile_media_id, row.display_order])
  for (const row of doc.removedProfileMedia)
    await client.query(`INSERT INTO public.profile_media(profile_media_id,file_id,agency_id,provider_id,experience_id,category,display_order)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (profile_media_id) DO NOTHING`, [row.profile_media_id, row.file_id, row.agency_id, row.provider_id, row.experience_id, row.category, row.display_order])
  const fileIds = doc.items.map(row => row.file_id)
  await client.query('DELETE FROM public.image_sources WHERE file_id=ANY($1::uuid[])', [fileIds])
  const removed = await client.query('DELETE FROM public.stored_files WHERE file_id=ANY($1::uuid[])', [fileIds])
  const report = { mode: options.apply ? 'undo' : 'undo (dry run)', files: fileIds.length, storedFilesRemoved: removed.rowCount,
    profileMediaRestored: doc.removedProfileMedia.length, villagesReset: doc.items.filter(row => row.kind === 'village').length }
  if (!options.apply) return report
  await client.query('COMMIT')
  let objectsRemoved = 0
  for (const item of doc.items) for (const key of [item.storage_key, ...(item.variant_keys ?? [])]) { await storage.remove(key); objectsRemoved += 1 }
  return { ...report, objectsRemoved }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const { default: nextEnv } = await import('@next/env')
  nextEnv.loadEnvConfig(process.cwd())
  const projectRef = assertImportTarget(process.env)
  const notesDir = resolveNotesDir(process.cwd(), options.notesDir ?? DEFAULT_NOTES_DIR)
  const { connection } = await import('../db/shared.mjs')
  const { storageClient } = await import('./client.mjs')
  console.log(JSON.stringify({ projectRef, isDev: projectRef === DEV_PROJECT_REF, mode: options.undo ? `undo${options.apply ? '' : ' (dry run)'}` : options.apply ? 'apply' : 'dry-run (writes, then ROLLBACK; no upload)' }))
  const client = connection('migration')
  await client.connect()
  try {
    await client.query('BEGIN')
    const deps = { client, storage: storageClient(), notesDir, projectRef }
    const report = options.undo ? await undoImport(options, deps) : await importPhotos(options, deps)
    if (!options.apply) await client.query('ROLLBACK')
    console.log(JSON.stringify(report, null, 2))
    if (!options.apply) console.log('Dry run: every write was rolled back; nothing was uploaded.')
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {})
    throw error
  } finally { await client.end() }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1 })
}
