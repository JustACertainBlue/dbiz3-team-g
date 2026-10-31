/**
 * T016 — IAC Messages Route: POST /api/iac/sessions/[id]/messages, GET /api/iac/sessions/[id]/messages
 * POST: send a text message to an active session (FR-002, BR-002, BR-006, BR-007, BR-021)
 * GET:  retrieve paginated message history (FR-003, BR-002, BR-014, BR-015, BR-017)
 */

import { NextResponse } from 'next/server'
import { sendMessageSchema, historyQuerySchema } from '@/lib/iac/validators'
import { ChatAuthError, assertChatParticipantRole } from '@/lib/iac/auth-guard'
import { sendMessage, getSessionMessages } from '@/lib/iac/chat-service'
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
// POST /api/iac/sessions/[id]/messages — FR-002: send a message
// ---------------------------------------------------------------------------
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const auth = authContextFromRequest(req)

    if (!auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    assertChatParticipantRole(auth)

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const parsed = sendMessageSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = sendMessage(params.id, auth.userId, parsed.data.message_text)

    return NextResponse.json(result, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof ChatAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ---------------------------------------------------------------------------
// GET /api/iac/sessions/[id]/messages — FR-003: get paginated history
// ---------------------------------------------------------------------------
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
): Promise<Response> {
  try {
    const auth = authContextFromRequest(req)

    if (!auth.userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    assertChatParticipantRole(auth)

    const url = new URL(req.url)
    const queryParams = {
      before_cursor: url.searchParams.get('before_cursor') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    }

    const parsed = historyQuerySchema.safeParse(queryParams)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const result = getSessionMessages(
      params.id,
      auth.userId,
      parsed.data.before_cursor,
      parsed.data.limit
    )

    return NextResponse.json(result, { status: 200 })
  } catch (err: unknown) {
    if (err instanceof ChatAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode })
    }
    const message = err instanceof Error ? err.message : 'Internal error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

