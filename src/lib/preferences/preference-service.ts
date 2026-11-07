import { demoRepository } from '../db/application-store'
import type { ReweightedSignal } from '@/lib/decay/time-decay'

export interface AgencyPreferenceProfile {
  agency_id: string
  session_id?: string
  tour_preference_profile?: any
  tourPreferenceProfile?: any
  affinity_tags: Record<string, number>
  updated_at: string
}

export interface ExploreRerankItem {
  experience_id: string
  rank: number
  score: number
  village_name?: string
  category?: string
  [key: string]: any
}

function decode(row:Record<string,string>|undefined):AgencyPreferenceProfile|null {
  if(!row||(!row.matching_context&&!row.affinity_tags))return null
  const context=JSON.parse(row.matching_context||'{}')
  return {...context,agency_id:row.agency_id,affinity_tags:JSON.parse(row.affinity_tags||'{}'),updated_at:row.updated_at}
}
async function changeProfile<T>(agencyId:string,work:(current:AgencyPreferenceProfile|null)=>{profile:AgencyPreferenceProfile;result:T}):Promise<T>{
  return demoRepository().transaction(['agency_preference_profiles'],tables=>{
    const row=tables.agency_preference_profiles.find(row=>row.agency_id===agencyId)
    const {profile,result}=work(decode(row))
    const {affinity_tags,agency_id,updated_at,...context}=profile
    const changes={matching_context:JSON.stringify(context),affinity_tags:JSON.stringify(affinity_tags),updated_at}
    if(row)Object.assign(row,changes)
    else tables.agency_preference_profiles.push({agency_id,preference_weights:'{}',baseline_preference_weights:'{}',...changes})
    return result
  })
}

export async function saveAgencyPreferenceProfile(params: {
  agencyId: string
  sessionId?: string
  tourPreferenceProfile: any
}): Promise<AgencyPreferenceProfile> {
  return changeProfile(params.agencyId,existing=>{
  const affinityTags: Record<string, number> = existing ? { ...existing.affinity_tags } : {}

  // Extract affinities from matching attributes and inferred preferences
  const attrs = params.tourPreferenceProfile?.matching_attributes || []
  for (const a of attrs) {
    const val = typeof a === 'string' ? a : a.value || a.type
    if (val) affinityTags[val] = (affinityTags[val] || 0) + 1.0
  }

  const profile: AgencyPreferenceProfile = {
    agency_id: params.agencyId,
    session_id: params.sessionId,
    tour_preference_profile: params.tourPreferenceProfile,
    tourPreferenceProfile: params.tourPreferenceProfile,
    affinity_tags: affinityTags,
    updated_at: new Date().toISOString(),
  }

  return {profile,result:profile}
  })
}

export async function getAgencyPreferenceProfile(
  agencyId: string
): Promise<AgencyPreferenceProfile | null> {
  return decode(await demoRepository().find('agency_preference_profiles',row=>row.agency_id===agencyId))
}

export async function updateAgencyPreferencesFromSignals(
  agencyId: string,
  signals: ReweightedSignal[]
): Promise<AgencyPreferenceProfile> {
  return changeProfile(agencyId,current=>{
  let profile = current
  if (!profile) {
    profile = {
      agency_id: agencyId,
      affinity_tags: {},
      updated_at: new Date().toISOString(),
    }

  }

  for (const s of signals) {
    const key = String(s.signal.value)
    const delta = s.signal.signal_type.includes('Positive') ? s.weight : -s.weight
    profile.affinity_tags[key] = (profile.affinity_tags[key] || 0) + delta
  }

  profile.updated_at = new Date().toISOString()
  return {profile,result:profile}
  })
}

export async function rerankExploreForAgency(
  agencyId: string,
  catalog: any[]
): Promise<ExploreRerankItem[]> {
  const profile = await getAgencyPreferenceProfile(agencyId)
  const affinities = profile?.affinity_tags || {}

  const scored = catalog.map(item => {
    let boost = 0
    // Check match on category, village_name, or description
    for (const [tag, weight] of Object.entries(affinities)) {
      if (
        (item.category && item.category.toLowerCase().includes(tag.toLowerCase())) ||
        (item.village_name && item.village_name.toLowerCase().includes(tag.toLowerCase())) ||
        (item.experience_id && item.experience_id.toLowerCase().includes(tag.toLowerCase()))
      ) {
        boost += weight * 25
      }
    }

    const baseScore = 80 - (item.global_rank || 1) * 5
    const finalScore = Math.max(10, Math.min(100, baseScore + boost))

    return {
      ...item,
      score: finalScore,
    }
  })

  // Sort descending by personalized score
  scored.sort((a, b) => b.score - a.score)

  return scored.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }))
}
