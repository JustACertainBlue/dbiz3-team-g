import { NextResponse } from 'next/server'
import {
  getAgencyPreferenceProfile,
  saveAgencyPreferenceProfile,
  rerankExploreForAgency,
} from '@/lib/preferences/preference-service'
import { loadExperiences } from '@/lib/db/seed-loader'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'

// AIT BR-001 / BR-015 (checklist §3 #46): only the authenticated Tour Agency itself reads or writes its
// preference profile. Guest → 401, other roles and other Agencies → 403 (as the other AIT routes).
function denied(request: Request, agencyId: string): NextResponse | null {
  const session = demoSessionFromRequest(request)
  if (!session.authenticated) return NextResponse.json({ error: 'Unauthorized', redirectTo: '/login' }, { status: 401 })
  if (session.role !== 'TourAgency' || session.agencyId !== agencyId) {
    return NextResponse.json({ error: 'Only the Tour Agency itself can access its preference profile' }, { status: 403 })
  }
  return null
}

export async function GET(
  request: Request,
  { params }: { params: { agencyId: string } }
) {
  const refusal = denied(request, params.agencyId)
  if (refusal) return refusal
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
  const refusal = denied(request, params.agencyId)
  if (refusal) return refusal
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
