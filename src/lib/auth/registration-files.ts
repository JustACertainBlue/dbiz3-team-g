import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { RegistrationError } from './registration-service'
export async function saveRegistrationFiles(files: File[]) {
  if (!files.length || files.length > 5 || files.some(file => !file.size || file.size > 10 * 1024 * 1024)) throw new RegistrationError('Upload 1–5 documents, up to 10 MB each.')
  const buffers = await Promise.all(files.map(async file => {
    const bytes = Buffer.from(await file.arrayBuffer())
    const pdf = bytes.subarray(0, 5).toString() === '%PDF-'
    const png = bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
    const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    if (!(pdf || png || jpeg)) throw new RegistrationError('Documents must be PDF, JPEG or PNG.')
    return { bytes, name: file.name, type: pdf ? 'application/pdf' : png ? 'image/png' : 'image/jpeg' }
  }))
  const directory = join(process.cwd(), '.demo-data', 'registration-documents')
  mkdirSync(directory, { recursive: true })
  return buffers.map(file => {
    const id = randomUUID()
    writeFileSync(join(directory, id), file.bytes, { mode: 0o600 })
    return { file_id: id, storage_key: `registration-documents/${id}`, file_name: file.name, media_type: file.type, file_size_bytes: String(file.bytes.length), width_px: '', height_px: '', uploaded_by: '', created_at: new Date().toISOString() }
  })
}
