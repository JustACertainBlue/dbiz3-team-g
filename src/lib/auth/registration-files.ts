import { writeObject,removeObject } from '../storage/object-store'
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
  const saved:Array<Record<string,string>&{storage_key:string}>=[]
  try {
    for(const file of buffers){
      const id=randomUUID(),storage_key=`registration-documents/${id}`
      await writeObject(storage_key,file.bytes,file.type)
      saved.push({file_id:id,storage_key,file_name:file.name,media_type:file.type,file_size_bytes:String(file.bytes.length),width_px:'',height_px:'',uploaded_by:'',created_at:new Date().toISOString()})
    }
    return saved
  }catch(error){for(const file of saved)await removeObject(file.storage_key);throw error}
}

export async function discardRegistrationFiles(files:ReadonlyArray<{storage_key:string}>){for(const file of files)await removeObject(file.storage_key)}
