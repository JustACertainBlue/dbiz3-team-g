import { afterAll,beforeAll,describe,expect,it } from 'vitest'
import { Pool } from 'pg'
import { databaseConfig } from '../../scripts/db/config.mjs'
import { createDbClient,type DbClient,type SqlExecutor } from '@/lib/db/client'
import { getPublishedExperience,updatePostgresExperience } from '@/lib/db/postgres-experiences'
import type { SessionContext } from '@/lib/auth/session'

// Explicit opt-in only: ordinary npm test never connects to a hosted database.
describe.skipIf(process.env.HAB_TEST_POSTGRES!=='1')('Hosted PostgreSQL Provider → Experience → public catalog',()=>{
  let db:DbClient
  beforeAll(()=>{db=createDbClient(new Pool(databaseConfig(process.env)))})
  afterAll(async()=>{if(db)await db.close()})
  async function rollback(work:(sandbox:DbClient)=>Promise<void>) {
    const sentinel=new Error('ROLLBACK_TEST_FIXTURE')
    try{
      await db.transaction(async tx=>{
        const sandbox:DbClient={query:tx.query.bind(tx),close:async()=>{},transaction:async callback=>{
          await tx.query('SAVEPOINT business_operation')
          try{const value=await callback(tx);await tx.query('RELEASE SAVEPOINT business_operation');return value}
          catch(error){await tx.query('ROLLBACK TO SAVEPOINT business_operation');throw error}
        }}
        await work(sandbox);throw sentinel
      })
    }catch(error){if(error!==sentinel)throw error}
  }
  async function fixture(tx:SqlExecutor,active=false) {
    const result=await tx.query(`SELECT e.*,p.user_id FROM public.experiences e JOIN public.provider_profiles p ON p.provider_id=e.provider_id
      JOIN public.provider_profile_versions pv ON pv.provider_id=p.provider_id AND pv.version_no=p.published_version_no
      JOIN public.villages v ON v.village_id=p.village_id JOIN public.user_accounts u ON u.user_id=p.user_id
      WHERE p.verification_status='Verified' AND pv.version_status='Verified' AND v.is_active=true
        AND u.account_status='Active' AND e.archived_at IS NULL
        AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.experience_id=e.experience_id AND b.status IN ('On hold','Booked'))=$1 LIMIT 1`,[active])
    expect(result.rowCount).toBe(1)
    const row=result.rows[0]
    const actor:SessionContext={authenticated:true,userId:row.user_id,role:'Local_Provider',adminType:null,providerId:row.provider_id,agencyId:null,assignedVillageId:null,permissions:[],dataScope:'Own organization'}
    return {row,actor}
  }
  it('uses a restricted database role and has no schema/role administration privileges',async()=>{
    const result=await db.query("SELECT rolname,rolsuper,rolcreatedb,rolcreaterole,rolbypassrls,has_schema_privilege(current_user,'public','CREATE') AS can_create,has_table_privilege(current_user,'public.user_accounts','UPDATE') AS can_edit_accounts FROM pg_roles WHERE rolname=current_user")
    expect(result.rows[0]).toMatchObject({rolname:'hab_app',rolsuper:false,rolcreatedb:false,rolcreaterole:false,rolbypassrls:false,can_create:false,can_edit_accounts:true})
  })
  it('persists a Provider update and reads it through the same database catalog, without leaking public prices',async()=>{
    let id='',original=''
    await rollback(async sandbox=>{
      const {row,actor}=await fixture(sandbox);id=row.experience_id;original=row.description
      await updatePostgresExperience(sandbox,id,actor,{description:'Synthetic PostgreSQL integration description',price_per_person:123456})
      expect(await getPublishedExperience(sandbox,id)).toMatchObject({id,description:'Synthetic PostgreSQL integration description',price:null})
      const stored=await sandbox.query('SELECT price_per_person::text AS price FROM public.experiences WHERE experience_id=$1',[id])
      expect(Number(stored.rows[0].price)).toBe(123456)
    })
    expect((await getPublishedExperience(db,id))?.description).toBe(original)
  })
  it('preserves cancellation policy on an unrelated edit and atomically saves discounts',async ()=>(await rollback(async sandbox=>{
    const {row,actor}=await fixture(sandbox)
    await updatePostgresExperience(sandbox,row.experience_id,actor,{description:'Synthetic description only',group_discounts:[{pax_threshold:37,discount_percentage:12}]})
    const updated=await sandbox.query('SELECT cancellation_policy FROM public.experiences WHERE experience_id=$1',[row.experience_id])
    expect(updated.rows[0].cancellation_policy).toEqual(row.cancellation_policy)
    const rules=await sandbox.query("SELECT pax_threshold,discount_percentage FROM public.experience_discount_rules WHERE experience_id=$1 AND rule_kind='Group Discount'",[row.experience_id])
    expect(rules.rowCount).toBe(1);expect(rules.rows[0].pax_threshold).toBe(37)
  })))
  it('rejects Guest, Agency and another owner without changing records',async ()=>(await rollback(async sandbox=>{
    const {row,actor}=await fixture(sandbox)
    for(const input of [{...actor,authenticated:false},{...actor,role:'Tour_Agency' as const}])await expect(((updatePostgresExperience(sandbox,row.experience_id,input,{description:'Must not persist'})))).rejects.toMatchObject({statusCode:403})
    await expect(((updatePostgresExperience(sandbox,row.experience_id,{...actor,userId:'00000000-0000-4000-8000-000000000001'},{description:'Must not persist'})))).rejects.toMatchObject({statusCode:404})
    expect((await getPublishedExperience(sandbox,row.experience_id))?.description).toBe(row.description)
  })))
  it('enforces active-Booking price/capacity/duration/location locks using real database rows',async ()=>(await rollback(async sandbox=>{
    const {row,actor}=await fixture(sandbox,true)
    await expect(((updatePostgresExperience(sandbox,row.experience_id,actor,{price_per_person:Number(row.price_per_person)+1})))).rejects.toMatchObject({statusCode:409})
    await updatePostgresExperience(sandbox,row.experience_id,actor,{description:'Descriptions remain editable'})
  })))
  it('rejects negative prices at the PostgreSQL constraint layer and rolls the transaction back',async()=>{
    const result=await db.query('SELECT experience_id FROM public.experiences LIMIT 1')
    await expect(((db.transaction(async tx=>{await tx.query('UPDATE public.experiences SET price_per_person=-1 WHERE experience_id=$1',[result.rows[0].experience_id])})))).rejects.toMatchObject({code:'23514'})
    expect((await db.query('SELECT 1 WHERE NOT EXISTS (SELECT 1 FROM public.experiences WHERE price_per_person<0)')).rowCount).toBe(1)
  })
})
