
// Seed image import, DEV by default, PROD with --target-prod (human decisions 2026-11-18, 2026-11-20 and 2026-11-21).
//   npm run storage:seed-images -- --json <approved-photos.json> --photos-dir <dir> [--dry-run | --apply] [--notes-dir <dir>]
//   npm run storage:seed-images -- --undo <dir>/undo.json [--dry-run]
//   CONFIRM_PROJECT_REF=<prod ref> npm run storage:seed-images -- --json ... --photos-dir ... --target-prod [--apply]
// Seed image import (human decisions 2026-11-18, 2026-11-20 and 2026-11-21). DEV by default; PROD only with --target-prod.
//   npm run storage:seed-images -- --json <approved-photos.json> --photos-dir <dir> [--faces <go-anh-mat-nguoi.json>]
//       [--workshops <xuong.json>] [--dry-run | --apply] [--target-prod] [--notes-dir <dir>]
//   npm run storage:seed-images -- --undo <dir>/undo.json [--dry-run] [--target-prod]
//   CONFIRM_PROJECT_REF=<prod ref> npm run storage:seed-images -- ... --target-prod
// Reads the reviewed approved-photos.json and the photos under --photos-dir (<loai>/<id>/<n>.jpg), checks each file's SHA-256,
// leaves out the rejected photos (by SHA-256) and the face images (seed-image-import-plan.mjs), and processes each photo with sharp
// (EXIF turn, no metadata, longest side 1600 px or 1280 px wide for portraits, progressive JPEG q80). Then, in one transaction:
//   - stored_files + image_sources (author → nguoi_chup; provenance is never shown in the UI) for every photo;
//   - experience: every photo of the experience joins its gallery in file-number order from display_order 0; the experience's
//     profile_media rows whose file is also used by another experience are unlinked (stored_files and objects stay), the others
//     move down by the number of new photos;
//   - village: villages.cover_image_id = its first photo (other photos of the village are reported as alternates, not imported);
//   - --faces: the rows that show a clearly visible person are found by the SHA-256 of the object bytes and compared with the list
//     BEFORE anything is written (a difference stops the run); then they are unlinked, except the rows the list keeps on purpose;
//   - --workshops: the workshop photos are added to provider_version_media (the published version) and to the draft gallery
//     (profile_media with provider_id) when the workshop has one.
// The dry run (default) does all writes and rolls back; it uploads nothing. --apply writes <notes-dir>/seed-image-import-<UTC>/undo.json
// first, uploads the objects (prf-media/<new file_id> and its WebP variants .w400/.w800/.w1600.webp), then commits; a failed upload or commit removes the uploaded objects.
// Refuses to run unless DATABASE_URL and SUPABASE_URL both name the DEV project, or, with --target-prod, both name PROD and
// CONFIRM_PROJECT_REF equals that ref (typed in the shell, not read from a .env file); checked before any connection. Never reads a .env file itself: the
// first, uploads the objects (prf-media/<new file_id> and its WebP variants .w400/.w800/.w1600.webp with their size caps), then commits;
// a failed upload or commit removes the uploaded objects. --undo restores every row it removed or moved and deletes what it added.
// Refuses to run unless DATABASE_URL and SUPABASE_URL both name the DEV project, or, with --target-prod, both name PROD and
// CONFIRM_PROJECT_REF (typed in the shell, never read from a .env file) equals that ref. Never reads a .env file itself: the
// environment comes from @next/env in the folder the command runs from.
import { randomUUID } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { assertTargets, resolveNotesDir } from './refresh-catalog-copies.mjs'
import { compareRemoval, findFaceRows, parseRemovalList, removeFaceRows } from './seed-image-faces.mjs'
import { VARIANT_WIDTHS, makeVariants, variantKey } from './media-variants.mjs'
import {
  DEV_PROJECT_REF, PROD_PROJECT_REF, assertImportTarget, filterEntries, orderPlan, processImage, toRecords, validateEntry, verifySha256,
  DEV_PROJECT_REF, PROD_PROJECT_REF, filterEntries, groupEntries, orderPlan, processImage, toRecords, toWorkshopRecords, validateEntry, validateWorkshopEntry, verifySha256,
} from './seed-image-import-plan.mjs'

export const DEFAULT_NOTES_DIR = '.demo-data/seed-image-import'
/** Runs before any connection: DEV, or PROD with --target-prod and a matching CONFIRM_PROJECT_REF. */
export const assertImportTarget = (env, { targetProd = false } = {}) => assertTargets(env, { targetProd })
const refuse = message => { throw new Error(message) }

/** @param {string[]} argv */
export function parseArgs(argv) {
  /** @type {{apply:boolean,targetProd:boolean,undo?:string,notesDir?:string,json?:string,photosDir?:string}} */
  /** @type {{apply:boolean,targetProd:boolean,undo?:string,notesDir?:string,json?:string,photosDir?:string,faces?:string,workshops?:string}} */
  const options = { apply: false, targetProd: false }
  let dryRun = false, apply = false
  const takes = { '--undo': 'undo', '--notes-dir': 'notesDir', '--json': 'json', '--photos-dir': 'photosDir', '--faces': 'faces', '--workshops': 'workshops' }
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') dryRun = true
    else if (arg === '--apply') apply = true
    else if (arg === '--target-prod') options.targetProd = true
    else if (arg in takes) {
      const value = argv[index + 1]
      if (!value || value.startsWith('--')) refuse(`${arg} needs a value.`)
      Object.assign(options, { [/** @type {Record<string,string>} */ (takes)[arg]]: value })
      index += 1
    } else refuse(`Unknown option ${arg}; use --json <file> --photos-dir <dir> [--dry-run | --apply] [--notes-dir <dir>] [--target-prod] or --undo <file> [--dry-run].`)
    } else refuse(`Unknown option ${arg}; use --json <file> --photos-dir <dir> [--faces <file>] [--workshops <file>] [--dry-run | --apply] [--target-prod] [--notes-dir <dir>] or --undo <file> [--dry-run].`)
  }
  if (dryRun && apply) refuse('Choose either --dry-run or --apply.')
  if (options.undo && apply) refuse('--undo writes by itself; use --undo <file> --dry-run to preview.')
  if (!options.undo && (!options.json || !options.photosDir)) refuse('--json and --photos-dir are required.')
  options.apply = options.undo ? !dryRun : apply
  return options
}

const average = values => values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : 0

/** @param {any} options @param {any} deps @returns {Promise<any>} */
export async function importPhotos(options, { client, storage, notesDir, projectRef, now = new Date() }) {
  const entries = JSON.parse(readFileSync(options.json, 'utf8'))
  if (!Array.isArray(entries)) refuse('approved-photos.json must be an array.')
  const invalid = entries.map(item => ({ id: item.id, file: item.file, errors: validateEntry(item) })).filter(item => item.errors.length)
  if (invalid.length) refuse(`Invalid entries: ${JSON.stringify(invalid)}`)
  const { kept, excluded } = filterEntries(entries)
  const { plan: grouped, alternates } = groupEntries(kept)
  const workshopEntries = options.workshops ? JSON.parse(readFileSync(options.workshops, 'utf8')) : []
  if (!Array.isArray(workshopEntries)) refuse('The workshops file must be an array.')
  const badWorkshops = workshopEntries.map(item => ({ provider_id: item.provider_id, file: item.file, errors: validateWorkshopEntry(item) })).filter(item => item.errors.length)
  if (badWorkshops.length) refuse(`Invalid workshop entries: ${JSON.stringify(badWorkshops)}`)

  // The face list is compared with this database before anything is written; a difference stops the run.
  let faceList = null, faceFound = null
  if (options.faces) {
    faceList = parseRemovalList(JSON.parse(readFileSync(options.faces, 'utf8')))
    faceFound = await findFaceRows(client, storage, faceList)
    const check = compareRemoval(faceFound.rows, faceFound.hashesFound, faceList)
    if (!check.ok) refuse(`The face-removal list does not match this database; nothing was written. ${check.problems.slice(0, 12).join('; ')}`)
  }

  const processed = new Map()
  for (const item of [...kept, ...workshopEntries]) {
    const bytes = readFileSync(resolve(options.photosDir, item.file))
    verifySha256(bytes, item)
    processed.set(item, await processImage(bytes))
  }

  const experienceIds = [...new Set(kept.filter(item => item.loai === 'experience').map(item => item.id))]
  const villageIds = [...new Set(kept.filter(item => item.loai === 'village').map(item => item.id))]
  const providerIds = [...new Set(workshopEntries.map(item => item.provider_id))]
  const experiences = await client.query('SELECT experience_id,name,archived_at FROM public.experiences WHERE experience_id=ANY($1::uuid[])', [experienceIds])
  const villages = await client.query('SELECT village_id,name AS village_name,cover_image_id FROM public.villages WHERE village_id=ANY($1::uuid[])', [villageIds])
  const providers = await client.query('SELECT provider_id,published_version_no FROM public.provider_profiles WHERE provider_id=ANY($1::uuid[])', [providerIds])
  const missing = [...experienceIds.filter(id => !experiences.rows.some(row => row.experience_id === id)), ...villageIds.filter(id => !villages.rows.some(row => row.village_id === id)),
    ...providerIds.filter(id => !providers.rows.some(row => row.provider_id === id))]
  if (missing.length) refuse(`Unknown experience, village or workshop ids: ${missing.join(', ')}`)
  const wrongVersion = workshopEntries.filter(item => String(providers.rows.find(row => row.provider_id === item.provider_id).published_version_no) !== String(item.version))
  if (wrongVersion.length) refuse(`Workshop photos name a version that is not the published one: ${[...new Set(wrongVersion.map(item => item.provider_id))].join(', ')}`)
  const media = await client.query(`SELECT pm.*, EXISTS(SELECT 1 FROM public.profile_media o WHERE o.file_id=pm.file_id AND o.experience_id IS DISTINCT FROM pm.experience_id) AS shared
    FROM public.profile_media pm WHERE pm.experience_id=ANY($1::uuid[]) ORDER BY pm.experience_id, pm.display_order`, [experienceIds])
  const sharedExperiences = new Set(media.rows.filter(row => row.shared).map(row => row.experience_id))
  const previousCover = new Map(villages.rows.map(row => [row.village_id, row.cover_image_id]))

  const plan = orderPlan(grouped, sharedExperiences)
  const undo = { projectRef, createdAt: now.toISOString(), items: [], removedProfileMedia: [], shiftedProfileMedia: [], removedFaceRows: undefined, workshopItems: [] }
  const uploads = []   // every new object: { file_id, storage_key, bytes }
  const focal = []
  for (const step of plan) {
    const item = step.entry
    const records = toRecords(item, { fileId: randomUUID(), mediaId: item.loai === 'experience' ? randomUUID() : null, processed: processed.get(item), displayOrder: step.displayOrder })
    const file = records.storedFile, source = records.imageSource
    await client.query(`INSERT INTO public.stored_files(file_id,storage_key,file_name,media_type,file_size_bytes,width_px,height_px,uploaded_by,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [file.file_id, file.storage_key, file.file_name, file.media_type, file.file_size_bytes, file.width_px, file.height_px, file.uploaded_by, now.toISOString()])
    await client.query(`INSERT INTO public.image_sources(file_id,source_type,page_url,license_url,nguoi_chup,ngay_chup,co_nguoi_ro_mat,da_xin_phep)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [source.file_id, source.source_type, source.page_url, source.license_url, source.nguoi_chup, source.ngay_chup, source.co_nguoi_ro_mat, source.da_xin_phep])
    uploads.push({ file_id: file.file_id, storage_key: file.storage_key, bytes: processed.get(item).bytes })
    const link = records.link
    if (link.kind === 'experience') {
      if (step.displayOrder === 0) {   // old rows are unlinked or moved down once per experience, however many photos it gets
        const rows = media.rows.filter(row => row.experience_id === item.id)
        for (const row of rows.filter(row => row.shared)) {
          await client.query('DELETE FROM public.profile_media WHERE profile_media_id=$1', [row.profile_media_id])
          const { shared, ...original } = row
          undo.removedProfileMedia.push(original)
        }
        for (const row of rows.filter(row => !row.shared)) {
          await client.query('UPDATE public.profile_media SET display_order=display_order+$2 WHERE profile_media_id=$1', [row.profile_media_id, step.count])
          undo.shiftedProfileMedia.push({ profile_media_id: row.profile_media_id, display_order: row.display_order })
        }
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

  // Face rows: removed after the importer's own unlinking; rows already gone are skipped (DELETE ... RETURNING returns what was deleted).
  let faces = null
  if (faceList) {
    const removed = await removeFaceRows(client, faceFound.rows, faceList)
    undo.removedFaceRows = { profile_media: removed.profile_media, provider_version_media: removed.provider_version_media }
    faces = {
      listRows: { profile_media: faceList.totals.profile_media, provider_version_media: faceList.totals.provider_version_media, kept: faceList.totals.giu_lai },
      found: faceFound.rows.length, hashesFound: faceFound.hashesFound.size,
      removedNow: { profile_media: removed.profile_media.length, provider_version_media: removed.provider_version_media.length },
      alreadyUnlinkedByImporter: faceList.rows.length - removed.profile_media.length - removed.provider_version_media.length,
      retained: removed.retained.map(row => ({ table: row.table, experience_id: row.experience_id ?? null, file_id: row.file_id })),
    }
  }

  // Workshop galleries: new photos in the published version (and the draft gallery), after the old face rows are gone.
  const workshops = []
  for (const item of workshopEntries) {
    const records = toWorkshopRecords(item, { fileId: randomUUID(), mediaId: randomUUID(), processed: processed.get(item) })
    const file = records.storedFile, source = records.imageSource, version = records.versionMedia, draft = records.draftMedia
    await client.query(`INSERT INTO public.stored_files(file_id,storage_key,file_name,media_type,file_size_bytes,width_px,height_px,uploaded_by,created_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [file.file_id, file.storage_key, file.file_name, file.media_type, file.file_size_bytes, file.width_px, file.height_px, file.uploaded_by, now.toISOString()])
    await client.query(`INSERT INTO public.image_sources(file_id,source_type,page_url,license_url,nguoi_chup,ngay_chup,co_nguoi_ro_mat,da_xin_phep)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [source.file_id, source.source_type, source.page_url, source.license_url, source.nguoi_chup, source.ngay_chup, source.co_nguoi_ro_mat, source.da_xin_phep])
    await client.query('INSERT INTO public.provider_version_media(provider_id,version_no,file_id,category,display_order) VALUES($1,$2,$3,$4,$5)',
      [version.provider_id, version.version_no, version.file_id, version.category, version.display_order])
    if (draft) await client.query('INSERT INTO public.profile_media(profile_media_id,file_id,provider_id,category,display_order) VALUES($1,$2,$3,$4,$5)',
      [draft.profile_media_id, draft.file_id, draft.provider_id, draft.category, draft.display_order])
    uploads.push({ file_id: file.file_id, storage_key: file.storage_key, bytes: processed.get(item).bytes })
    undo.workshopItems.push({ provider_id: item.provider_id, version_no: item.version, file_id: file.file_id, storage_key: file.storage_key, variant_keys: VARIANT_WIDTHS.map(width => variantKey(file.file_id, width)), profile_media_id: draft?.profile_media_id ?? null })
    workshops.push(item.provider_id)
  }
  const galleries = providerIds.length ? (await client.query(`SELECT provider_id::text, count(*)::int AS photos FROM public.provider_version_media m
    WHERE provider_id=ANY($1::uuid[]) AND version_no=(SELECT published_version_no FROM public.provider_profiles p WHERE p.provider_id=m.provider_id) GROUP BY provider_id`, [providerIds])).rows : []

  const emptyExperiences = await client.query(`SELECT e.experience_id,e.name,v.name AS village_name FROM public.experiences e
    JOIN public.provider_profiles p ON p.provider_id=e.provider_id JOIN public.villages v ON v.village_id=p.village_id
    WHERE e.archived_at IS NULL AND NOT EXISTS(SELECT 1 FROM public.profile_media pm WHERE pm.experience_id=e.experience_id)
    ORDER BY v.name,e.name`)
  const emptyVillages = await client.query(`SELECT village_id,name AS village_name FROM public.villages WHERE is_active AND cover_image_id IS NULL ORDER BY name`)

  const sizes = uploads.map(upload => upload.bytes.length)
  const report = {
    mode: options.apply ? 'apply' : 'dry-run (writes, then ROLLBACK; no upload)', projectRef,
    imported: plan.length, importedWorkshopPhotos: workshopEntries.length,
    byKind: { village: plan.filter(step => step.loai === 'village').length, experience: plan.filter(step => step.loai === 'experience').length, workshop: workshopEntries.length },
    alternatesNotImported: alternates.length,
    sharedExperiencesFirst: plan.filter(step => sharedExperiences.has(step.id)).length,
    byVillage: Object.fromEntries([...new Set(plan.map(step => step.entry.lang))].sort().map(lang => [lang, {
      village: plan.filter(step => step.entry.lang === lang && step.loai === 'village').length,
      experience: plan.filter(step => step.entry.lang === lang && step.loai === 'experience').length }])),
    excluded: excluded.map(({ entry, reason }) => ({ loai: entry.loai, id: entry.id, lang: entry.lang, ten: entry.ten, reason })),
    archivedExperiencesImported: experiences.rows.filter(row => row.archived_at).map(row => ({ id: row.experience_id, name: row.name })),
    villagesWithPreviousCover: villages.rows.filter(row => row.cover_image_id).map(row => row.village_name),
    unlinkedSharedRows: undo.removedProfileMedia.length, shiftedRows: undo.shiftedProfileMedia.length,
    faces, workshopGalleries: galleries,
    averageBytes: average(sizes), averageKB: Math.round(average(sizes) / 1024), minKB: sizes.length ? Math.round(Math.min(...sizes) / 1024) : 0, maxKB: sizes.length ? Math.round(Math.max(...sizes) / 1024) : 0,
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
    for (const upload of uploads) {
      await storage.write(upload.storage_key, upload.bytes, 'image/jpeg', { replace: false })
      uploaded.push(upload.storage_key)
      // WebP display variants (step 2A, media-variants.mjs, with their size caps), listed in the undo file as variant_keys
      for (const variant of await makeVariants(upload.bytes)) {
        const key = variantKey(upload.file_id, variant.width)
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
export function validateUndo(doc, projectRef) {
  const arrays = doc && Array.isArray(doc.items) && Array.isArray(doc.removedProfileMedia) && Array.isArray(doc.shiftedProfileMedia)
  const faces = doc?.removedFaceRows === undefined || doc?.removedFaceRows === null
    || (typeof doc.removedFaceRows === 'object' && Array.isArray(doc.removedFaceRows.profile_media) && Array.isArray(doc.removedFaceRows.provider_version_media))
  const workshops = doc?.workshopItems === undefined || Array.isArray(doc?.workshopItems)
  if (!doc || doc.projectRef !== projectRef || !arrays || !faces || !workshops) refuse('Not an undo file of storage:seed-images for this project.')
}

/** @param {any} options @param {any} deps @returns {Promise<any>} */
async function undoImport(options, { client, storage, projectRef }) {
  const doc = JSON.parse(readFileSync(options.undo, 'utf8'))
  validateUndo(doc, projectRef)
  const workshopItems = doc.workshopItems ?? [], removedFaces = doc.removedFaceRows ?? { profile_media: [], provider_version_media: [] }
  // 1. what the import added
  for (const item of doc.items.filter(row => row.kind === 'village'))
    await client.query('UPDATE public.villages SET cover_image_id=$2 WHERE village_id=$1 AND cover_image_id=$3', [item.village_id, item.previous_cover_image_id, item.file_id])
  const newMedia = [...doc.items.filter(row => row.kind === 'experience').map(row => row.profile_media_id), ...workshopItems.map(row => row.profile_media_id).filter(Boolean)]
  await client.query('DELETE FROM public.profile_media WHERE profile_media_id=ANY($1::uuid[])', [newMedia])
  if (workshopItems.length) await client.query('DELETE FROM public.provider_version_media WHERE file_id=ANY($1::uuid[])', [workshopItems.map(row => row.file_id)])
  // 2. what it moved or removed
  for (const row of doc.shiftedProfileMedia) await client.query('UPDATE public.profile_media SET display_order=$2 WHERE profile_media_id=$1', [row.profile_media_id, row.display_order])
  for (const row of [...doc.removedProfileMedia, ...removedFaces.profile_media])
    await client.query(`INSERT INTO public.profile_media(profile_media_id,file_id,agency_id,provider_id,experience_id,category,display_order)
      VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (profile_media_id) DO NOTHING`, [row.profile_media_id, row.file_id, row.agency_id, row.provider_id, row.experience_id, row.category, row.display_order])
  for (const row of removedFaces.provider_version_media)
    await client.query(`INSERT INTO public.provider_version_media(provider_id,version_no,file_id,category,display_order)
      VALUES($1,$2,$3,$4,$5) ON CONFLICT (provider_id,version_no,file_id) DO NOTHING`, [row.provider_id, row.version_no, row.file_id, row.category, row.display_order])
  // 3. the new files
  const fileIds = [...doc.items.map(row => row.file_id), ...workshopItems.map(row => row.file_id)]
  await client.query('DELETE FROM public.image_sources WHERE file_id=ANY($1::uuid[])', [fileIds])
  const removed = await client.query('DELETE FROM public.stored_files WHERE file_id=ANY($1::uuid[])', [fileIds])
  const report = { mode: options.apply ? 'undo' : 'undo (dry run)', files: fileIds.length, storedFilesRemoved: removed.rowCount,
    profileMediaRestored: doc.removedProfileMedia.length + removedFaces.profile_media.length, providerVersionMediaRestored: removedFaces.provider_version_media.length,
    villagesReset: doc.items.filter(row => row.kind === 'village').length }
  if (!options.apply) return report
  await client.query('COMMIT')
  let objectsRemoved = 0
  for (const item of [...doc.items, ...workshopItems]) for (const key of [item.storage_key, ...(item.variant_keys ?? [])]) { await storage.remove(key); objectsRemoved += 1 }
  return { ...report, objectsRemoved }
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const confirmFromShell = process.env.CONFIRM_PROJECT_REF // typed with the command, not read from a .env file
  const { default: nextEnv } = await import('@next/env')
  const confirmFromShell = process.env.CONFIRM_PROJECT_REF // typed with the command, not read from a .env file
  nextEnv.loadEnvConfig(process.cwd())
  const projectRef = assertImportTarget({ ...process.env, CONFIRM_PROJECT_REF: confirmFromShell }, { targetProd: options.targetProd })
  const notesDir = resolveNotesDir(process.cwd(), options.notesDir ?? DEFAULT_NOTES_DIR)
  const { connection } = await import('../db/shared.mjs')
  const { storageClient } = await import('./client.mjs')
  console.log(JSON.stringify({ projectRef, isDev: projectRef === DEV_PROJECT_REF, isProd: projectRef === PROD_PROJECT_REF, mode: options.undo ? `undo${options.apply ? '' : ' (dry run)'}` : options.apply ? 'apply' : 'dry-run (writes, then ROLLBACK; no upload)' }))
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
