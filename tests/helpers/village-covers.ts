// Since UI v3 integration (21/11) an experience with no image of its own or of its village is not listed. Test fixtures that predate
// that rule get a village cover here, so they keep testing what they test. Fixture change only, no assertion changed.
import type { ExploreSeed } from '@/lib/explore/catalog'

export const COVER_FILE = { file_id: 'test-cover', storage_key: 'prf-media/test-cover', media_type: 'image/webp', file_size_bytes: '1000', width_px: '1600', height_px: '900' }

export function withVillageCovers<T extends ExploreSeed>(seed: T): T {
  return { ...seed, villages: seed.villages.map(village => ({ ...village, cover_image_id: village.cover_image_id || COVER_FILE.file_id })), stored_files: [...seed.stored_files, COVER_FILE] }
}

/** Same for the JSON demo repository (call after reset()). update() changes one row, so every village is updated by id. */
export function addVillageCovers(repo: { all(table: string): Array<Record<string, string>>; insert(table: string, row: Record<string, string>): unknown; update(table: string, predicate: (row: any) => boolean, changes: Record<string, string>): unknown }) {
  repo.insert('stored_files', { ...COVER_FILE })
  for (const village of repo.all('villages')) repo.update('villages', (row: any) => row.village_id === village.village_id, { cover_image_id: COVER_FILE.file_id })
}
