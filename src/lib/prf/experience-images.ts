// Experience image rules shared by the API and the EXP069/EXP070 screens (slice B).
// BR-008 + consistency-contract §Images: JPG/JPEG/PNG/WEBP, ≤ 10 MB, ≥ 1280×720.
// Categories are the data/ values (data/schema.sql profile_media_exp_category_chk; decision Q4 2026-11-04).

export const EXPERIENCE_IMAGE_CATEGORIES = [
  { value: 'Activity', label: 'Activity/Experience' },
  { value: 'Space', label: 'Space/Location' },
  { value: 'Product', label: 'Product/Result' },
] as const

export type ExperienceImageCategory = typeof EXPERIENCE_IMAGE_CATEGORIES[number]['value']

export const IMAGE_MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024
export const MIN_IMAGE_WIDTH = 1280
export const MIN_IMAGE_HEIGHT = 720

export interface ImageMetadata {
  media_type: string
  file_size_bytes: number
  width_px: number
  height_px: number
}

/** BR-008: null when the image is acceptable, otherwise the reason. */
export function imageMetadataError(meta: ImageMetadata): string | null {
  if (!(IMAGE_MEDIA_TYPES as readonly string[]).includes(meta.media_type)) {
    return 'Invalid image format: use JPG/JPEG/PNG/WEBP (BR-008)'
  }
  if (!Number.isInteger(meta.file_size_bytes) || meta.file_size_bytes <= 0) return 'Image file is empty (BR-008)'
  if (meta.file_size_bytes > MAX_IMAGE_BYTES) return 'Image is larger than 10 MB (BR-008)'
  if (!Number.isInteger(meta.width_px) || meta.width_px < MIN_IMAGE_WIDTH) return `Image must be at least ${MIN_IMAGE_WIDTH} px wide (BR-008)`
  if (!Number.isInteger(meta.height_px) || meta.height_px < MIN_IMAGE_HEIGHT) return `Image must be at least ${MIN_IMAGE_HEIGHT} px high (BR-008)`
  return null
}

/** Categories that have no image in the list (BR-009). */
export function missingCategories(images: Array<{ category: string }>): ExperienceImageCategory[] {
  return EXPERIENCE_IMAGE_CATEGORIES.map(c => c.value).filter(value => !images.some(image => image.category === value))
}

/** BR-015: an image may be removed only if its category keeps another image. */
export function canRemoveImage(images: Array<{ category: string }>, index: number): boolean {
  const category = images[index]?.category
  return images.filter(image => image.category === category).length > 1
}
