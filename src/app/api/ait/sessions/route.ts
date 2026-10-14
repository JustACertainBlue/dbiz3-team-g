import { NextResponse } from 'next/server'
import { createMatchingSession } from '@/lib/matching/session-service'
import { checkAitAccess } from '@/lib/auth/session'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const role = (request.headers.get('x-user-role') || body.role || 'Agency') as string
    const accountId = (request.headers.get('x-account-id') || body.agency_id || 'agency-default') as string

    const access = checkAitAccess({
      role,
      accountId,
      authenticated: role !== 'Guest',
    })

    if (!access.allowed) {
      if (access.redirectTo) {
        return NextResponse.json({ error: 'Unauthorized', redirectTo: access.redirectTo }, { status: 401 })
      }
      return NextResponse.json({ error: 'Forbidden' }, { status: access.statusCode || 403 })
    }

    const session = await createMatchingSession({ agencyId: access.agencyId || accountId })
    return NextResponse.json(session, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
