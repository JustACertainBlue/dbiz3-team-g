import { loadExperiences, type Experience } from '@/lib/db/seed-loader'
import type { TourPreferenceProfile } from '@/lib/matching/types'

export interface CandidateExperience extends Experience {
  village_id: string
  provider_status?: string
  max_capacity?: number
}

export async function retrieveCandidates(
  profile?: TourPreferenceProfile | any
): Promise<CandidateExperience[]> {
  const experiences = await loadExperiences()

  const candidates: CandidateExperience[] = experiences
    .filter(exp => exp.provider_verification_status === 'Approved' && exp.has_published_profile_version)
    .map(exp => ({
      ...exp,
      village_id: exp.village_id || '20896522-6235-5699-aeaf-f48b8150d895', // default Bat Trang if not specified
      provider_status: 'Verified',
      max_capacity: exp.max_participants,
    }))

  return candidates
}

export const getVerifiedCandidates = retrieveCandidates
