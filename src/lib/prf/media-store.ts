import { writeObject,readObject,readObjectStream,removeObject } from '../storage/object-store'
import { imageSize } from 'image-size'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import { readFileSync, existsSync } from 'node:fs'
import { demoRepository } from '../db/application-store'
import type { SessionContext } from '../auth/session'
import { imageMetadataError } from './experience-images'
import { decideMediaAccess, loadMediaFacts, mediaVersion, type MediaFacts } from './media-access'
import { makeVariants, variantKey } from '../../../scripts/storage/media-variants.mjs'
export class MediaError extends Error { constructor(message: string, public status = 400) { super(message) } }
export { mediaUrl } from './media-urls'

const SEED_FILE_DEMO_SLUGS: Record<string, string> = {
  '0b0a4ca0-7493-54d2-aa86-36da0eae7ca5': 'silk',
  '113f70fa-5880-5863-b3d3-b00a8e91aae9': 'silk',
  '126d0c59-f2c0-580b-a51b-82864e688b1e': 'ceramics',
  '1af3d7f0-8f8f-5a23-84cf-c7a284fd7564': 'bamboo',
  '29a18608-e870-5768-9b6a-0725f7c6127d': 'bamboo',
  '35fa9e03-059f-5a13-9152-0203b77a5a72': 'silk',
  '4456e72c-d953-5e1c-94f2-fd459d99f8a6': 'water-puppets',
  '471f1147-acf0-5655-87e9-f9c0374e00ae': 'wood-carving',
  '4c273c05-3f81-5c7d-a87b-e0ab4a8e9f14': 'water-puppets',
  '4eb65fc8-0dab-5609-9314-73822311aa47': 'lacquer',
  '54663e12-2712-5736-85e1-30f9f7d63895': 'embroidery',
  '5490f8fa-4b8e-5b64-bc55-2315b949a8d4': 'lacquer',
  '64a9e816-11b6-552b-b704-b2fc62b52ce2': 'silk',
  '65f429db-01a7-58e9-8bb6-c80cd8d48e87': 'water-puppets',
  '6698a1ac-581c-5b1b-9995-79b8c940618c': 'ceramics',
  '6a517c7a-81ab-5aa8-816a-c3006afdb315': 'wood-carving',
  '6c6215e7-76cb-50c0-b7ff-7f4c8a7bbe67': 'lacquer',
  '6f899cb2-eead-50bc-9dd9-aa96fc36b82b': 'ceramics',
  '791f2241-2f3b-5cd4-84fd-8151d7224f52': 'conical-hats',
  '8a2ef71b-19ff-5862-8e30-1d3402374549': 'bamboo',
  '8b2f8019-e755-5921-aef6-0b1040801e1f': 'wood-carving',
  '8ed11bbf-aa44-5c3f-a9c1-c158b5e527d3': 'conical-hats',
  '9140849e-4aab-5a34-8e12-9325ad37732e': 'bamboo',
  '9ce69642-b06c-52c8-ac6f-53dfa10251e7': 'wood-carving',
  'a12bfc5a-6ba5-580d-955e-ecfcb4edee10': 'lacquer',
  'aaf34139-85fc-58a5-a5e3-2ca9f219da2d': 'embroidery',
  'bb673534-f702-5187-b1d8-c403ca5bf466': 'conical-hats',
  'bdfab530-2097-5dbd-ad6d-13fca233286c': 'ceramics',
  'c76fc431-9295-5767-8a61-3fcf6ffe6dd0': 'embroidery',
  'cafd3b09-6d8d-5b20-8c53-35555c602123': 'water-puppets',
  'e65402fd-c96c-5a57-89cf-027ad74e9662': 'embroidery',
  'e8fc5e73-04d7-50b9-a779-ab369a32356b': 'conical-hats',
}

function getDemoMediaFallback(file: MediaFacts['file']) {
  const slug = SEED_FILE_DEMO_SLUGS[file.file_id] || (file.storage_key.includes('bat-trang') || file.storage_key.includes('battrang') ? 'ceramics' : null) || 'ceramics'
  const filePath = join(process.cwd(), 'assets', 'demo-media', `${slug}.jpg`)
  if (existsSync(filePath)) {
    const bytes = readFileSync(filePath)
    return {
      body: new Blob([new Uint8Array(bytes)]).stream() as ReadableStream<Uint8Array>,
      contentType: 'image/jpeg',
      variant: 'orig' as const,
      size: bytes.length,
    }
  }
  return null
}

export async function uploadProfileMedia(session: SessionContext, providerId: string, file: File, certificate = false) {
  if (!session.authenticated || session.role !== 'Local_Provider' || session.providerId !== providerId) throw new MediaError('Chỉ chủ xưởng được tải file.',403)
  if (!file.size || file.size > 10 * 1024 * 1024) throw new MediaError('Chọn file không rỗng, tối đa 10 MB.')
  const bytes = Buffer.from(await file.arrayBuffer())
  let media_type = '', width = 0, height = 0
  if (certificate && bytes.subarray(0,5).toString() === '%PDF-') media_type = 'application/pdf'
  else {
    try { const dimensions = imageSize(bytes); media_type = dimensions.type === 'jpg' ? 'image/jpeg' : dimensions.type === 'png' ? 'image/png' : dimensions.type === 'webp' ? 'image/webp' : ''; width = dimensions.width; height = dimensions.height } catch { throw new MediaError('File ảnh không hợp lệ.') }
    if (!['image/jpeg','image/png','image/webp'].includes(media_type) || (certificate && media_type === 'image/webp')) throw new MediaError('Định dạng file không được hỗ trợ.')
    if (!certificate) { const error = imageMetadataError({media_type,file_size_bytes:bytes.length,width_px:width,height_px:height}); if (error) throw new MediaError(error) }
  }
  const id = randomUUID()
  await writeObject(`prf-media/${id}`,bytes,media_type)
  try {
  ;(await demoRepository().insert('stored_files',{file_id:id,storage_key:`prf-media/${id}`,file_name:file.name,media_type,file_size_bytes:String(bytes.length),width_px:width ? String(width) : '',height_px:height ? String(height) : '',uploaded_by:session.userId!,created_at:new Date().toISOString()}))
  } catch(error){await removeObject(`prf-media/${id}`);throw error}
  if (!certificate) await storeVariants(id,bytes)
  return {file_id:id,url:`/api/prf/media/${id}`,file_name:file.name,media_type,file_size_bytes:bytes.length,width_px:width,height_px:height}
}
/** WebP display variants (400/800/1600) next to a showcase image; never for documents. Best effort: the media route
 * serves the original while a variant is missing, and scripts/storage/backfill-media-variants.mjs can make it later. */
async function storeVariants(id:string,bytes:Buffer) {
  const written:string[]=[]
  try {
    for (const variant of await makeVariants(bytes)) { const key=variantKey(id,variant.width); await writeObject(key,variant.bytes,'image/webp'); written.push(key) }
  } catch {
    console.error('Media variants could not be stored; the original is served until backfill.')
    for (const key of written) await removeObject(key).catch(()=>{})
  }
}

/** Facts + decision for one file (one keyed query on PostgreSQL); throws MediaError 404/403 as before. */
export async function authorizeProfileMedia(session: SessionContext, id: string): Promise<{file:MediaFacts['file'],public:boolean,version:string}> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new MediaError('Không tìm thấy file.',404)
  const facts=await loadMediaFacts(id)
  if (!facts) throw new MediaError('File gốc chưa được tải lên.',404)
  const decision=decideMediaAccess(session,facts)
  if(!decision.allowed)throw new MediaError('Không có quyền xem tài liệu.',403)
  return {file:facts.file,public:decision.public,version:mediaVersion(facts.file)}
}

export async function readProfileMedia(session: SessionContext, id: string) {
  const {file}=await authorizeProfileMedia(session,id)
  try {
    if (!file.storage_key.startsWith('seed/')) {
      const bytes=await readObject(file.storage_key)
      if(bytes) return {file,bytes}
    }
  } catch {
    // storage error or missing
  }
  const fallback = getDemoMediaFallback(file)
  if (fallback) {
    const slug = SEED_FILE_DEMO_SLUGS[file.file_id] || 'ceramics'
    const bytes = readFileSync(join(process.cwd(), 'assets', 'demo-media', `${slug}.jpg`))
    return { file, bytes }
  }
  throw new MediaError('File gốc không còn trên kho lưu trữ.',404)
}

/** The object to send: the WebP variant of `width` when it exists, else the original; streamed, not buffered. */
export async function openProfileMediaObject(file: MediaFacts['file'], width: number|null) {
  if (width && file.media_type.startsWith('image/')) {
    try {
      const variant=await readObjectStream(variantKey(file.file_id,width))
      if (variant) return {...variant,contentType:'image/webp',variant:`w${width}`}
    } catch {
      // storage unavailable or variant key missing
    }
  }
  try {
    if (!file.storage_key.startsWith('seed/')) {
      const original=await readObjectStream(file.storage_key)
      if(original) return {...original,contentType:file.media_type,variant:'orig'}
    }
  } catch {
    // storage error or missing
  }
  const fallback = getDemoMediaFallback(file)
  if (fallback) return fallback
  throw new MediaError('File gốc không còn trên kho lưu trữ.',404)
}
