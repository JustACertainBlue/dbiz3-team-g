import { NextResponse } from 'next/server'
import { createMatchingSession, getAgencyMatchingSessions } from '@/lib/matching/session-service'
import { sessionContextFromRequest } from '@/lib/auth/session'

export async function GET(request: Request) {
  try {
    const session = await sessionContextFromRequest(request)
    if (!session.authenticated) {
      return NextResponse.json({ error: 'Unauthorized', redirectTo: '/login' }, { status: 401 })
    }
    if (session.role !== 'Tour_Agency' || !session.agencyId) {
      return NextResponse.json({ error: 'AI Matching is only available to Tour Agencies' }, { status: 403 })
    }
    const sessions = await getAgencyMatchingSessions(session.agencyId)
    return NextResponse.json({ sessions }, { status: 200 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

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
