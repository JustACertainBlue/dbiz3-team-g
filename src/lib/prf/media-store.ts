import { writeObject, readObject, readObjectStream, removeObject } from '../storage/object-store'
import { imageSize } from 'image-size'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { readFileSync, existsSync } from 'node:fs'
import { demoRepository } from '../db/application-store'
import { demoSlugForSeedFile } from './seed-media'
import type { SessionContext } from '../auth/session'
import { imageMetadataError } from './experience-images'
import { decideMediaAccess, loadMediaFacts, mediaVersion, type MediaFacts } from './media-access'
import { makeVariants, variantKey } from '../../../scripts/storage/media-variants.mjs'
export class MediaError extends Error { constructor(message: string, public status = 400) { super(message) } }
export { mediaUrl } from './media-urls'

/** Demo picture (assets/demo-media/<slug>.webp, else .jpg) of a seed placeholder file; null when the file has none.
 * Seed keys have no object in storage, so this is the only source for them; a real upload never uses it. */
function demoMedia(file: MediaFacts['file']) {
  const slug = demoSlugForSeedFile(file)
  if (!slug) return null
  const dir = join(process.cwd(), 'assets', 'demo-media')
  const path = [`${slug}.webp`, `${slug}.jpg`].map(name => join(dir, name)).find(candidate => existsSync(candidate))
  if (!path) return null
  const bytes = readFileSync(path)
  return { bytes, contentType: path.endsWith('.webp') ? 'image/webp' : 'image/jpeg' }
}

export async function uploadProfileMedia(session: SessionContext, providerId: string, file: File, certificate = false) {
  if (!session.authenticated || session.role !== 'Local_Provider' || session.providerId !== providerId) throw new MediaError('Chỉ chủ xưởng được tải file.', 403)
  if (!file.size || file.size > 10 * 1024 * 1024) throw new MediaError('Chọn file không rỗng, tối đa 10 MB.')
  const bytes = Buffer.from(await file.arrayBuffer())
  let media_type = '', width = 0, height = 0
  if (certificate && bytes.subarray(0, 5).toString() === '%PDF-') media_type = 'application/pdf'
  else {
    try { const dimensions = imageSize(bytes); media_type = dimensions.type === 'jpg' ? 'image/jpeg' : dimensions.type === 'png' ? 'image/png' : dimensions.type === 'webp' ? 'image/webp' : ''; width = dimensions.width; height = dimensions.height } catch { throw new MediaError('File ảnh không hợp lệ.') }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(media_type) || (certificate && media_type === 'image/webp')) throw new MediaError('Định dạng file không được hỗ trợ.')
    if (!certificate) { const error = imageMetadataError({ media_type, file_size_bytes: bytes.length, width_px: width, height_px: height }); if (error) throw new MediaError(error) }
  }
  const id = randomUUID()
  await writeObject(`prf-media/${id}`, bytes, media_type)
  try {
    ; (await demoRepository().insert('stored_files', { file_id: id, storage_key: `prf-media/${id}`, file_name: file.name, media_type, file_size_bytes: String(bytes.length), width_px: width ? String(width) : '', height_px: height ? String(height) : '', uploaded_by: session.userId!, created_at: new Date().toISOString() }))
  } catch (error) { await removeObject(`prf-media/${id}`); throw error }
  if (!certificate) await storeVariants(id, bytes)
  return { file_id: id, url: `/api/prf/media/${id}`, file_name: file.name, media_type, file_size_bytes: bytes.length, width_px: width, height_px: height }
}

/** WebP display variants (400/800/1600) next to a showcase image; never for documents. Best effort: the media route
 * serves the original while a variant is missing, and scripts/storage/backfill-media-variants.mjs can make it later. */
async function storeVariants(id: string, bytes: Buffer) {
  const written: string[] = []
  try {
    for (const variant of await makeVariants(bytes)) { const key = variantKey(id, variant.width); await writeObject(key, variant.bytes, 'image/webp'); written.push(key) }
  } catch {
    console.error('Media variants could not be stored; the original is served until backfill.')
    for (const key of written) await removeObject(key).catch(() => { })
  }
}

/** Facts + decision for one file (one keyed query on PostgreSQL); throws MediaError 404/403 as before. */
export async function authorizeProfileMedia(session: SessionContext, id: string): Promise<{ file: MediaFacts['file'], public: boolean, version: string }> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new MediaError('Không tìm thấy file.', 404)
  const facts = await loadMediaFacts(id)
  if (!facts) throw new MediaError('File gốc chưa được tải lên.', 404)
  const decision = decideMediaAccess(session, facts)
  if (!decision.allowed) throw new MediaError('Không có quyền xem tài liệu.', 403)
  return { file: facts.file, public: decision.public, version: mediaVersion(facts.file) }
}

export async function readProfileMedia(session: SessionContext, id: string) {
  const { file } = await authorizeProfileMedia(session, id)
  if (file.storage_key.startsWith('seed/')) {
    const demo = demoMedia(file)
    if (!demo) throw new MediaError('File gốc không còn trên kho lưu trữ.', 404)
    return { file, bytes: demo.bytes }
  }
  const bytes = await readObject(file.storage_key)
  if (!bytes) throw new MediaError('File gốc không còn trên kho lưu trữ.', 404)
  return { file, bytes }
}

/** The object to send: the WebP variant of `width` when it exists, else the original; streamed, not buffered.
 * A seed placeholder file is served from assets/demo-media/ (no storage read); a storage error is raised, not hidden. */
export async function openProfileMediaObject(file: MediaFacts['file'], width: number | null) {
  if (file.storage_key.startsWith('seed/')) {
    const demo = demoMedia(file)
    if (!demo) throw new MediaError('File gốc không còn trên kho lưu trữ.', 404)
    return { body: new Blob([new Uint8Array(demo.bytes)]).stream() as ReadableStream<Uint8Array>, size: demo.bytes.length, contentType: demo.contentType, variant: 'orig' as const }
  }
  if (width && file.media_type.startsWith('image/')) {
    const variant = await readObjectStream(variantKey(file.file_id, width))
    if (variant) return { ...variant, contentType: 'image/webp', variant: `w${width}` }
  }
  const original = await readObjectStream(file.storage_key)
  if (!original) throw new MediaError('File gốc không còn trên kho lưu trữ.', 404)
  return { ...original, contentType: file.media_type, variant: 'orig' }
}
