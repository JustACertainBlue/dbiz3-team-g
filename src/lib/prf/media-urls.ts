// Client-safe media URL helpers (no server imports): the UI builds src/srcset from the URLs made here.
const PRF_PREFIX = 'prf-media/'
const ROUTE = '/api/prf/media/'

/** Widths of the WebP variants made by step 2A (scripts/storage/media-variants.mjs); ?w= takes exactly these. */
export const MEDIA_VARIANT_WIDTHS = [400, 800, 1600] as const
/** The width used for `src` (the fallback of `srcset`). */
export const DEFAULT_VARIANT_WIDTH = 800

/** Version of a stored file for ?v=: its stored size (the media route compares it with the current one). */
export const mediaVersion = (file: { file_size_bytes: string | number }) => String(file.file_size_bytes)

/** URL of a stored file; `version` (the stored size) becomes ?v= so the browser can cache the image for a year. */
export const mediaUrl = (key: string, version?: string | number | null) => {
  if (!key.startsWith(PRF_PREFIX)) return key
  const url = `${ROUTE}${key.slice(PRF_PREFIX.length)}`
  return version === undefined || version === null || version === '' ? url : `${url}?v=${version}`
}

type StoredFileFacts = { storage_key: string; file_id?: string; file_size_bytes?: string | number; width_px?: string | number; height_px?: string | number }

/** URL of a stored_files row, with ?v= when its size is known. */
export const mediaFileUrl = (file: StoredFileFacts) => mediaUrl(file.storage_key, file.file_size_bytes)

/** What the UI needs to draw an image well: the URL (with ?v=) and the stored size (0 when unknown). */
export interface ImageRef { url: string; width: number; height: number }

const dimension = (value: string | number | undefined) => { const number = Number(value); return Number.isFinite(number) && number > 0 ? Math.round(number) : 0 }

const SEED_STORAGE_KEY = /^seed\/\d{4}\/\d{2}\/[0-9a-f-]{36}\.[a-z0-9]+$/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Servable image of a stored_files row, or null (seed placeholder keys without an image are not images). */
export function imageRef(file: StoredFileFacts): ImageRef | null {
  let url: string
  if (file.storage_key.startsWith(PRF_PREFIX)) url = mediaUrl(file.file_id ? `${PRF_PREFIX}${file.file_id}` : file.storage_key, file.file_size_bytes)
  else if (file.file_id && UUID.test(file.file_id) && (SEED_STORAGE_KEY.test(file.storage_key) || file.storage_key.startsWith('seed/'))) {
    url = mediaUrl(`${PRF_PREFIX}${file.file_id}`, file.file_size_bytes)
  }
  else if (/^https?:\/\//.test(file.storage_key)) url = file.storage_key
  else return null
  return { url, width: dimension(file.width_px), height: dimension(file.height_px) }
}

/** Same image, deduplicated by URL, first occurrence wins. */
export const uniqueImages = (images: ImageRef[]) => { const seen = new Set<string>(); return images.filter(image => !seen.has(image.url) && !!seen.add(image.url)) }

const isMedia = (url: string) => url.startsWith(ROUTE)

/** `/api/prf/media/<id>?v=<v>` → `/api/prf/media/<id>?w=<width>&v=<v>` (w before v); other URLs unchanged. */
export function variantSrc(url: string, width: number) {
  if (!isMedia(url)) return url
  const [path, query = ''] = url.split('?')
  const version = new URLSearchParams(query).get('v')
  return `${path}?w=${width}${version ? `&v=${version}` : ''}`
}

/** srcset with the 400w, 800w and 1600w variants; null for URLs the media route does not serve. */
export const variantSrcSet = (url: string) => isMedia(url) ? MEDIA_VARIANT_WIDTHS.map(width => `${variantSrc(url, width)} ${width}w`).join(', ') : null

/** Landscape images (width > height) first, everything else after them; both groups keep their order. */
export const landscapeFirst = <T extends { width: number; height: number }>(images: T[]): T[] => [...images.filter(isLandscape), ...images.filter(image => !isLandscape(image))]

export const isPortrait = (image: { width: number; height: number }) => image.width > 0 && image.height > 0 && image.height > image.width
export const isLandscape = (image: { width: number; height: number }) => image.width > 0 && image.height > 0 && image.width > image.height
