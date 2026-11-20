// WebP display variants of a showcase image (step 2A image delivery, human request 2026-11-20). Shared by the upload path
// (src/lib/prf/media-store.ts), scripts/storage/import-seed-images.mjs and scripts/storage/backfill-media-variants.mjs.
// Variant n of file <id> is stored next to the original as prf-media/<id>.w<n>.webp; it is never made for documents.
import sharp from 'sharp'

export const VARIANT_WIDTHS = Object.freeze([400, 800, 1600])
export const DEFAULT_VARIANT_WIDTH = 800
export const WEBP_QUALITY = 72
const FILE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VARIANT_KEY = /^prf-media\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.w(400|800|1600)\.webp$/i

/** @param {string} fileId @param {number} width */
export function variantKey(fileId, width) {
  if (!FILE_ID.test(fileId) || !VARIANT_WIDTHS.includes(width)) throw new Error('Invalid media variant')
  return `prf-media/${fileId}.w${width}.webp`
}

/** @param {string} key */
export const isVariantKey = key => VARIANT_KEY.test(key)

/**
 * The ?w= query value: exactly 400, 800 or 1600; any other value means 800; no value (null/undefined) means the original.
 * @param {string|null|undefined} value @returns {number|null}
 */
export function parseVariantWidth(value) {
  if (value === null || value === undefined) return null
  const width = /^\d+$/.test(value) ? Number(value) : NaN
  return VARIANT_WIDTHS.includes(width) ? width : DEFAULT_VARIANT_WIDTH
}

/** Size cap per width in bytes (human request 2026-11-20): 400 ≤ 50 KB, 800 ≤ 120 KB, 1600 ≤ 250 KB. */
export const VARIANT_CAPS = Object.freeze({ 400: 50 * 1024, 800: 120 * 1024, 1600: 250 * 1024 })
/** Qualities tried in order until a variant fits its cap; the last result is kept (flagged) if none fits. */
export const QUALITY_STEPS = Object.freeze([WEBP_QUALITY, 62, 52, 45])

/**
 * Widths whose stored size is over the cap; a missing size (null) is not oversize.
 * @param {Record<number, number|null|undefined>} sizes @returns {number[]}
 */
export const oversizeWidths = sizes => VARIANT_WIDTHS.filter(width => typeof sizes[width] === 'number' && /** @type {number} */ (sizes[width]) > /** @type {any} */ (VARIANT_CAPS)[width])

/**
 * Turn by EXIF, resize to each width (never enlarged), WebP from quality 72 down the steps until under the cap;
 * sharp writes no metadata unless asked.
 * @param {Uint8Array} input
 * @param {{caps?: Record<number, number>}} [options]
 * @returns {Promise<Array<{width:number,bytes:Buffer,outputWidth:number,outputHeight:number,quality:number,overCap:boolean}>>}
 */
export async function makeVariants(input, { caps = VARIANT_CAPS } = {}) {
  const variants = []
  for (const width of VARIANT_WIDTHS) {
    const resized = await sharp(input).rotate().resize({ width, withoutEnlargement: true }).raw().toBuffer({ resolveWithObject: true })
    const raw = sharp(resized.data, { raw: { width: resized.info.width, height: resized.info.height, channels: resized.info.channels } })
    /** @type {any} */ let result
    for (const quality of QUALITY_STEPS) {
      const { data, info } = await raw.clone().webp({ quality }).toBuffer({ resolveWithObject: true })
      result = { width, bytes: data, outputWidth: info.width, outputHeight: info.height, quality, overCap: data.length > caps[width] }
      if (!result.overCap) break
    }
    variants.push(result)
  }
  return variants
}
