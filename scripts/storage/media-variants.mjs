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

/**
 * Turn by EXIF, resize to each width (never enlarged), WebP ~72; sharp writes no metadata unless asked.
 * @param {Uint8Array} input
 * @returns {Promise<Array<{width:number,bytes:Buffer,outputWidth:number,outputHeight:number}>>}
 */
export async function makeVariants(input) {
  const variants = []
  for (const width of VARIANT_WIDTHS) {
    const { data, info } = await sharp(input).rotate().resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY }).toBuffer({ resolveWithObject: true })
    variants.push({ width, bytes: data, outputWidth: info.width, outputHeight: info.height })
  }
  return variants
}
