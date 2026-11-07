import { afterAll,beforeAll,describe,expect,it } from 'vitest'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { Pool } from 'pg'
import { createDbClient,type DbClient } from '@/lib/db/client'
import { AsyncPostgresStore } from '@/lib/db/async-store'
import { withApplicationStore } from '@/lib/db/application-store'
import { databaseConfig } from '../../scripts/db/config.mjs'
import { storageClient,storageConfig } from '../../scripts/storage/client.mjs'
import { demoSessionContextFor } from '@/lib/auth/session'
import { uploadProfileMedia,readProfileMedia } from '@/lib/prf/media-store'
import { createChatHandoff } from '@/lib/demo/commercial-handoff-service'
import { sendAttachments,readAttachment } from '@/lib/iac/chat-service'
import { saveRegistrationFiles,discardRegistrationFiles } from '@/lib/auth/registration-files'
import { GET as getAvatar,POST as uploadAvatar } from '@/app/api/auth/account/avatar/route'

const experience='c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
describe.skipIf(process.env.HAB_TEST_STORAGE!=='1')('Hosted private file storage with application role guards',()=>{
 let db:DbClient
 beforeAll(()=>{db=createDbClient(new Pool(databaseConfig(process.env)))})
 afterAll(async()=>{if(db)await db.close()})
 async function sandbox(work:(cleanup:string[])=>Promise<void>){
  const marker=new Error('ROLLBACK_STORAGE_FIXTURES'),cleanup:string[]=[]
  try{await db.transaction(()=>withApplicationStore(new AsyncPostgresStore(db),async()=>{await work(cleanup);throw marker}))}
  catch(error){if(error!==marker)throw error}
  finally{for(const key of cleanup)await storageClient().remove(key)}
 }
 it('round-trips an owner image; only a linked published image is public',async()=>sandbox(async cleanup=>{
  const owner=await demoSessionContextFor('provider'),guest=await demoSessionContextFor('guest')
  const bytes=readFileSync('assets/demo-media/ceramics.jpg')
  const uploaded=await uploadProfileMedia(owner,owner.providerId!,new File([bytes],'synthetic-licensed-photo.jpg',{type:'image/jpeg'}))
  cleanup.push(`prf-media/${uploaded.file_id}`)
  expect((await readProfileMedia(owner,uploaded.file_id)).bytes.equals(bytes)).toBe(true)
  await expect(readProfileMedia(guest,uploaded.file_id)).rejects.toMatchObject({status:403})
  await db.query("INSERT INTO public.profile_media(profile_media_id,file_id,experience_id,category,display_order) VALUES($1,$2,$3,'Activity',0)",[randomUUID(),uploaded.file_id,experience])
  expect((await readProfileMedia(guest,uploaded.file_id)).bytes.equals(bytes)).toBe(true)
 }),60000)
 it('keeps uploaded certificate bytes private and inaccessible through public Storage URLs',async()=>sandbox(async cleanup=>{
  const owner=await demoSessionContextFor('provider'),guest=await demoSessionContextFor('guest')
  const upload=await uploadProfileMedia(owner,owner.providerId!,new File(['%PDF-1.4\nSynthetic storage test'],'synthetic-test.pdf',{type:'application/pdf'}),true)
  cleanup.push(`prf-media/${upload.file_id}`)
  await expect(readProfileMedia(guest,upload.file_id)).rejects.toMatchObject({status:403})
  const c=storageConfig(),response=await fetch(`${c.url}/storage/v1/object/public/${c.bucket}/prf-media/${upload.file_id}`)
  expect(response.ok).toBe(false)
 }),60000)
 it('persists a Chat attachment and authorizes its own participants only',async()=>sandbox(async cleanup=>{
  const agency=await demoSessionContextFor('agency'),provider=await demoSessionContextFor('provider'),hdt=await demoSessionContextFor('hdt')
  const chat=await createChatHandoff(agency,experience)
  const output=await sendAttachments(provider,chat.chat_session_id,[{name:'synthetic.pdf',size:9,bytes:Buffer.from('synthetic')}])
  const link=(await db.query('SELECT file_id FROM public.chat_attachments WHERE attachment_id=$1',[output.attachments[0].attachment_id])).rows[0]
  cleanup.push(`chat-files/${link.file_id}`)
  expect(Buffer.from((await readAttachment(agency,chat.chat_session_id,output.attachments[0].attachment_id)).bytes).toString()).toBe('synthetic')
  await expect(readAttachment(hdt,chat.chat_session_id,output.attachments[0].attachment_id)).rejects.toMatchObject({code:'FORBIDDEN'})
 }),60000)
 it('stores registration documents privately and compensates discarded files',async()=>{
  const bytes='%PDF-1.4\nSynthetic registration document'
  const files=await saveRegistrationFiles([new File([bytes],'synthetic-registration.pdf',{type:'application/pdf'})])
  try{expect((await storageClient().read(files[0].storage_key))?.toString()).toBe(bytes)}
  finally{await discardRegistrationFiles(files)}
  expect(await storageClient().exists(files[0].storage_key)).toBe(false)
 },60000)
 it('round-trips an authenticated avatar through the API without allowing Guest access',async()=>sandbox(async cleanup=>{
  const bytes=readFileSync('assets/demo-media/ceramics.jpg'),body=new FormData(),headers={cookie:'hab_demo_account=agency'}
  body.set('avatar',new File([bytes],'synthetic-avatar.jpg',{type:'image/jpeg'}))
  const result=await uploadAvatar(new Request('http://localhost/api/auth/account/avatar',{method:'POST',headers,body}))
  expect(result.status).toBe(200)
  const agency=await demoSessionContextFor('agency')
  const row=(await db.query('SELECT avatar_file_id FROM public.user_accounts WHERE user_id=$1',[agency.userId])).rows[0]
  cleanup.push(`account-avatars/${row.avatar_file_id}`)
  const response=await getAvatar(new Request('http://localhost/api/auth/account/avatar',{headers}))
  expect(response.status).toBe(200)
  expect(Buffer.from(await response.arrayBuffer()).equals(bytes)).toBe(true)
  expect((await getAvatar(new Request('http://localhost/api/auth/account/avatar'))).status).toBe(401)
 }),60000)
})
