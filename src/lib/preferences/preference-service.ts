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

const agencyProfiles = new Map<string, AgencyPreferenceProfile>()

export async function saveAgencyPreferenceProfile(params: {
  agencyId: string
  sessionId?: string
  tourPreferenceProfile: any
}): Promise<AgencyPreferenceProfile> {
  const existing = agencyProfiles.get(params.agencyId)
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

  agencyProfiles.set(params.agencyId, profile)
  return profile
}

export async function getAgencyPreferenceProfile(
  agencyId: string
): Promise<AgencyPreferenceProfile | null> {
  return agencyProfiles.get(agencyId) || null
}

export async function updateAgencyPreferencesFromSignals(
  agencyId: string,
  signals: ReweightedSignal[]
): Promise<AgencyPreferenceProfile> {
  let profile = agencyProfiles.get(agencyId)
  if (!profile) {
    profile = {
      agency_id: agencyId,
      affinity_tags: {},
      updated_at: new Date().toISOString(),
    }
    agencyProfiles.set(agencyId, profile)
  }

  for (const s of signals) {
    const key = String(s.signal.value)
    const delta = s.signal.signal_type.includes('Positive') ? s.weight : -s.weight
    profile.affinity_tags[key] = (profile.affinity_tags[key] || 0) + delta
  }

  profile.updated_at = new Date().toISOString()
  return profile
}

export async function rerankExploreForAgency(
  agencyId: string,
  catalog: any[]
): Promise<ExploreRerankItem[]> {
  const profile = agencyProfiles.get(agencyId)
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
