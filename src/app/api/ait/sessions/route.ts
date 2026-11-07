import { NextResponse } from 'next/server'
import { createMatchingSession } from '@/lib/matching/session-service'
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
