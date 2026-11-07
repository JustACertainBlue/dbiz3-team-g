import { describe,it,expect } from 'vitest'
import { Pool } from 'pg'
import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { databaseConfig } from '../../scripts/db/config.mjs'
import { createDbClient } from '@/lib/db/client'
import { AsyncPostgresStore } from '@/lib/db/async-store'
import { withApplicationStore } from '@/lib/db/application-store'
import { demoSessionContextFor } from '@/lib/auth/session'
import { createManagedAccount,changePassword } from '@/lib/auth/lifecycle'
import { authenticateAccount } from '@/lib/auth/product-session'
import { POST as upload } from '@/app/api/prf/media/route'
import { PATCH as patch } from '@/app/api/prf/provider/[providerId]/route'
import { POST as review } from '@/app/api/prf/provider/[providerId]/verify/route'
import { readProfileMedia } from '@/lib/prf/media-store'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { eligibleRows } from '@/lib/explore/catalog'
import { getExperienceDetail } from '@/lib/explore/details'
import { storageClient } from '../../scripts/storage/client.mjs'
import { demoRepository } from '@/lib/db/application-store'
import { POST as createExperienceRoute } from '@/app/api/prf/experience/route'

// Explicit hosted opt-in. Commits are intentional: a second connection must see every milestone.
// Only UUIDs created by this test are removed; never reset seed or change existing providers.
describe.skipIf(process.env.HAB_TEST_STORAGE!=='1')('Committed Provider onboarding → upload → review → Explore',()=>{
 it('persists each milestone across connections, preserves publication isolation and cleans its fixtures',async()=>{
  const db=createDbClient(new Pool(databaseConfig(process.env)))
  const reader=createDbClient(new Pool(databaseConfig(process.env)))
  let userId='',providerId='',experienceId=''
  let adminId='',villageId=''
  const keys:string[]=[]
  try{await withApplicationStore(new AsyncPostgresStore(db),async()=>{
   const seedUbnd=await demoSessionContextFor('ubnd'),seedOwner=await demoSessionContextFor('provider'),guest=await demoSessionContextFor('guest')
   const template=(await demoRepository().all('villages')).find(row=>row.is_active==='true')!
   villageId=randomUUID()
   await demoRepository().insert('villages',{...template,village_id:villageId,source_code:`TEST-${villageId}`,name:`Synthetic Provider Test ${villageId}`})
   let adminTemporary=''
   const adminEmail=`admin-provider-flow-${randomUUID()}@example.invalid`
   const admin=await createManagedAccount(await demoSessionContextFor('hdt'),'ubnd',{name:'Synthetic Review Admin',email:adminEmail,phone:'0912345678',village_id:villageId},message=>{adminTemporary=message.temporary_password||''})
   adminId=admin.user_id
   const ubnd={...seedUbnd,userId:adminId,assignedVillageId:villageId}
   const adminPassword='SyntheticAdminProvider123!'
   await changePassword(ubnd,adminTemporary,adminPassword,adminPassword)
   const adminLogin=await authenticateAccount(adminEmail,adminPassword)
   if(!adminLogin.ok)throw Error('Synthetic Admin login failed')
   const adminCookie=`hab_session=${adminLogin.token}`
   const email=`provider-flow-${randomUUID()}@example.invalid`
   let temporary=''
   const account=await createManagedAccount(ubnd,'provider',{name:'Synthetic Storage Review Workshop',email,phone:'0912345678',village_id:ubnd.assignedVillageId,address:'Synthetic test address'},message=>{temporary=message.temporary_password||''})
   userId=account.user_id;providerId=account.provider_id!
   const owner={...seedOwner,userId,providerId}
   const state=async()=> (await reader.query('SELECT verification_status,published_version_no,current_version_no FROM public.provider_profiles WHERE provider_id=$1',[providerId])).rows[0]
   expect((await state()).verification_status).toBe('Draft')
   const password='SyntheticProviderFlow123!'
   await changePassword(owner,temporary,password,password)
   const login=await authenticateAccount(email,password)
   expect(login.ok).toBe(true);if(!login.ok)throw Error('Synthetic Provider login failed')
   const cookie=`hab_session=${login.token}`
   const http=process.env.HAB_PROVIDER_FLOW_HTTP==='1'
   const call=async(request:Request,handler:()=>Promise<Response>)=>http?fetch(request.url.replace('http://localhost/','http://localhost:3000/'),{method:request.method,headers:request.headers,body:request.method==='GET'?undefined:await request.arrayBuffer(),signal:AbortSignal.timeout(60000)}):handler()
   const edit=async(body:unknown,actorCookie=cookie)=>{
    const request=new Request(`http://localhost/api/prf/provider/${providerId}`,{method:'PATCH',headers:{cookie:actorCookie,'Content-Type':'application/json'},body:JSON.stringify(body)})
    return call(request,()=>patch(request,{params:{providerId}}))
   }
   const decision=async(value:string,actorCookie=adminCookie)=>{
    const request=new Request(`http://localhost/api/prf/provider/${providerId}/verify`,{method:'POST',headers:{cookie:actorCookie,'Content-Type':'application/json'},body:JSON.stringify({decision:value,revision_comments:value==='Request Revision'?'Synthetic correction request':undefined})})
    const response=await call(request,()=>review(request,{params:{providerId}}))
    return response
   }
   const visible=async()=>eligibleRows(await loadExploreRuntime()).some(row=>row.experience.experience_id===experienceId)
   expect((await edit({general_description:'Synthetic partially saved workshop profile.'})).status).toBe(200)
   expect((await state()).verification_status).toBe('Draft')
   expect((await edit({business_name:'Denied write'},'hab_demo_account=agency')).status).toBe(403)
   console.log('PASS Provider flow: new account and partial Draft committed, foreign role denied.')

   const imageBytes=readFileSync('assets/demo-media/ceramics.jpg')
   const sendFile=async(file:File,certificate=false)=>{
    const form=new FormData();form.set('provider_id',providerId);form.set('file',file);if(certificate)form.set('purpose','certificate')
    const request=new Request('http://localhost/api/prf/media',{method:'POST',headers:{cookie},body:form})
    const response=await call(request,()=>upload(request))
    const body=await response.json();expect(response.status,JSON.stringify(body)).toBe(201)
    keys.push(`prf-media/${body.file_id}`)
    expect((await reader.query('SELECT storage_key FROM public.stored_files WHERE file_id=$1',[body.file_id])).rows[0].storage_key).toBe(keys.at(-1))
    return body
   }
   const bad=new FormData();bad.set('provider_id',providerId);bad.set('file',new File(['invalid'],'invalid.jpg',{type:'image/jpeg'}))
   expect((await upload(new Request('http://localhost/api/prf/media',{method:'POST',headers:{cookie},body:bad}))).status).toBe(400)
   const photos=[]
   for(const category of ['Activity','Space','Product'] as const){
    const photo=await sendFile(new File([imageBytes],`synthetic-${category}.jpg`,{type:'image/jpeg'}))
    expect((await storageClient().read(keys.at(-1)!))?.equals(imageBytes)).toBe(true)
    photos.push({...photo,category})
   }
   const certificate=await sendFile(new File(['%PDF-1.4\nSynthetic test certificate, not a real document'],'synthetic-certificate.pdf',{type:'application/pdf'}),true)
   expect((await edit({business_name:'Synthetic Storage Review Workshop',craft_type:'Ceramics',business_registration:`TEST-${providerId}`,location_address:'Synthetic test address',phone_number:'0912345678',business_email:email,certificate_file_id:certificate.file_id,profile_images:photos.map(p=>({file_id:p.file_id,category:p.category})),operating_hours:[{weekday:1,local_start:'08:00',local_end:'17:00',is_closed:false}]})).status).toBe(200)
   expect((await state()).verification_status).toBe('Pending Verification')
   expect((await reader.query('SELECT count(*)::int AS n FROM public.provider_version_documents WHERE provider_id=$1',[providerId])).rows[0].n).toBe(1)
   expect((await reader.query('SELECT count(*)::int AS n FROM public.provider_version_media WHERE provider_id=$1',[providerId])).rows[0].n).toBe(3)
   const experienceInput={name:'Synthetic Provider Publication Test',description:'Synthetic experience for committed database verification.',category:'Workshop/Hands-on',duration_minutes:60,price_per_person:150000,max_participants:12,notice_period_hours:24,experience_location_address:'Synthetic test address',images:photos}
   const createRequest=new Request('http://localhost/api/prf/experience',{method:'POST',headers:{cookie,'Content-Type':'application/json'},body:JSON.stringify(experienceInput)})
   const createResponse=await call(createRequest,()=>createExperienceRoute(createRequest))
   const experience=await createResponse.json();expect(createResponse.status,JSON.stringify(experience)).toBe(201)
   experienceId=experience.experience_id
   expect(await visible()).toBe(false)
   if(http){
    const page=await fetch(`http://localhost:3000/explore/experiences/${experienceId}`),html=await page.text()
    // Next.js streamed notFound pages may already have sent HTTP 200 headers.
    expect([200,404]).toContain(page.status);expect(html).not.toContain('Synthetic Provider Publication Test')
    expect(html).toMatch(/NEXT_NOT_FOUND|404|không tìm thấy/i)
   }
   await expect(readProfileMedia(guest,photos[0].file_id)).rejects.toMatchObject({status:403})
   await expect(readProfileMedia(guest,certificate.file_id)).rejects.toMatchObject({status:403})
   expect((await decision('Approve','hab_demo_account=hdt')).status).toBe(403)
   expect((await decision('Request Revision')).status).toBe(200)
   expect((await state()).verification_status).toBe('Revision Required')
   expect((await edit({general_description:'Synthetic corrected workshop description.'})).status).toBe(200)
   expect((await state()).verification_status).toBe('Pending Verification')
   const approval=await decision('Approve')
   expect(approval.status).toBe(200)
   expect((await state()).verification_status).toBe('Verified')
   expect(await visible()).toBe(true)
   if(http){const page=await fetch(`http://localhost:3000/explore/experiences/${experienceId}`);expect(page.status).toBe(200);expect(await page.text()).toContain('Synthetic Provider Publication Test')}
   expect((await readProfileMedia(guest,photos[0].file_id)).bytes.equals(imageBytes)).toBe(true)
   await expect(readProfileMedia(guest,certificate.file_id)).rejects.toMatchObject({status:403})
   const detail=getExperienceDetail(await loadExploreRuntime(),experienceId,{kind:'guest'})
   expect(detail?.card.provider_id).toBe(providerId);expect(detail?.card.price).toBeNull()
   expect((await reader.query('SELECT count(*)::int AS n FROM public.provider_verification_reviews WHERE provider_id=$1',[providerId])).rows[0].n).toBe(2)
   console.log('PASS Provider flow: files persisted, revision/resubmission/approval committed, Explore visible, certificate private.')
   expect((await edit({business_name:'Synthetic Reviewed Workshop Revision'})).status).toBe(200)
   expect((await state()).current_version_no).toBe(2)
   expect(getExperienceDetail(await loadExploreRuntime(),experienceId,{kind:'guest'})?.card.provider_name).toBe('Synthetic Storage Review Workshop')
   expect((await decision('Approve')).status).toBe(200)
   expect(getExperienceDetail(await loadExploreRuntime(),experienceId,{kind:'guest'})?.card.provider_name).toBe('Synthetic Reviewed Workshop Revision')
   expect((await reader.query('SELECT version_status FROM public.provider_profile_versions WHERE provider_id=$1 AND version_no=1',[providerId])).rows[0].version_status).toBe('Superseded')
   await expect(reader.transaction(tx=>tx.query("UPDATE public.provider_profile_versions SET business_registration_number=$1 WHERE provider_id=$2 AND version_status='Verified'",[`TEST-${providerId}`,seedOwner.providerId]))).rejects.toMatchObject({code:'23505'})
   console.log('PASS Provider flow: later major edit preserves published version until approval.')
  })}catch(error){console.error('Provider flow failure:',error instanceof Error?error.message:'Unknown failure');throw error}finally{
   try{if(userId)await db.transaction(async tx=>{
    await tx.query('SET CONSTRAINTS ALL DEFERRED')
    await tx.query('DELETE FROM public.profile_media WHERE experience_id=$1',[experienceId||null])
    await tx.query('DELETE FROM public.experience_discount_rules WHERE experience_id=$1',[experienceId||null])
    await tx.query('DELETE FROM public.experiences WHERE experience_id=$1',[experienceId||null])
    for(const table of ['provider_verification_reviews','provider_version_documents','provider_version_media','provider_operating_hours'])await tx.query(`DELETE FROM public.${table} WHERE provider_id=$1`,[providerId])
    await tx.query('DELETE FROM public.provider_profile_versions WHERE provider_id=$1',[providerId])
    await tx.query('DELETE FROM public.provider_profiles WHERE provider_id=$1',[providerId])
    await tx.query('DELETE FROM public.notifications WHERE recipient_user_id=$1 OR source_id=$2',[userId,providerId])
    await tx.query('DELETE FROM public.audit_logs WHERE actor_user_id=$1 OR target_id=ANY($2::uuid[])',[userId,[userId,providerId,experienceId].filter(Boolean)])
    await tx.query('DELETE FROM public.sessions WHERE user_id=$1',[userId])
    await tx.query('DELETE FROM public.stored_files WHERE uploaded_by=$1',[userId])
    await tx.query('DELETE FROM public.user_accounts WHERE user_id=$1',[userId])
   })}finally{
    if(adminId)await db.transaction(async tx=>{
     await tx.query('DELETE FROM public.sessions WHERE user_id=$1',[adminId])
     await tx.query('DELETE FROM public.ubnd_village_assignments WHERE ubnd_user_id=$1',[adminId])
     await tx.query('DELETE FROM public.audit_logs WHERE actor_user_id=$1 OR target_id=$1',[adminId])
     await tx.query('DELETE FROM public.user_accounts WHERE user_id=$1',[adminId])
    })
    if(villageId)await db.query('DELETE FROM public.villages WHERE village_id=$1',[villageId])
    for(const key of keys)await storageClient().remove(key)
    if(userId)expect((await reader.query('SELECT count(*)::int AS n FROM public.user_accounts WHERE user_id=$1',[userId])).rows[0].n).toBe(0)
    if(adminId)expect((await reader.query('SELECT count(*)::int AS n FROM public.user_accounts WHERE user_id=$1',[adminId])).rows[0].n).toBe(0)
    if(villageId)expect((await reader.query('SELECT count(*)::int AS n FROM public.villages WHERE village_id=$1',[villageId])).rows[0].n).toBe(0)
    await db.close();await reader.close()
   }
  }
 },180000)
})
