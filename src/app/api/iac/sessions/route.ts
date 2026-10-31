/**
 * T011 — IAC Sessions Route: POST /api/iac/sessions, GET /api/iac/sessions
 * POST: open or reuse an active chat session (FR-001, BR-001, BR-004, BR-005)
 * GET:  list user's chat conversations (FR-003, BR-013, BR-016)
 */

import { NextResponse } from 'next/server'
import { openSessionSchema } from '@/lib/iac/validators'
import { ChatAuthError, validatePairRoles, assertChatParticipantRole } from '@/lib/iac/auth-guard'
import { findOrCreateActiveSession, listUserChats } from '@/lib/iac/chat-service'
import { findAgencyByUserId, findProviderByUserId } from '@/lib/iac/seed-accessor'
import type { AuthContext } from '@/lib/iac/auth-guard'

/** Extracts auth context from x-mock-user-id / x-mock-role test headers. */
function authContextFromRequest(req: Request): AuthContext {
  const userId = req.headers.get('x-mock-user-id') ?? ''
  const role = (req.headers.get('x-mock-role') ?? 'Guest') as AuthContext['role']

  const agencyProfile = findAgencyByUserId(userId)
  const providerProfile = findProviderByUserId(userId)

  return {
    userId,
    role,
    agencyId: agencyProfile?.agency_id,
    providerId: providerProfile?.provider_id,
  }
}

// ---------------------------------------------------------------------------
// POST /api/iac/sessions — FR-001: open or reuse active chat session
// ---------------------------------------------------------------------------
export async function POST(req: Request): Promise<Response> {
  try {
    const auth = authContextFromRequest(req)

    // BR-003: require authenticated user
    if (!auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = openSessionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { recipient_id, source, experience_id, quote_request_id, booking_id } = parsed.data

    // BR-001, BR-016: validate pair roles, resolve agency/provider IDs
    const { agencyId, providerId } = validatePairRoles(auth, recipient_id)

    const result = findOrCreateActiveSession(agencyId, providerId, source, {
      experience_id,
      quote_request_id,
      booking_id,
    })

    return NextResponse.json(result, { status: result.is_new_session ? 201 : 200 })
  } catch (err: unknown) {
    if (err instanceof ChatAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// GET /api/iac/sessions — FR-003: list user's chat conversations
// ---------------------------------------------------------------------------
export async function GET(req: Request): Promise<Response> {
  try {
    const auth = authContextFromRequest(req)

    if (!auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    assertChatParticipantRole(auth)

    const chat_list = listUserChats(auth.userId, auth.role)

    return NextResponse.json({ chat_list }, { status: 200 })
  } catch (err: unknown) {
    if (err instanceof ChatAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

