import { NextResponse } from 'next/server'
import { createMatchingSession } from '@/lib/matching/session-service'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'

export async function POST(request: Request) {
  try {
    const session = demoSessionFromRequest(request)
    if (!session.authenticated) {
      return NextResponse.json({ error: 'Unauthorized', redirectTo: '/login' }, { status: 401 })
    }
    if (session.role !== 'TourAgency' || !session.agencyId) {
      return NextResponse.json({ error: 'AI Matching is only available to Tour Agencies' }, { status: 403 })
    }
    const matchingSession = await createMatchingSession({ agencyId: session.agencyId })
    return NextResponse.json(matchingSession, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
