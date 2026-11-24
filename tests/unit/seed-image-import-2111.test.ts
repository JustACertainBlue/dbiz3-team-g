/**
 * Seed image import 2111 (human request 2026-11-21): several photos per experience, the first photo of a village as its cover,
 * workshop gallery swap, the face-removal check that stops before any write, and PROD behind --target-prod + CONFIRM_PROJECT_REF.
 */
import { createHash } from 'node:crypto'
import { mkdtempSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { DEV_PROJECT_REF, PROD_PROJECT_REF, groupEntries, toRecords, toWorkshopRecords, validateWorkshopEntry } from '../../scripts/storage/seed-image-import-plan.mjs'
import { assertImportTarget, importPhotos, parseArgs, validateUndo } from '../../scripts/storage/import-seed-images.mjs'

const E = (n: number) => `aaaaaaaa-aaaa-5aaa-8aaa-${String(n).padStart(12, '0')}`
const V = (n: number) => `bbbbbbbb-bbbb-5bbb-8bbb-${String(n).padStart(12, '0')}`
const P = 'cccccccc-cccc-5ccc-8ccc-000000000001'
const entry = (loai: 'experience' | 'village', id: string, n: number, over: Record<string, string> = {}) => ({
  loai, id, ten: `T ${id.slice(-3)}`, lang: 'L', nghe: '', dung_cho: 'Ảnh', file: `${loai}/${id}/${n}.jpg`, page_url: 'https://www.pexels.com/photo/1/', author: 'A',
  title: 't', source_type: 'pexels', license: 'Pexels License', license_url: 'https://www.pexels.com/license/', original: '4000x3000', saved: '1920x1440',
  quality: 'đúng nghề', co_nguoi_ro_mat: 'khong', ghi_chu: '', sha256: String(n).repeat(64).slice(0, 64), ...over,
})

describe('groupEntries', () => {
  it('keeps every photo of an experience in file-number order and gives each its display order and the experience\'s photo count', () => {
    const { plan } = groupEntries([entry('experience', E(1), 2), entry('experience', E(1), 1), entry('experience', E(2), 1), entry('experience', E(1), 3)])
    expect(plan.map(item => [item.entry.id.slice(-3), item.entry.file.slice(-5), item.displayOrder, item.count])).toEqual([
      ['001', '1.jpg', 0, 3], ['001', '2.jpg', 1, 3], ['001', '3.jpg', 2, 3], ['002', '1.jpg', 0, 1]])
  })
  it('uses the first photo of a village as its cover and reports the others as alternates, not imported', () => {
    const { plan, alternates } = groupEntries([entry('village', V(1), 2), entry('village', V(1), 1), entry('village', V(2), 1)])
    expect(plan.map(item => item.entry.file)).toEqual([`village/${V(1)}/1.jpg`, `village/${V(2)}/1.jpg`])
    expect(alternates.map((item: any) => item.file)).toEqual([`village/${V(1)}/2.jpg`])
  })
  it('toRecords takes the display order of the photo', () => {
    const processed = { bytes: Buffer.from('j'), width: 1600, height: 1200, sha256: 'b'.repeat(64) }
    const records = toRecords(entry('experience', E(1), 2), { fileId: 'f0000000-0000-4000-8000-000000000001', mediaId: 'f0000000-0000-4000-8000-000000000002', processed, displayOrder: 1 })
    expect(records.link).toMatchObject({ kind: 'experience', display_order: 1 })
  })
})

const workshop = (n: number, over: Record<string, unknown> = {}) => ({
  loai: 'workshop', provider_id: P, xuong: 'Xưởng', lang: 'Vạn Phúc', version: 1, file: `workshop/${P}/${n}.jpg`, page_url: 'https://www.pexels.com/photo/2/', author: 'B',
  title: 't', source_type: 'pexels', license: 'Pexels License', license_url: 'https://www.pexels.com/license/', original: '6720x4480', saved: '1920x1280',
  quality: 'đúng nghề', co_nguoi_ro_mat: 'khong', ghi_chu: '', sha256: 'd'.repeat(64), vi_tri_moi: { display_order: n - 1, category: ['Activity', 'Space', 'Product'][n - 1] },
  thay_provider_version_media: null, thay_profile_media_cap_xuong: { profile_media_id: 'x', file_id: 'y', display_order: 0, category: 'Activity' }, them_moi: false, go_anh_cu: null, ...over,
})
describe('workshop entries', () => {
  it('accepts a well-formed entry and refuses wrong kind, path, version, position or hash', () => {
    expect(validateWorkshopEntry(workshop(1))).toEqual([])
    expect(validateWorkshopEntry(workshop(1, { loai: 'village' })).join()).toMatch(/loai/)
    expect(validateWorkshopEntry(workshop(1, { file: `workshop/${P}/x.jpg` })).join()).toMatch(/file/)
    expect(validateWorkshopEntry(workshop(1, { version: 'v1' })).join()).toMatch(/version/)
    expect(validateWorkshopEntry(workshop(1, { vi_tri_moi: { display_order: 0, category: 'Other' } })).join()).toMatch(/category/)
    expect(validateWorkshopEntry(workshop(1, { sha256: 'z' })).join()).toMatch(/sha256/)
  })
  it('maps a photo to stored_files, image_sources, the version media row, and the draft gallery row when the workshop has one', () => {
    const processed = { bytes: Buffer.from('jpeg'), width: 1600, height: 1067, sha256: 'e'.repeat(64) }
    const records = toWorkshopRecords(workshop(2), { fileId: 'f0000000-0000-4000-8000-000000000011', mediaId: 'f0000000-0000-4000-8000-000000000012', processed })
    expect(records.storedFile).toMatchObject({ file_id: 'f0000000-0000-4000-8000-000000000011', storage_key: 'prf-media/f0000000-0000-4000-8000-000000000011', width_px: 1600, height_px: 1067 })
    expect(records.imageSource).toMatchObject({ source_type: 'pexels', nguoi_chup: 'B', co_nguoi_ro_mat: false })
    expect(records.versionMedia).toEqual({ provider_id: P, version_no: 1, file_id: 'f0000000-0000-4000-8000-000000000011', category: 'Space', display_order: 1 })
    expect(records.draftMedia).toEqual({ profile_media_id: 'f0000000-0000-4000-8000-000000000012', file_id: 'f0000000-0000-4000-8000-000000000011', provider_id: P, category: 'Space', display_order: 1 })
    expect(toWorkshopRecords(workshop(2, { thay_profile_media_cap_xuong: null }), { fileId: 'f0000000-0000-4000-8000-000000000011', mediaId: 'f0000000-0000-4000-8000-000000000012', processed }).draftMedia).toBeNull()
  })
})

describe('options and targets', () => {
  it('is a dry run unless --apply; --faces, --workshops and --target-prod are new options; --undo writes by itself', () => {
    expect(parseArgs(['--json', 'a.json', '--photos-dir', 'd'])).toMatchObject({ apply: false, targetProd: false })
    const full = parseArgs(['--json', 'a.json', '--photos-dir', 'd', '--faces', 'f.json', '--workshops', 'w.json', '--target-prod', '--apply'])
    expect(full).toMatchObject({ apply: true, targetProd: true, faces: 'f.json', workshops: 'w.json' })
    expect(parseArgs(['--undo', 'u.json', '--target-prod'])).toMatchObject({ apply: true, undo: 'u.json', targetProd: true })
    expect(() => parseArgs(['--json', 'a.json', '--photos-dir', 'd', '--faces'])).toThrow(/needs a value/)
    expect(() => parseArgs(['--json', 'a.json', '--photos-dir', 'd', '--apply', '--dry-run'])).toThrow(/either/)
  })
  const env = (db: string, storage = db) => ({ DATABASE_URL: `postgresql://postgres.${db}:x@aws-0.pooler.supabase.com:5432/postgres`, SUPABASE_URL: `https://${storage}.supabase.co` })
  it('DEV by default; PROD only with --target-prod and CONFIRM_PROJECT_REF equal to the PROD ref', () => {
    expect(assertImportTarget(env(DEV_PROJECT_REF))).toBe(DEV_PROJECT_REF)
    expect(() => assertImportTarget(env(PROD_PROJECT_REF))).toThrow(/not the DEV project/)
    expect(() => assertImportTarget(env(PROD_PROJECT_REF), { targetProd: true })).toThrow(/CONFIRM_PROJECT_REF/)
    expect(assertImportTarget({ ...env(PROD_PROJECT_REF), CONFIRM_PROJECT_REF: PROD_PROJECT_REF }, { targetProd: true })).toBe(PROD_PROJECT_REF)
    expect(() => assertImportTarget({ ...env(DEV_PROJECT_REF), CONFIRM_PROJECT_REF: PROD_PROJECT_REF }, { targetProd: true })).toThrow(/DATABASE_URL/)
  })
})

describe('undo file', () => {
  it('accepts the previous layout and the new one with removed face rows and workshop items', () => {
    const base = { projectRef: 'r', items: [], removedProfileMedia: [], shiftedProfileMedia: [] }
    expect(() => validateUndo(base, 'r')).not.toThrow()
    expect(() => validateUndo({ ...base, removedFaceRows: { profile_media: [], provider_version_media: [] }, workshopItems: [] }, 'r')).not.toThrow()
    expect(() => validateUndo({ ...base, removedFaceRows: 'x' }, 'r')).toThrow(/undo file/)
    expect(() => validateUndo(base, 'other')).toThrow(/undo file/)
  })
})

describe('importPhotos stops before any write when the face list does not match this database', () => {
  it('refuses, and only reads', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'import-2111-'))
    const approved = join(dir, 'approved.json'); writeFileSync(approved, JSON.stringify([entry('experience', E(1), 1)]))
    const facesList = {
      version: 2, tong: { profile_media: 1, provider_version_media: 0, giu_lai: 0 }, hashes: [{ sha256: 'a'.repeat(64), anh: 'A' }],
      rows: [{ table: 'profile_media', sha256: 'a'.repeat(64), experience_id: E(1), profile_media_id: E(9), file_id: E(8), display_order: 0 }], giu_lai: [],
    }
    const faces = join(dir, 'faces.json'); writeFileSync(faces, JSON.stringify(facesList))
    const log: string[] = []
    const client = { async query(sql: string) { log.push(sql.replace(/\s+/g, ' ').trim().split(' ')[0].toUpperCase()); return { rows: [], rowCount: 0 } } }
    const storage = { async read() { return null }, async write() { log.push('STORAGE WRITE') }, async remove() { log.push('STORAGE REMOVE') } }
    await expect(importPhotos({ json: approved, photosDir: dir, faces, apply: true }, { client, storage, notesDir: dir, projectRef: DEV_PROJECT_REF })).rejects.toThrow(/does not match/i)
    expect(log.every(word => word === 'SELECT')).toBe(true)
  })
})


// --skip-missing-targets (human decision 2026-11-21, stage 1 of the PROD release)
import { compareRemoval, parseRemovalList, restrictRemovalList } from '../../scripts/storage/seed-image-faces.mjs'

const H = (c: string) => c.repeat(64)
const faceDoc = () => ({
  version: 2, tong: { profile_media: 2, provider_version_media: 1, giu_lai: 1 },
  hashes: [{ sha256: H('a') }, { sha256: H('b') }, { sha256: H('c') }],
  rows: [
    { table: 'profile_media', sha256: H('a'), experience_id: E(1) },
    { table: 'profile_media', sha256: H('b'), experience_id: E(2) },
    { table: 'provider_version_media', sha256: H('c'), provider_id: P, version_no: 1 },
  ],
  giu_lai: [{ table: 'profile_media', sha256: H('a'), experience_id: E(2) }],
})

describe('parseArgs --skip-missing-targets', () => {
  it('is an import option, off by default, refused with --undo', () => {
    expect(parseArgs(['--json', 'a.json', '--photos-dir', 'd', '--skip-missing-targets'])).toMatchObject({ skipMissingTargets: true, apply: false })
    expect(parseArgs(['--json', 'a.json', '--photos-dir', 'd'])).toMatchObject({ skipMissingTargets: false })
    expect(() => parseArgs(['--undo', 'u.json', '--skip-missing-targets'])).toThrow(/--skip-missing-targets/)
  })
})

describe('restrictRemovalList (face list limited to the targets this database has)', () => {
  it('drops the rows, kept rows and hashes that belong only to missing experiences or providers, and recomputes the totals', () => {
    const restricted = restrictRemovalList(parseRemovalList(faceDoc()), { experiences: new Set([E(1)]), providers: new Set<string>() })
    expect(restricted.rows.map((row: any) => row.sha256)).toEqual([H('a')])
    expect(restricted.retained).toEqual([])
    expect([...restricted.hashes]).toEqual([H('a')])
    expect(restricted.totals).toEqual({ profile_media: 1, provider_version_media: 0, giu_lai: 0 })
    expect(restricted.skipped).toEqual({ rows: 2, retained: 1 })
  })
  it('keeps everything when every target exists', () => {
    const restricted = restrictRemovalList(parseRemovalList(faceDoc()), { experiences: new Set([E(1), E(2)]), providers: new Set([P]) })
    expect(restricted.rows).toHaveLength(3)
    expect(restricted.skipped).toEqual({ rows: 0, retained: 0 })
  })
  it('the comparison against the database stays strict for what is left: a difference there still stops', () => {
    const restricted = restrictRemovalList(parseRemovalList(faceDoc()), { experiences: new Set([E(1)]), providers: new Set<string>() })
    const okRow = { table: 'profile_media', sha256: H('a'), experience_id: E(1) }
    expect(compareRemoval([okRow], new Set([H('a')]), restricted).ok).toBe(true)
    expect(compareRemoval([], new Set<string>(), restricted).ok).toBe(false)                                   // hash of an existing target not found
    expect(compareRemoval([okRow, okRow], new Set([H('a')]), restricted).problems.join()).toMatch(/unexpected 1/) // one row too many
  })
})

describe('importPhotos --skip-missing-targets', () => {
  const absent = new Set<string>()
  const fakeClient = (log: string[]) => ({
    async query(sql: string, values?: unknown[]) {
      const text = sql.replace(/\s+/g, ' ').trim()
      log.push(text.split(' ')[0].toUpperCase() + (text.startsWith('INSERT INTO public.stored_files') ? ' stored_files' : ''))
      const ids = (values?.[0] as string[] | undefined) ?? []
      if (text.includes('FROM public.experiences WHERE')) return { rows: ids.filter(id => !absent.has(id)).map(id => ({ experience_id: id, name: 'x', archived_at: null })) }
      if (text.includes('FROM public.villages WHERE')) return { rows: ids.filter(id => !absent.has(id)).map(id => ({ village_id: id, village_name: 'v', cover_image_id: null })) }
      if (text.includes('FROM public.provider_profiles WHERE')) return { rows: ids.filter(id => !absent.has(id)).map(id => ({ provider_id: id, published_version_no: 1 })) }
      return { rows: [], rowCount: 0 }
    },
  })
  const storage = { async read() { return null }, async write() {}, async remove() {} }
  async function photo(dir: string, item: ReturnType<typeof entry>) {
    const data = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: { r: 120, g: 90, b: 60 } } }).jpeg().toBuffer()
    const target = join(dir, item.file); (await import('node:fs')).mkdirSync(join(dir, item.loai, item.id), { recursive: true }); writeFileSync(target, data)
    return { ...item, sha256: createHash('sha256').update(data).digest('hex') }
  }
  it('imports the photos whose target exists, skips the rest and reports them; without the flag a missing target stops the run', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'import-skip-'))
    const kept = [await photo(dir, entry('experience', E(1), 1)), await photo(dir, entry('experience', E(2), 1)), await photo(dir, entry('village', V(1), 1))]
    const approved = join(dir, 'approved.json'); writeFileSync(approved, JSON.stringify(kept))
    absent.clear(); absent.add(E(2)); absent.add(V(1))
    const strictLog: string[] = []
    await expect(importPhotos({ json: approved, photosDir: dir, apply: false }, { client: fakeClient(strictLog), storage, notesDir: dir, projectRef: DEV_PROJECT_REF })).rejects.toThrow(/Unknown experience, village or workshop ids/)
    const log: string[] = []
    const report = await importPhotos({ json: approved, photosDir: dir, apply: false, skipMissingTargets: true }, { client: fakeClient(log), storage, notesDir: dir, projectRef: DEV_PROJECT_REF })
    expect(report.imported).toBe(1)
    expect(log.filter(word => word === 'INSERT stored_files')).toHaveLength(1)
    expect(report.skippedMissingTargets.photos.map((item: any) => `${item.loai}:${item.id}`).sort()).toEqual([`experience:${E(2)}`, `village:${V(1)}`])
    expect(report.skippedMissingTargets.counts).toMatchObject({ photos: 2, workshopPhotos: 0, faceRows: 0 })
  })
  it('without --faces or --workshops nothing else changes: all targets present gives skipped 0', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'import-skip-'))
    const kept = [await photo(dir, entry('experience', E(1), 1))]
    const approved = join(dir, 'approved.json'); writeFileSync(approved, JSON.stringify(kept))
    absent.clear()
    const report = await importPhotos({ json: approved, photosDir: dir, apply: false, skipMissingTargets: true }, { client: fakeClient([]), storage, notesDir: dir, projectRef: DEV_PROJECT_REF })
    expect(report.imported).toBe(1)
    expect(report.skippedMissingTargets.counts).toMatchObject({ photos: 0, workshopPhotos: 0, faceRows: 0 })
  })
})
