import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { getMatchingSession, getMessages } from '@/lib/matching/session-service'

// Screen 22 history: load one matching session with its stored messages (read-only).
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const actor = (await sessionContextFromRequest(request))
    if (!actor.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const session = await getMatchingSession(params.id)
    if (actor.role !== 'Tour_Agency' || !actor.agencyId || session?.agency_id !== actor.agencyId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return NextResponse.json({
      session_id: session.session_id,
      started_at: session.started_at.toISOString(),
      last_activity_at: session.last_activity_at.toISOString(),
      messages: await getMessages(params.id),
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
