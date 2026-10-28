import { NextResponse } from 'next/server'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { createChatHandoff, HandoffError } from '@/lib/demo/commercial-handoff-service'
import { getMatchingSession } from '@/lib/matching/session-service'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const experienceId = body.experience_id

    if (!experienceId) {
      return NextResponse.json({ error: 'experience_id is required' }, { status: 400 })
    }
    const actor = demoSessionFromRequest(request)
    const matchingSession = await getMatchingSession(params.id)
    if (!matchingSession || matchingSession.agency_id !== actor.agencyId) {
      return NextResponse.json({ error: 'Matching session access denied' }, { status: 403 })
    }
    return NextResponse.json(createChatHandoff(actor, experienceId), { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: err instanceof HandoffError ? err.statusCode : 500 })
  }
}
