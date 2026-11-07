import { beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { toSessionContext } from '@/lib/auth/session'
import { uploadProfileMedia, readProfileMedia } from '@/lib/prf/media-store'
import { createExperience } from '@/lib/prf/experience-service'
import { deflateSync } from 'node:zlib'
import { getExperienceDetail } from '@/lib/explore/details'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { providerSession, guestSession, ubndSession, SEED_IDS } from '../helpers/mockSession'

// Isolate uploaded bytes from the developer's running demo; seed reads still use real files.
const blobs=vi.hoisted(()=>new Map<string,Buffer>())
vi.mock('node:fs',async importOriginal=>{
  const fs=await importOriginal<typeof import('node:fs')>()
  const isMedia=(path:unknown)=>String(path).includes('prf-media')
  return {...fs,
    mkdirSync:vi.fn((path,...args)=>isMedia(path)?undefined:fs.mkdirSync(path,...args)),
    writeFileSync:vi.fn((path,bytes,...args)=>isMedia(path)?void blobs.set(String(path),Buffer.from(bytes as Uint8Array)):fs.writeFileSync(path,bytes,...args)),
    readFileSync:vi.fn((path,...args)=>isMedia(path)?blobs.get(String(path))??(()=>{throw new Error('Missing test media')})():fs.readFileSync(path,...args)),
  }
})
const repo=demoRepository(), owner=(await toSessionContext(providerSession()))
beforeEach(()=>{repo.reset();blobs.clear()})

function pdf(){return new File(['%PDF-1.4\nSynthetic certificate fixture'],'fixture.pdf',{type:'application/pdf'})}
function png() {
  const chunk=(type:string,data:Buffer)=>{
    const content=Buffer.concat([Buffer.from(type),data]);let crc=0xffffffff
    for(const byte of content){crc^=byte;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}
    const size=Buffer.alloc(4),checksum=Buffer.alloc(4);size.writeUInt32BE(data.length);checksum.writeUInt32BE((crc^0xffffffff)>>>0)
    return Buffer.concat([size,content,checksum])
  }
  const header=Buffer.alloc(13);header.writeUInt32BE(1280);header.writeUInt32BE(720,4);header[8]=8;header[9]=6
  return new File([Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(Buffer.alloc((1280*4+1)*720))),chunk('IEND',Buffer.alloc(0))])],'synthetic.png',{type:'image/png'})
}
describe('Private Provider media storage and access',()=>{
  it('persists real image bytes, links them to an Experience and serves the same gallery to Explore',async()=>{
    const file=png(),uploaded=await uploadProfileMedia(owner,owner.providerId!,file)
    expect(uploaded).toMatchObject({width_px:1280,height_px:720,media_type:'image/png'})
    const {experience_id}=await createExperience(owner,{name:'Synthetic gallery experience',description:'Synthetic description',category:'Pottery',duration_minutes:60,price_per_person:100000,max_participants:10,notice_period_hours:24,images:(['Activity','Space','Product'] as const).map(category=>({...uploaded,category}))})
    const detail=getExperienceDetail((await loadExploreRuntime()),experience_id,{kind:'guest'})
    expect(detail?.gallery).toEqual([uploaded.url,uploaded.url,uploaded.url])
    expect((await readProfileMedia((await toSessionContext(guestSession())),uploaded.file_id)).bytes).toEqual(Buffer.from(await file.arrayBuffer()))
    for(const link of repo.all('profile_media').filter(row=>row.experience_id===experience_id)) {
      expect(link.provider_id).toBe('')
      expect(link.experience_id).toBe(experience_id)
    }
  })
  it('round-trips uploaded certificate bytes for the owner and denies Guest/unrelated users',async()=>{
    const file=pdf()
    const result=await uploadProfileMedia(owner,owner.providerId!,file,true)
    expect((await readProfileMedia(owner,result.file_id)).bytes).toEqual(Buffer.from(await file.arrayBuffer()))
    ;(await expect(async ()=>(await readProfileMedia((await toSessionContext(guestSession())),result.file_id))).rejects.toThrow('Không có quyền'))
    ;(await expect(async ()=>(await readProfileMedia((await toSessionContext(ubndSession())),result.file_id))).rejects.toThrow('Không có quyền'))
    repo.insert('provider_version_documents',{provider_id:owner.providerId!,version_no:'1',file_id:result.file_id,document_type:'Business Registration Certificate'})
    expect((await readProfileMedia((await toSessionContext(ubndSession())),result.file_id)).file.file_id).toBe(result.file_id)
    ;(await expect(async ()=>(await readProfileMedia((await toSessionContext(ubndSession(SEED_IDS.village2))),result.file_id))).rejects.toThrow('Không có quyền'))
    ;(await expect(async ()=>(await readProfileMedia((await toSessionContext(guestSession())),result.file_id))).rejects.toThrow('Không có quyền'))
  })
  it('rejects non-owner uploads, empty files, disguised SVG and undersized images',async()=>{
    await expect(uploadProfileMedia((await toSessionContext(guestSession())),owner.providerId!,pdf(),true)).rejects.toMatchObject({status:403})
    await expect(uploadProfileMedia(owner,SEED_IDS.providerDraft,pdf(),true)).rejects.toMatchObject({status:403})
    await expect(uploadProfileMedia(owner,owner.providerId!,new File([],'empty.png'))).rejects.toMatchObject({status:400})
    await expect(uploadProfileMedia(owner,owner.providerId!,new File(['<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"/>'],'fake.png',{type:'image/png'}))).rejects.toMatchObject({status:400})
    const tiny=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1cAAAAASUVORK5CYII=','base64')
    await expect(uploadProfileMedia(owner,owner.providerId!,new File([tiny],'tiny.png'))).rejects.toMatchObject({status:400})
  })
  it('makes linked image access follow published version, account and village visibility',async()=>{
    const result=await uploadProfileMedia(owner,owner.providerId!,pdf(),true)
    // Access-policy fixture only; image decoding is covered by upload validation above.
    repo.update('stored_files',row=>row.file_id===result.file_id,{media_type:'image/png'})
    repo.insert('provider_version_media',{provider_id:owner.providerId!,version_no:'999',file_id:result.file_id,category:'Space'})
    const guest=(await toSessionContext(guestSession()))
    ;(await expect(async ()=>(await readProfileMedia(guest,result.file_id))).rejects.toThrow('Không có quyền'))
    const provider=repo.find('provider_profiles',row=>row.provider_id===owner.providerId)!
    repo.update('provider_version_media',row=>row.file_id===result.file_id,{version_no:provider.published_version_no})
    expect((await readProfileMedia(guest,result.file_id)).file.file_id).toBe(result.file_id)
    repo.update('user_accounts',row=>row.user_id===owner.userId,{account_status:'Suspended'})
    ;(await expect(async ()=>(await readProfileMedia(guest,result.file_id))).rejects.toThrow('Không có quyền'))
    repo.update('user_accounts',row=>row.user_id===owner.userId,{account_status:'Active'})
    repo.update('villages',row=>row.village_id===provider.village_id,{is_active:'false'})
    ;(await expect(async ()=>(await readProfileMedia(guest,result.file_id))).rejects.toThrow('Không có quyền'))
  })
  it('rejects a forged image URL before an Experience is inserted',async()=>{
    const result=await uploadProfileMedia(owner,owner.providerId!,pdf(),true)
    const before=repo.all('experiences').length
    const metadata={url:result.url,media_type:'image/png',file_size_bytes:100,width_px:1280,height_px:720}
    await expect(createExperience(owner,{name:'Synthetic experience',description:'Synthetic description',category:'Pottery',duration_minutes:60,price_per_person:100000,max_participants:10,notice_period_hours:24,images:[{...metadata,category:'Activity'},{...metadata,category:'Space'},{...metadata,category:'Product'}]})).rejects.toMatchObject({statusCode:400})
    expect(repo.all('experiences')).toHaveLength(before)
  })
})
