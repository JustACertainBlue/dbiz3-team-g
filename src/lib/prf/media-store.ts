import { imageSize } from 'image-size'
import { randomUUID } from 'node:crypto'
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { demoRepository } from '../demo/json-repository'
import type { SessionContext } from '../auth/session'
import { imageMetadataError } from './experience-images'
export class MediaError extends Error { constructor(message: string, public status = 400) { super(message) } }
export { mediaUrl } from './media-urls'
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
  const id = randomUUID(), directory = join(process.cwd(), '.demo-data', 'prf-media')
  mkdirSync(directory,{recursive:true}); writeFileSync(join(directory,id),bytes,{mode:0o600})
  demoRepository().insert('stored_files',{file_id:id,storage_key:`prf-media/${id}`,file_name:file.name,media_type,file_size_bytes:String(bytes.length),width_px:width ? String(width) : '',height_px:height ? String(height) : '',uploaded_by:session.userId!,created_at:new Date().toISOString()})
  return {file_id:id,url:`/api/prf/media/${id}`,file_name:file.name,media_type,file_size_bytes:bytes.length,width_px:width,height_px:height}
}
export function readProfileMedia(session: SessionContext, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new MediaError('Không tìm thấy file.',404)
  const repo=demoRepository(), file=repo.find('stored_files',row=>row.file_id===id)
  if (!file || file.storage_key !== `prf-media/${id}`) throw new MediaError('File gốc chưa được tải lên.',404)
  let allowed=session.authenticated && file.uploaded_by===session.userId
  const canManage=(providerId:string)=>{
    const provider=repo.find('provider_profiles',row=>row.provider_id===providerId)
    return Boolean(provider && session.authenticated && (session.providerId===providerId || (session.role==='ADMIN' && (session.adminType==='HDT' || session.adminType==='UBND' && session.assignedVillageId===provider.village_id))))
  }
  const isPublicProvider=(provider:ReturnType<typeof repo.find>)=>Boolean(provider && provider.verification_status==='Verified' && provider.published_version_no && repo.find('provider_profile_versions',row=>row.provider_id===provider.provider_id && row.version_no===provider.published_version_no && row.version_status==='Verified') && repo.find('user_accounts',row=>row.user_id===provider.user_id && row.account_status==='Active') && repo.find('villages',row=>row.village_id===provider.village_id && row.is_active==='true'))
  for (const version of repo.all('provider_version_documents').filter(row=>row.file_id===id)) if(canManage(version.provider_id))allowed=true
  for(const media of repo.all('provider_version_media').filter(row=>row.file_id===id)) {
    const provider=repo.find('provider_profiles',row=>row.provider_id===media.provider_id)
    if(canManage(media.provider_id) || isPublicProvider(provider) && provider!.published_version_no===media.version_no)allowed=true
  }
  for(const media of repo.all('profile_media').filter(row=>row.file_id===id && row.experience_id)) {
    const exp=repo.find('experiences',row=>row.experience_id===media.experience_id)
    const provider=exp && repo.find('provider_profiles',row=>row.provider_id===exp.provider_id)
    if(exp && (canManage(exp.provider_id) || !exp.archived_at && isPublicProvider(provider)))allowed=true
  }
  if(!allowed)throw new MediaError('Không có quyền xem tài liệu.',403)
  try{return {file,bytes:readFileSync(join(process.cwd(),'.demo-data','prf-media',id))}}catch{throw new MediaError('File gốc không còn trên máy chủ.',404)}
}
