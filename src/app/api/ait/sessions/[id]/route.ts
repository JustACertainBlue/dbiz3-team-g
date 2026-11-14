import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import {
  getMatchingSession,
  updateMatchingSessionContext,
  closeMatchingSession,
  getMessages,
} from '@/lib/matching/session-service'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await sessionContextFromRequest(request)
    if (!actor.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (actor.role !== 'Tour_Agency' || !actor.agencyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const session = await getMatchingSession(params.id)
    if (!session || session.agency_id !== actor.agencyId) {
      return NextResponse.json({ error: 'Matching session access denied' }, { status: 403 })
    }

    const messages = await getMessages(params.id)
    return NextResponse.json({ session, messages })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await sessionContextFromRequest(request)
    if (!actor.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (actor.role !== 'Tour_Agency' || !actor.agencyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const session = await getMatchingSession(params.id)
    if (!session || session.agency_id !== actor.agencyId) {
      return NextResponse.json({ error: 'Matching session access denied' }, { status: 403 })
    }

    const body = await request.json().catch(() => null)
    if (body?.context && typeof body.context === 'object') {
      await updateMatchingSessionContext(params.id, body.context)
    }

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const actor = await sessionContextFromRequest(request)
    if (!actor.authenticated) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (actor.role !== 'Tour_Agency' || !actor.agencyId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const session = await getMatchingSession(params.id)
    if (!session || session.agency_id !== actor.agencyId) {
      return NextResponse.json({ error: 'Matching session access denied' }, { status: 403 })
    }

    await closeMatchingSession(params.id)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}

