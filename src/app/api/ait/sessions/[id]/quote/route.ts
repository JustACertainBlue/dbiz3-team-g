import { NextResponse } from 'next/server'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { createQuoteHandoff, HandoffError } from '@/lib/demo/commercial-handoff-service'
import { getMatchingSession } from '@/lib/matching/session-service'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Authorize → validate → write (BR-001, BR-002, lesson #15): a denied request writes nothing.
    const actor = demoSessionFromRequest(request)
    if (!actor.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (actor.role !== 'TourAgency' || !actor.agencyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const matchingSession = await getMatchingSession(params.id)
    if (!matchingSession || matchingSession.agency_id !== actor.agencyId) {
      return NextResponse.json({ error: 'Matching session access denied' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const experienceId = body?.experience_id
    if (!experienceId) {
      return NextResponse.json({ error: 'experience_id is required' }, { status: 400 })
    }
    return NextResponse.json(createQuoteHandoff(actor, experienceId), { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: err instanceof HandoffError ? err.statusCode : 500 })
  }
}
