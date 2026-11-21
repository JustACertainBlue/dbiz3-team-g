import { NextResponse } from 'next/server'
import { createMatchingSession, listMatchingSessions } from '@/lib/matching/session-service'
import { sessionContextFromRequest } from '@/lib/auth/session'

export async function POST(request: Request) {
  try {
    const session = (await sessionContextFromRequest(request))
    if (!session.authenticated) {
      return NextResponse.json({ error: 'Unauthorized', redirectTo: '/login' }, { status: 401 })
    }
    if (session.role !== 'Tour_Agency' || !session.agencyId) {
      return NextResponse.json({ error: 'AI Matching is only available to Tour Agencies' }, { status: 403 })
    }
    const matchingSession = await createMatchingSession({ agencyId: session.agencyId })
    return NextResponse.json(matchingSession, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

// Screen 22 "Gần đây": the signed-in company's own sessions, newest first, at most 20 (read-only).
export async function GET(request: Request) {
  try {
    const session = (await sessionContextFromRequest(request))
    if (!session.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (session.role !== 'Tour_Agency' || !session.agencyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    return NextResponse.json({ sessions: await listMatchingSessions(session.agencyId, 20) })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
