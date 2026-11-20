// Seed image import (human decisions 2026-11-18 and 2026-11-20): approved-photos.json → stored_files, image_sources,
// profile_media / villages.cover_image_id. Pure parts only: exclusions, validation, sizing, record mapping, ordering,
// sharp processing, SHA-256 check, DEV-only guard.
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import {
  EXCLUDED_ENTRIES, DEV_PROJECT_REF, PROD_PROJECT_REF, assertImportTarget, filterEntries, orderPlan, processImage,
  targetSize, toRecords, validateEntry, verifySha256,
} from '../../scripts/storage/seed-image-import-plan.mjs'

const entry = (over: Record<string, string> = {}) => ({
  loai: 'experience', id: '11111111-1111-5111-8111-111111111111', ten: 'Nặn gốm 1 · Xưởng 1', lang: 'Bát Tràng', nghe: 'Gốm sứ',
  dung_cho: 'Ảnh trải nghiệm', file: 'experience/11111111-1111-5111-8111-111111111111/1.jpg',
  page_url: 'https://www.pexels.com/photo/x-1/', author: 'Tác giả A', title: 'T', source_type: 'pexels', license: 'Pexels License',
  license_url: 'https://www.pexels.com/license/', original: '4000x3000', saved: '1920x1440', quality: '', co_nguoi_ro_mat: 'khong',
  ghi_chu: '', sha256: 'a'.repeat(64), ...over,
})
const MIGRATION = (ref: string) => `postgresql://postgres.${ref}:test-only@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`

describe('filterEntries', () => {
  it('drops the three images the human rejected on 2026-11-20, with reasons', () => {
    expect(EXCLUDED_ENTRIES.map(item => item.id)).toEqual([
      '0c56e775-3b91-5ef0-8e6d-86d0f954aca9', '7720b6b1-ae8d-5fa1-8cee-2583bd79a8d9', '096fc4d8-1eed-5d09-8c6f-a93037bb5225'])
    const rejected = EXCLUDED_ENTRIES.map(item => entry({ id: item.id, ten: item.ten, lang: item.lang }))
    const keep = entry()
    const { kept, excluded } = filterEntries([...rejected, keep])
    expect(kept).toEqual([keep])
    expect(excluded.map(item => [item.entry.id, item.reason])).toEqual([
      ['0c56e775-3b91-5ef0-8e6d-86d0f954aca9', 'chữ "LOVE" trên vải, không phải ảnh nghề'],
      ['7720b6b1-ae8d-5fa1-8cee-2583bd79a8d9', 'chữ "YES" trên vải, không phải ảnh nghề'],
      ['096fc4d8-1eed-5d09-8c6f-a93037bb5225', 'ảnh người mẫu, không thấy nghề dệt'],
    ])
  })
  it('drops images with clearly visible faces (no consent on file; image_sources_consent_chk)', () => {
    const face = entry({ co_nguoi_ro_mat: 'co' })
    const { kept, excluded } = filterEntries([face])
    expect(kept).toEqual([])
    expect(excluded[0].reason).toMatch(/rõ mặt/)
  })
  it('refuses an excluded id whose title no longer matches (stale exclusion list)', () => {
    expect(() => filterEntries([entry({ id: EXCLUDED_ENTRIES[0].id, ten: 'Tên khác' })])).toThrow(/0c56e775/)
  })
})

describe('validateEntry', () => {
  it('accepts a well-formed entry', () => { expect(validateEntry(entry())).toEqual([]) })
  it('refuses unknown kinds, bad ids, paths outside <loai>/<id>/<n>.jpg, unknown sources, missing page_url and bad hashes', () => {
    expect(validateEntry(entry({ loai: 'provider' }))).toContain('loai phải là village hoặc experience')
    expect(validateEntry(entry({ id: 'x' }))).toContain('id không phải UUID')
    expect(validateEntry(entry({ file: '../secret.jpg' }))).toContain('file phải có dạng <loai>/<id>/<n>.jpg')
    expect(validateEntry(entry({ file: 'experience/22222222-2222-5222-8222-222222222222/1.jpg' }))).toContain('file phải có dạng <loai>/<id>/<n>.jpg')
    expect(validateEntry(entry({ source_type: 'google' }))).toContain('source_type không hợp lệ')
    expect(validateEntry(entry({ page_url: '' }))).toContain('thiếu page_url')
    expect(validateEntry(entry({ sha256: 'abc' }))).toContain('sha256 không hợp lệ')
  })
})

describe('targetSize', () => {
  it('landscape: longest side 1600 px, never enlarged', () => {
    expect(targetSize(1920, 1290)).toEqual({ width: 1600, height: 1075 })
    expect(targetSize(1920, 1440)).toEqual({ width: 1600, height: 1200 })
    expect(targetSize(1500, 1000)).toEqual({ width: 1500, height: 1000 })
  })
  it('portrait: width 1280 px so the BR-008 minimum (1280×720) still holds (human decision 2026-11-20)', () => {
    expect(targetSize(1920, 2880)).toEqual({ width: 1280, height: 1920 })
    expect(targetSize(1920, 2560)).toEqual({ width: 1280, height: 1707 })
  })
  it('refuses a result under 1280×720', () => {
    expect(() => targetSize(2400, 900)).toThrow(/1280×720/)
    expect(() => targetSize(1000, 1500)).toThrow(/1280×720/)
  })
})

describe('toRecords', () => {
  const processed = { bytes: Buffer.from('jpeg'), width: 1600, height: 1200, sha256: 'b'.repeat(64) }
  it('maps an experience image to stored_files, image_sources and a profile_media gallery row', () => {
    const records = toRecords(entry(), { fileId: 'f0000000-0000-4000-8000-000000000001', mediaId: 'f0000000-0000-4000-8000-000000000002', processed })
    expect(records.storedFile).toEqual({
      file_id: 'f0000000-0000-4000-8000-000000000001', storage_key: 'prf-media/f0000000-0000-4000-8000-000000000001',
      file_name: 'seed-experience-11111111-1.jpg', media_type: 'image/jpeg', file_size_bytes: 4, width_px: 1600, height_px: 1200,
      uploaded_by: null,
    })
    expect(records.imageSource).toEqual({
      file_id: 'f0000000-0000-4000-8000-000000000001', source_type: 'pexels', page_url: 'https://www.pexels.com/photo/x-1/',
      license_url: 'https://www.pexels.com/license/', nguoi_chup: 'Tác giả A', ngay_chup: null, co_nguoi_ro_mat: false, da_xin_phep: false,
    })
    expect(records.link).toEqual({
      kind: 'experience', profile_media_id: 'f0000000-0000-4000-8000-000000000002', file_id: 'f0000000-0000-4000-8000-000000000001',
      experience_id: '11111111-1111-5111-8111-111111111111', category: 'Activity', display_order: 0,
    })
    expect(records.focal).toBeNull()
  })
  it('maps a village image to its cover and records the default focal point for portraits (report only, no column)', () => {
    const village = entry({ loai: 'village', id: '22222222-2222-5222-8222-222222222222', file: 'village/22222222-2222-5222-8222-222222222222/1.jpg', co_nguoi_ro_mat: '' })
    const records = toRecords(village, { fileId: 'f0000000-0000-4000-8000-000000000003', mediaId: null, processed: { ...processed, width: 1280, height: 1920 } })
    expect(records.link).toEqual({ kind: 'village', village_id: '22222222-2222-5222-8222-222222222222', cover_image_id: 'f0000000-0000-4000-8000-000000000003' })
    expect(records.focal).toEqual({ x: 50, y: 40 })
    expect(records.storedFile.file_name).toBe('seed-village-22222222-1.jpg')
  })
})

describe('orderPlan', () => {
  it('puts experiences that share images first, then other experiences, then villages', () => {
    const a = entry({ id: 'aaaaaaaa-aaaa-5aaa-8aaa-aaaaaaaaaaaa' }), b = entry({ id: 'bbbbbbbb-bbbb-5bbb-8bbb-bbbbbbbbbbbb' })
    const v = entry({ loai: 'village', id: 'cccccccc-cccc-5ccc-8ccc-cccccccccccc' })
    expect(orderPlan([v, a, b], new Set([b.id])).map(item => item.id)).toEqual([b.id, a.id, v.id])
  })
})

describe('processImage / verifySha256', () => {
  it('turns by EXIF, drops all metadata, writes a progressive JPEG at the target size', async () => {
    // stored 2400×1600 with orientation 6 (rotate 90°) → shown as a 1600×2400 portrait → 1280×1920
    const input = await sharp({ create: { width: 2400, height: 1600, channels: 3, background: '#88aa66' } })
      .withMetadata({ orientation: 6, exif: { IFD0: { Artist: 'someone' } } }).jpeg().toBuffer()
    expect((await sharp(input).metadata()).exif).toBeDefined()
    const out = await processImage(input)
    expect(out).toMatchObject({ width: 1280, height: 1920 })
    const meta = await sharp(out.bytes).metadata()
    expect(meta).toMatchObject({ format: 'jpeg', width: 1280, height: 1920, isProgressive: true })
    expect(meta.exif).toBeUndefined()
    expect(meta.icc).toBeUndefined()
    expect(meta.orientation).toBeUndefined()
    expect(out.sha256).toBe(createHash('sha256').update(out.bytes).digest('hex'))
  })
  it('refuses non-JPEG input', async () => {
    await expect(processImage(Buffer.from('\x89PNG\r\n'))).rejects.toThrow(/JPEG/)
  })
  it('stops when a file does not match the SHA-256 in the JSON', () => {
    const bytes = Buffer.from('photo')
    const sha = createHash('sha256').update(bytes).digest('hex')
    expect(() => verifySha256(bytes, entry({ sha256: sha }))).not.toThrow()
    expect(() => verifySha256(bytes, entry({ sha256: 'c'.repeat(64) }))).toThrow(/SHA-256/)
  })
})

describe('assertImportTarget', () => {
  it('runs on DEV only: PROD and any other project are refused before connecting', () => {
    const storage = (ref: string) => `https://${ref}.supabase.co`
    expect(assertImportTarget({ DATABASE_URL: MIGRATION(DEV_PROJECT_REF), SUPABASE_URL: storage(DEV_PROJECT_REF) })).toBe(DEV_PROJECT_REF)
    expect(() => assertImportTarget({ DATABASE_URL: MIGRATION(PROD_PROJECT_REF), SUPABASE_URL: storage(PROD_PROJECT_REF) })).toThrow()
    expect(() => assertImportTarget({ DATABASE_URL: MIGRATION(DEV_PROJECT_REF), SUPABASE_URL: storage(PROD_PROJECT_REF) })).toThrow()
    expect(() => assertImportTarget({})).toThrow(/not configured/)
  })
})
