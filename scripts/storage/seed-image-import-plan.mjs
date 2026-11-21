// Pure parts of scripts/storage/import-seed-images.mjs (human decisions 2026-11-18 and 2026-11-20): no connection,
// no env loading. Input is the reviewed approved-photos.json.
import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { DEV_PROJECT_REF, PROD_PROJECT_REF, assertTargets } from './refresh-catalog-copies.mjs'

export { DEV_PROJECT_REF, PROD_PROJECT_REF }
export const SOURCE_TYPES = ['unsplash', 'pexels', 'pixabay', 'commons_cc0', 'flickr_pd', 'tu_chup']
export const MIN_WIDTH = 1280, MIN_HEIGHT = 720, MAX_SIDE = 1600, PORTRAIT_WIDTH = 1280, JPEG_QUALITY = 80
export const PORTRAIT_FOCAL = Object.freeze({ x: 50, y: 40 })
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Images the human rejected on 2026-11-20 (id + title, so a stale list fails loudly). */
export const EXCLUDED_ENTRIES = Object.freeze([
  { id: '0c56e775-3b91-5ef0-8e6d-86d0f954aca9', lang: 'Quất Động', ten: 'Thêu khăn tay 1 · Xưởng 12', reason: 'chữ "LOVE" trên vải, không phải ảnh nghề' },
  { id: '7720b6b1-ae8d-5fa1-8cee-2583bd79a8d9', lang: 'Quất Động', ten: 'Thêu khăn tay 1 · Xưởng 5', reason: 'chữ "YES" trên vải, không phải ảnh nghề' },
  { id: '096fc4d8-1eed-5d09-8c6f-a93037bb5225', lang: 'Vạn Phúc', ten: 'Tìm hiểu nghề dệt lụa 1 · Xưởng 7', reason: 'ảnh người mẫu, không thấy nghề dệt' },
])
const FACE_REASON = 'có người rõ mặt, không có giấy đồng ý (image_sources_consent_chk; quyết định 2026-11-20)'

/** Splits entries into the ones to import and the ones left out (with the reason, for the report). */
export function filterEntries(entries) {
  const kept = [], excluded = []
  for (const item of entries) {
    const rule = EXCLUDED_ENTRIES.find(rejected => rejected.id === item.id)
    if (rule) {
      if (item.ten !== rule.ten || item.lang !== rule.lang) throw new Error(`Excluded image ${item.id} no longer matches "${rule.lang} – ${rule.ten}"`)
      excluded.push({ entry: item, reason: rule.reason })
    } else if (item.co_nguoi_ro_mat === 'co') excluded.push({ entry: item, reason: FACE_REASON })
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
export function toRecords(item, { fileId, mediaId, processed }) {
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
    : { kind: 'experience', profile_media_id: mediaId, file_id: fileId, experience_id: item.id, category: 'Activity', display_order: 0 }
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

/**
 * DEV by default: both DATABASE_URL and SUPABASE_URL must name the DEV project. With --target-prod (human request 2026-11-21)
 * both must name PROD and CONFIRM_PROJECT_REF must equal that ref. Same rules as storage:catalog-copies.
 */
export const assertImportTarget = (env, { targetProd = false } = {}) => assertTargets(env, { targetProd })
