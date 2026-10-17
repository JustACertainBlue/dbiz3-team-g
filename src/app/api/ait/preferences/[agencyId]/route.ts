import { NextResponse } from 'next/server'
import {
  getAgencyPreferenceProfile,
  saveAgencyPreferenceProfile,
  rerankExploreForAgency,
} from '@/lib/preferences/preference-service'
import { loadExperiences } from '@/lib/db/seed-loader'

export async function GET(
  request: Request,
  { params }: { params: { agencyId: string } }
) {
  try {
    const profile = await getAgencyPreferenceProfile(params.agencyId)
    const experiences = await loadExperiences()
    const reranked = await rerankExploreForAgency(params.agencyId, experiences)

    return NextResponse.json({
      profile,
      reranked_explore: reranked,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: { agencyId: string } }
) {
  try {
    const body = await request.json()
    const profile = await saveAgencyPreferenceProfile({
      agencyId: params.agencyId,
      sessionId: body.session_id,
      tourPreferenceProfile: body.tour_preference_profile || body,
    })

    const experiences = await loadExperiences()
    const reranked = await rerankExploreForAgency(params.agencyId, experiences)

    return NextResponse.json({
      profile,
      reranked_explore: reranked,
    }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
