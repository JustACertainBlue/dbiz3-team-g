// Pure parts of scripts/storage/import-seed-images.mjs (human decisions 2026-11-18 and 2026-11-20): no connection,
// no env loading. Input is the reviewed approved-photos.json.
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { DEV_PROJECT_REF, PROD_PROJECT_REF, assertDevTargets } from './refresh-catalog-copies.mjs'

export { DEV_PROJECT_REF, PROD_PROJECT_REF }
export const SOURCE_TYPES = ['unsplash', 'pexels', 'pixabay', 'commons_cc0', 'flickr_pd', 'tu_chup']
export const MIN_WIDTH = 1280, MIN_HEIGHT = 720, MAX_SIDE = 1600, PORTRAIT_WIDTH = 1280, JPEG_QUALITY = 80
export const PORTRAIT_FOCAL = Object.freeze({ x: 50, y: 40 })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Photos the human rejected on 2026-11-20, matched by the SHA-256 of the photo file in approved-photos.json (the same hash
 * verifySha256 checks), not by experience id and title: a renamed experience, or a new photo for the same experience, must not
 * be caught by (or break on) an old rule. `id`, `ten` and `lang` only say where the photo was seen, for the report.
 */
export const EXCLUDED_ENTRIES = Object.freeze([
  { sha256: 'ca05b2a567315feca3f221ff48d7c7aaa201f913593b7022deb58cdf276535a2', id: '0c56e775-3b91-5ef0-8e6d-86d0f954aca9', lang: 'Quất Động', ten: 'Thêu khăn tay 1 · Xưởng 12', reason: 'chữ "LOVE" trên vải, không phải ảnh nghề' },
  { sha256: 'e0f489d5de677fb581651eb488907749c2db078e06557ec97690ad97fe6f6522', id: '7720b6b1-ae8d-5fa1-8cee-2583bd79a8d9', lang: 'Quất Động', ten: 'Thêu khăn tay 1 · Xưởng 5', reason: 'chữ "YES" trên vải, không phải ảnh nghề' },
  { sha256: 'c667be3c32852f8730cabdda2d552d07d511ebde31f791b999108418cd9123ee', id: '096fc4d8-1eed-5d09-8c6f-a93037bb5225', lang: 'Vạn Phúc', ten: 'Tìm hiểu nghề dệt lụa 1 · Xưởng 7', reason: 'ảnh người mẫu, không thấy nghề dệt' },
])
const FACE_REASON = 'có người rõ mặt, không có giấy đồng ý (image_sources_consent_chk; quyết định 2026-11-20)'

/** Splits entries into the ones to import and the ones left out (with the reason, for the report). */
export function filterEntries(entries) {
  const kept = [], excluded = []
  for (const item of entries) {
    const rule = EXCLUDED_ENTRIES.find(rejected => rejected.sha256 === item.sha256)
    if (rule) excluded.push({ entry: item, reason: rule.reason })
    else if (item.co_nguoi_ro_mat === 'co') excluded.push({ entry: item, reason: FACE_REASON })
    else kept.push(item)
  }
  return { kept, excluded }
}

/** Reasons an entry is refused; [] when it is acceptable. */
export function validateEntry(item) {
  const errors = []
  if (item.loai !== 'village' && item.loai !== 'experience') errors.push('loai phải là village hoặc experience')
  if (!UUID.test(item.id ?? '')) errors.push('id không phải UUID')
  const file = String(item.file ?? '').split('/')
  if (file.length !== 3 || file[0] !== item.loai || file[1] !== item.id || !/^[1-9]\.jpg$/.test(file[2])) errors.push('file phải có dạng <loai>/<id>/<n>.jpg')
  if (!SOURCE_TYPES.includes(item.source_type)) errors.push('source_type không hợp lệ')
  if (item.source_type !== 'tu_chup' && !String(item.page_url ?? '').trim()) errors.push('thiếu page_url')
  if (!/^[0-9a-f]{64}$/.test(item.sha256 ?? '')) errors.push('sha256 không hợp lệ')
  return errors
}

/** Landscape/square: longest side 1600 px; portrait: 1280 px wide (BR-008 minimum, decision 2026-11-20). Never enlarges. */
export function targetSize(width, height) {
  const scale = height > width ? Math.min(1, PORTRAIT_WIDTH / width) : Math.min(1, MAX_SIDE / Math.max(width, height))
  const size = { width: Math.round(width * scale), height: Math.round(height * scale) }
  if (size.width < MIN_WIDTH || size.height < MIN_HEIGHT) throw new Error(`ảnh nhỏ hơn ${MIN_WIDTH}×${MIN_HEIGHT} sau khi thu nhỏ (${size.width}×${size.height})`)
  return size
}

/** Database rows for one processed image. The focal point has no column (none in the schema): report only. */
export function toRecords(item, { fileId, mediaId, processed, displayOrder = 0 }) {
  const storedFile = {
    file_id: fileId, storage_key: `prf-media/${fileId}`, file_name: `seed-${item.loai}-${item.id.slice(0, 8)}-${item.file.split('/')[2]}`,
    media_type: 'image/jpeg', file_size_bytes: processed.bytes.length, width_px: processed.width, height_px: processed.height, uploaded_by: null,
  }
  const imageSource = {
    file_id: fileId, source_type: item.source_type, page_url: item.page_url || null, license_url: item.license_url || null,
    nguoi_chup: item.author || null, ngay_chup: null, co_nguoi_ro_mat: false, da_xin_phep: false,
  }
  const link = item.loai === 'village'
    ? { kind: 'village', village_id: item.id, cover_image_id: fileId }
    : { kind: 'experience', profile_media_id: mediaId, file_id: fileId, experience_id: item.id, category: 'Activity', display_order: displayOrder }
  return { storedFile, imageSource, link, focal: processed.height > processed.width ? { ...PORTRAIT_FOCAL } : null }
}

/**
 * Experiences that share images with another experience first, then other experiences, then villages.
 * @param {any[]} entries @param {Set<string>} sharedExperienceIds @returns {any[]}
 */
export function orderPlan(entries, sharedExperienceIds) {
  const rank = item => item.loai === 'village' ? 2 : sharedExperienceIds.has(item.id) ? 0 : 1
  return entries.map((item, index) => ({ item, index })).sort((a, b) => rank(a.item) - rank(b.item) || a.index - b.index).map(({ item }) => item)
}

export function verifySha256(bytes, item) {
  const actual = createHash('sha256').update(bytes).digest('hex')
  if (actual !== item.sha256) throw new Error(`SHA-256 mismatch for ${item.file}: the file is not the approved photo`)
}

const isJpeg = bytes => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff

/** Turn by EXIF, drop every metadata block (sharp keeps none unless asked), resize, progressive JPEG q80. */
export async function processImage(input) {
  if (!isJpeg(input)) throw new Error('không phải JPEG')
  const meta = await sharp(input).metadata()
  const turned = (meta.orientation ?? 1) >= 5
  const shown = turned ? { width: meta.height, height: meta.width } : { width: meta.width, height: meta.height }
  const size = targetSize(shown.width, shown.height)
  const { data, info } = await sharp(input).rotate().resize(size.width, size.height)
    .jpeg({ quality: JPEG_QUALITY, progressive: true }).toBuffer({ resolveWithObject: true })
  return { bytes: data, width: info.width, height: info.height, sha256: createHash('sha256').update(data).digest('hex') }
}

/** DEV only: both DATABASE_URL and SUPABASE_URL must name the DEV project; PROD is always refused. */
export const assertImportTarget = env => assertDevTargets(env)

/**
 * Photos per position (human request 2026-11-21): every photo of an experience goes into its gallery in file-number order
 * (`displayOrder`, and `count` of photos so the old photos move down once); a village has one cover, so its first photo is
 * used and the others are returned as `alternates`, not imported.
 * @param {any[]} entries @returns {{ plan: { entry: any, displayOrder: number, count: number, id: string, loai: string }[], alternates: any[] }}
 */
export function groupEntries(entries) {
  const number = item => Number(String(item.file).split('/').pop().replace(/\.jpg$/, ''))
  const groups = new Map()
  for (const item of entries) groups.set(`${item.loai}:${item.id}`, [...(groups.get(`${item.loai}:${item.id}`) ?? []), item])
  const plan = [], alternates = []
  for (const group of groups.values()) {
    group.sort((a, b) => number(a) - number(b))
    if (group[0].loai === 'village') { plan.push({ entry: group[0], displayOrder: 0, count: 1, id: group[0].id, loai: 'village' }); alternates.push(...group.slice(1)) }
    else group.forEach((entry, index) => plan.push({ entry, displayOrder: index, count: group.length, id: entry.id, loai: entry.loai }))
  }
  return { plan, alternates }
}

const CATEGORIES = ['Activity', 'Space', 'Product']

/** Reasons a workshop entry of xuong-2111-final.json is refused; [] when it is acceptable. */
export function validateWorkshopEntry(item) {
  const errors = []
  if (item.loai !== 'workshop') errors.push('loai phải là workshop')
  if (!UUID.test(item.provider_id ?? '')) errors.push('provider_id không phải UUID')
  const file = String(item.file ?? '').split('/')
  if (file.length !== 3 || file[0] !== 'workshop' || file[1] !== item.provider_id || !/^[1-9]\.jpg$/.test(file[2])) errors.push('file phải có dạng workshop/<provider_id>/<n>.jpg')
  if (!Number.isInteger(item.version) || item.version < 1) errors.push('version phải là số nguyên từ 1')
  if (!SOURCE_TYPES.includes(item.source_type)) errors.push('source_type không hợp lệ')
  if (item.source_type !== 'tu_chup' && !String(item.page_url ?? '').trim()) errors.push('thiếu page_url')
  if (!/^[0-9a-f]{64}$/.test(item.sha256 ?? '')) errors.push('sha256 không hợp lệ')
  if (!CATEGORIES.includes(item.vi_tri_moi?.category)) errors.push('vi_tri_moi.category phải là Activity, Space hoặc Product')
  if (!Number.isInteger(item.vi_tri_moi?.display_order) || item.vi_tri_moi.display_order < 0) errors.push('vi_tri_moi.display_order phải là số nguyên không âm')
  return errors
}

/** Rows for one workshop photo: stored_files, image_sources, the version media row and, when the workshop has a draft gallery, its profile_media row. */
export function toWorkshopRecords(item, { fileId, mediaId, processed }) {
  const where = item.vi_tri_moi
  const storedFile = {
    file_id: fileId, storage_key: `prf-media/${fileId}`, file_name: `seed-workshop-${item.provider_id.slice(0, 8)}-${item.file.split('/')[2]}`,
    media_type: 'image/jpeg', file_size_bytes: processed.bytes.length, width_px: processed.width, height_px: processed.height, uploaded_by: null,
  }
  const imageSource = {
    file_id: fileId, source_type: item.source_type, page_url: item.page_url || null, license_url: item.license_url || null,
    nguoi_chup: item.author || null, ngay_chup: null, co_nguoi_ro_mat: false, da_xin_phep: false,
  }
  return {
    storedFile, imageSource,
    versionMedia: { provider_id: item.provider_id, version_no: item.version, file_id: fileId, category: where.category, display_order: where.display_order },
    draftMedia: item.thay_profile_media_cap_xuong ? { profile_media_id: mediaId, file_id: fileId, provider_id: item.provider_id, category: where.category, display_order: where.display_order } : null,
  }
}
