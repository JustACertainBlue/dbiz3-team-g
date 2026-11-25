// Image chain of a public image slot: own image, then the fallback (village cover), then nothing.
// `failed` holds the urls the browser could not load.
import type { ImageRef } from '@/lib/prf/media-urls'

export function pickImage(candidates: Array<ImageRef | null | undefined>, failed: readonly string[]): ImageRef | null {
  return candidates.find((image): image is ImageRef => Boolean(image) && !failed.includes(image!.url)) ?? null
}
