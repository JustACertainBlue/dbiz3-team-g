import type { SessionContext } from '../auth/session'
import type { DbClient, SqlExecutor } from './client'
import { ExperienceUpdateSchema } from '../prf/validators'

/** PostgreSQL slice, kept separate until all live consumers of this aggregate are migrated. */
export class PostgresExperienceError extends Error {
  constructor(message:string,public statusCode:number){super(message)}
}
const identifier=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const columns={name:'name',description:'description',category:'category',duration_minutes:'duration_minutes',price_per_person:'price_per_person',max_participants:'max_participants',notice_period_hours:'notice_period_hours',experience_location_address:'experience_location_address',cancellation_policy:'cancellation_policy'} as const

export async function getPublishedExperience(db:SqlExecutor,id:string,actor?:SessionContext) {
  if(!identifier.test(id))return null
  let commercial=false
  if(actor?.authenticated && actor.role==='Tour_Agency' && actor.agencyId && actor.userId) {
    const permitted=await db.query('SELECT 1 FROM public.agency_profiles a JOIN public.user_accounts u ON u.user_id=a.user_id WHERE a.agency_id=$1 AND u.user_id=$2 AND u.role_code=$3 AND u.account_status=$4',[actor.agencyId,actor.userId,'Tour_Agency','Approved'])
    commercial=permitted.rowCount===1
  }
  const result=await db.query(`SELECT e.experience_id,e.provider_id,e.name,e.description,e.category,
    e.duration_minutes,e.max_participants,e.price_per_person,pv.business_name,v.name AS village_name
    FROM public.experiences e JOIN public.provider_profiles p ON p.provider_id=e.provider_id
    JOIN public.provider_profile_versions pv ON pv.provider_id=p.provider_id AND pv.version_no=p.published_version_no
    JOIN public.villages v ON v.village_id=p.village_id JOIN public.user_accounts u ON u.user_id=p.user_id
    WHERE e.experience_id=$1 AND e.archived_at IS NULL AND p.verification_status='Verified'
      AND pv.version_status='Verified' AND v.is_active=true AND u.account_status='Active'`,[id])
  const row=result.rows[0]
  return row?{id:row.experience_id as string,provider_id:row.provider_id as string,name:row.name as string,
    description:row.description as string,type:row.category as string,provider_name:row.business_name as string,
    village_name:row.village_name as string,duration_minutes:Number(row.duration_minutes),max_participants:Number(row.max_participants),
    price:commercial?Number(row.price_per_person):null}:null
}

export async function updatePostgresExperience(db:DbClient,id:string,actor:SessionContext,input:unknown) {
  if(!actor.authenticated||actor.role!=='Local_Provider'||!actor.providerId||!actor.userId)throw new PostgresExperienceError('Only the owning Provider may edit Experiences',403)
  if(!identifier.test(id))throw new PostgresExperienceError('Experience not found',404)
  const parsed=ExperienceUpdateSchema.safeParse(input)
  if(!parsed.success)throw new PostgresExperienceError('Invalid Experience fields',400)
  const data=parsed.data
  // Media has its own storage migration; refuse unsupported writes instead of silently losing them.
  if(data.images!==undefined)throw new PostgresExperienceError('Media writes are not enabled in the PostgreSQL terms slice',409)
  for(const rules of [data.group_discounts,data.special_rates])if(rules && new Set(rules.map(rule=>rule.pax_threshold)).size!==rules.length)throw new PostgresExperienceError('Discount thresholds must be unique',400)
  return db.transaction(async tx=>{
    const result=await tx.query(`SELECT e.* FROM public.experiences e JOIN public.provider_profiles p ON p.provider_id=e.provider_id
      JOIN public.user_accounts u ON u.user_id=p.user_id
      WHERE e.experience_id=$1 AND e.provider_id=$2 AND u.user_id=$3 AND u.role_code='Local_Provider' AND u.account_status='Active' FOR UPDATE OF e`,[id,actor.providerId,actor.userId])
    const stored=result.rows[0]
    if(!stored)throw new PostgresExperienceError('Experience not found for this Provider',404)
    const active=await tx.query("SELECT 1 FROM public.bookings WHERE experience_id=$1 AND status IN ('On hold','Booked') LIMIT 1",[id])
    if(active.rowCount)for(const key of ['price_per_person','duration_minutes','max_participants','experience_location_address'] as const){
      if(data[key]!==undefined && (key==='experience_location_address'?data[key]!==stored[key]:Number(data[key])!==Number(stored[key])))throw new PostgresExperienceError('Active Booking Field Locked',409)
    }
    const assignments:string[]=[],params:unknown[]=[]
    for(const [field,column] of Object.entries(columns)) {
      const value=data[field as keyof typeof columns]
      if(value===undefined)continue
      params.push(field==='cancellation_policy'?JSON.stringify(value):value)
      assignments.push(`"${column}"=$${params.length}${field==='cancellation_policy'?'::jsonb':''}`)
    }
    if(assignments.length){params.push(id);await tx.query(`UPDATE public.experiences SET ${assignments.join(',')},updated_at=now() WHERE experience_id=$${params.length}`,params)}
    for(const [field,kind] of [['group_discounts','Group Discount'],['special_rates','Special Rate']] as const) {
      const rules=data[field];if(rules===undefined)continue
      await tx.query('DELETE FROM public.experience_discount_rules WHERE experience_id=$1 AND rule_kind=$2',[id,kind])
      for(const rule of rules)await tx.query('INSERT INTO public.experience_discount_rules(rule_id,experience_id,rule_kind,pax_threshold,discount_percentage) VALUES(gen_random_uuid(),$1,$2,$3,$4)',[id,kind,rule.pax_threshold,rule.discount_percentage])
    }
    await tx.query("INSERT INTO public.audit_logs(audit_id,actor_user_id,action,target_type,target_id,occurred_at,change_or_result) VALUES(gen_random_uuid(),$1,'UPDATE_EXPERIENCE','Experience',$2,now(),$3::jsonb)",[actor.userId,id,JSON.stringify({updatedFields:Object.keys(data)})])
    return {updated:true,provider_verification_status:'Verified',reverification_triggered:false}
  })
}
