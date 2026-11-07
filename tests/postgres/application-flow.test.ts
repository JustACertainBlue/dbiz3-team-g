import { afterAll,beforeAll,describe,expect,it } from 'vitest'
import { Pool } from 'pg'
import { randomUUID } from 'node:crypto'
import { databaseConfig } from '../../scripts/db/config.mjs'
import { createDbClient,type DbClient } from '@/lib/db/client'
import { AsyncPostgresStore } from '@/lib/db/async-store'
import { withApplicationStore } from '@/lib/db/application-store'
import { demoSessionContextFor } from '@/lib/auth/session'
import { authenticateAccount,productSessionFromRequest,revokeProductSession } from '@/lib/auth/product-session'
import { createMatchingSession,addMessage,getMessages } from '@/lib/matching/session-service'
import { demoRuntime } from '@/lib/explore/demo-runtime'
import { createQuoteHandoff } from '@/lib/demo/commercial-handoff-service'
import { getChatHistory,sendMessage,closeChat } from '@/lib/iac/chat-service'
import { createBooking } from '@/lib/booking/create-booking'
import { changeBookingStatus } from '@/lib/booking/change-status'
import { getProviderSchedule } from '@/lib/booking/provider-schedule'
import { SEED_NOW } from '@/lib/booking/clock'
import { updateExperience } from '@/lib/prf/experience-service'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { saveAgencyPreferenceProfile,getAgencyPreferenceProfile } from '@/lib/preferences/preference-service'
import { hashPassword } from '@/lib/auth/password'
import { submitRegistration,verifyRegistration } from '@/lib/auth/registration-service'
import { reviewAgency } from '@/lib/auth/agency-review'
import { accountAction } from '@/lib/auth/admin-accounts'
import { resubmitRegistration } from '@/lib/auth/lifecycle'

const experience='c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const agencyId='02e568d8-d65e-54b1-a554-b411150d1dcb'
const providerId='50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
describe.skipIf(process.env.HAB_TEST_POSTGRES!=='1')('Live application services on restricted Supabase PostgreSQL',()=>{
  let db:DbClient
  beforeAll(()=>{db=createDbClient(new Pool(databaseConfig(process.env)))})
  afterAll(async()=>{if(db)await db.close()})
  async function rollback(work:()=>Promise<void>){
    const sentinel=new Error('ROLLBACK_HOSTED_APPLICATION_TEST')
    try{await db.transaction(async()=>withApplicationStore(new AsyncPostgresStore(db),async()=>{await work();throw sentinel}))}
    catch(error){if(error!==sentinel)throw error}
  }
  it('authenticates a real password hash, persists and revokes the opaque product session',async()=>rollback(async()=>{
    const password='SyntheticHosted123!'
    await db.query('UPDATE public.user_accounts SET password_hash=$1 WHERE email=$2',[await hashPassword(password),'thanhvien13@example.invalid'])
    const login=await authenticateAccount('thanhvien13@example.invalid',password)
    expect(login.ok).toBe(true);if(!login.ok)return
    const request=new Request('http://localhost/api/auth/session',{headers:{cookie:`hab_session=${login.token}`}})
    expect((await productSessionFromRequest(request))?.agencyId).toBe(agencyId)
    expect(await revokeProductSession(request)).toBe(true)
    expect(await productSessionFromRequest(request)).toBeNull()
  }),30000)
  it('keeps Matching status/messages and the preference profile across service instances',async()=>rollback(async()=>{
    const matching=await createMatchingSession(agencyId)
    await addMessage(matching.session_id,'Agency','Synthetic persistent Matching message')
    expect((await getMessages(matching.session_id))[0].text).toContain('persistent')
    expect((await db.query('SELECT status FROM public.matching_sessions WHERE matching_session_id=$1',[matching.session_id])).rows[0].status).toBe('active')
    await saveAgencyPreferenceProfile({agencyId,sessionId:matching.session_id,tourPreferenceProfile:{matching_attributes:['Ceramics']}})
    expect((await getAgencyPreferenceProfile(agencyId))?.affinity_tags.Ceramics).toBeGreaterThan(0)
  }),30000)
  it('persists registration → OTP → HDT approval, then disabling revokes the new account session',async()=>rollback(async()=>{
    const id=randomUUID(),email=`hosted-${id}@example.invalid`,password='SyntheticRegistration123!'
    const input={full_name:'Synthetic Applicant',email,password,confirm_password:password,company_name:'Synthetic Hosted Travel',company_type:'Travel Agency',tax_id:'9998887776',location:{street:'Synthetic street',ward:'Synthetic ward',district:'Synthetic district',city_province:'Hanoi'},contact_information:{contact_person_name:'Synthetic Applicant',phone_number:'0912345678'},team_size:2,tour_types:['Cultural/Heritage'],registration_documents:[{}]}
    let otp=''
    const result=await submitRegistration(input,[{file_id:id,storage_key:`registration-documents/${id}`,file_name:'synthetic.pdf',media_type:'application/pdf',file_size_bytes:'1024',width_px:'',height_px:'',uploaded_by:'',created_at:new Date().toISOString()}],message=>{otp=message.otp})
    const registrationId=result.registration_request_id
    const verified=await verifyRegistration(registrationId,otp)
    expect(verified.account_status).toBe('Pending Approval')
    const hdt=await demoSessionContextFor('hdt')
    let token=''
    await reviewAgency(hdt,registrationId,'registration','Request More Information','Synthetic request',message=>{token=message.token})
    await reviewAgency(hdt,registrationId,'registration','Request More Information','Replacement link',message=>{token=message.token})
    await resubmitRegistration(token,input)
    await reviewAgency(hdt,registrationId,'registration','Approve','')
    expect((await db.query('SELECT count(*) FROM public.agency_review_records WHERE registration_request_id=$1',[registrationId])).rows[0].count).toBe('3')
    const login=await authenticateAccount(email,password)
    expect(login.ok).toBe(true);if(!login.ok)return
    await accountAction(hdt,verified.user_id,'disable')
    const request=new Request('http://localhost/api/auth/session',{headers:{cookie:`hab_session=${login.token}`}})
    expect(await productSessionFromRequest(request)).toBeNull()
    expect((await db.query("SELECT event_type FROM public.notifications WHERE recipient_user_id=$1",[verified.user_id])).rows.map(row=>row.event_type)).toContain('Registration Reviewed')
  }),60000)
  it('rolls back the whole aggregate when a later SQL constraint fails',async()=>{
    const before=(await db.query('SELECT description FROM public.experiences WHERE experience_id=$1',[experience])).rows[0].description
    const store=new AsyncPostgresStore(db)
    await expect(store.atomic(['experiences'],async()=>{
      await store.update('experiences',row=>row.experience_id===experience,{description:'This update must roll back'})
      await db.query('UPDATE public.experiences SET price_per_person=-1 WHERE experience_id=$1',[experience])
    })).rejects.toMatchObject({code:'23514'})
    expect((await db.query('SELECT description FROM public.experiences WHERE experience_id=$1',[experience])).rows[0].description).toBe(before)
  },30000)
  it('uses a transaction lock shared by independent backend connections',async()=>{
    const other=createDbClient(new Pool(databaseConfig(process.env)))
    try{await new AsyncPostgresStore(db).atomic(['chat_sessions'],async()=>{
      const result=await other.transaction(tx=>tx.query("SELECT pg_try_advisory_xact_lock(hashtextextended('hab:chat_sessions',0)) AS acquired"))
      expect(result.rows[0].acquired).toBe(false)
    })}finally{await other.close()}
  },30000)
  it('persists Explore snapshots/duration, suppresses duplicate event ids and honors no-tracking consent',async()=>rollback(async()=>{
    const engine=await demoRuntime()
    const session=await engine.startSession({kind:'agency',agencyId},true)
    expect((await engine.resultsFor(session.session_id)).length).toBeGreaterThan(0)
    const event={event_id:randomUUID(),action_type:'view_detail' as const,experience_id:experience,duration_on_previous_screen:90}
    expect((await engine.recordEvent(session.session_id,event)).logged).toBe(true)
    const fresh=await demoRuntime()
    expect((await fresh.sessionFor(session.session_id))?.agency_id).toBe(agencyId)
    expect((await fresh.recordEvent(session.session_id,event)).logged).toBe(false)
    expect((await db.query('SELECT duration_on_previous_screen FROM public.explore_interactions WHERE session_id=$1',[session.session_id])).rows[0].duration_on_previous_screen).toBe(90)
    const anonymous=await fresh.startSession({kind:'guest'},false)
    expect((await fresh.recordEvent(anonymous.session_id,{event_id:randomUUID(),action_type:'scroll'})).logged).toBe(false)
    expect((await db.query('SELECT ranked_results FROM public.explore_sessions WHERE session_id=$1',[anonymous.session_id])).rows[0].ranked_results).toBeNull()
  }),30000)
  it('uses the same Experience records for Provider editing and Explore, while refusing another role',async()=>rollback(async()=>{
    const provider=await demoSessionContextFor('provider'),agency=await demoSessionContextFor('agency')
    await updateExperience(experience,provider,{description:'Synthetic live PostgreSQL catalog edit'})
    expect((await loadExploreRuntime()).experiences.find(row=>row.experience_id===experience)?.description).toContain('live PostgreSQL')
    await expect(updateExperience(experience,agency,{description:'Forbidden write'})).rejects.toMatchObject({statusCode:403})
  }),30000)
  it('keeps Quote → Chat → Booking → Schedule context, with no Booking on Quote handoff',async()=>rollback(async()=>{
    const agency=await demoSessionContextFor('agency'),provider=await demoSessionContextFor('provider')
    const before=Number((await db.query('SELECT count(*) FROM public.bookings')).rows[0].count)
    const quote=await createQuoteHandoff(agency,experience)
    expect(Number((await db.query('SELECT count(*) FROM public.bookings')).rows[0].count)).toBe(before)
    await sendMessage(provider,quote.chat_session_id,'Synthetic hosted Provider reply')
    expect((await getChatHistory(agency,quote.chat_session_id)).message_history.at(-1)?.text).toContain('Provider reply')
    const booking=await createBooking(provider,{experience_id:experience,agency_id:agencyId,source_chat_session_id:quote.chat_session_id,
      start_at:'2026-10-12T09:00:00+07:00',duration:60,group_size:10,agreed_price:2000000,
      booking_conditions:{notice_period:24,cancellation_policy:{before_hours:24,refund_percent:80}}},{now:()=>new Date(SEED_NOW)})
    await changeBookingStatus(provider,booking.booking_id,{target_status:'Booked'},{now:()=>new Date(SEED_NOW)})
    expect((await db.query('SELECT status,source_chat_session_id FROM public.bookings WHERE booking_id=$1',[booking.booking_id])).rows[0]).toMatchObject({status:'Booked',source_chat_session_id:quote.chat_session_id})
    const schedule=await getProviderSchedule(provider,providerId,{date_from:'2026-10-12',date_to:'2026-10-12'},{now:()=>new Date(SEED_NOW)})
    expect(JSON.stringify(schedule)).toContain(booking.booking_id)
    await closeChat(agency,quote.chat_session_id,{closeReason:'Synthetic integration complete'})
    await expect(sendMessage(provider,quote.chat_session_id,'Must be refused')).rejects.toMatchObject({code:'CHAT_CLOSED'})
  }),60000)
})
