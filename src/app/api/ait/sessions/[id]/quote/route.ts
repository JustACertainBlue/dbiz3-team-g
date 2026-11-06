import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { createQuoteHandoff, HandoffError } from '@/lib/demo/commercial-handoff-service'
import { getMatchingSession } from '@/lib/matching/session-service'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Authorize → validate → write (BR-001, BR-002, lesson #15): a denied request writes nothing.
    const actor = sessionContextFromRequest(request)
    if (!actor.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (actor.role !== 'Tour_Agency' || !actor.agencyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    const matchingSession = await getMatchingSession(params.id)
    if (!matchingSession || matchingSession.agency_id !== actor.agencyId) {
      return NextResponse.json({ error: 'Matching session access denied' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    const experienceId = body?.experience_id
    if (!experienceId) {
      return NextResponse.json({ error: 'experience_id is required' }, { status: 400 })
    }
    // spec-IAC #19: source AI Matching with the checked Matching Session.
    return NextResponse.json(await createQuoteHandoff(actor, experienceId, { source: 'AI Matching', matchingSessionId: params.id }), { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: err instanceof HandoffError ? err.statusCode : 500 })
  }
}
