import { NextRequest, NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { createChatHandoff, createQuoteHandoff, HandoffError, SOURCE_CONTEXTS, type SourceContext } from '@/lib/demo/commercial-handoff-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { action?: 'quote' | 'chat'; experience_id?: string; source_context?: string; chat_source?: string }
    if (!body.experience_id || (body.action !== 'quote' && body.action !== 'chat')) {
      return NextResponse.json({ error: { code: 'INVALID_HANDOFF', message: 'action and experience_id are required' } }, { status: 400 })
    }
    if (body.source_context !== undefined && !(SOURCE_CONTEXTS as readonly string[]).includes(body.source_context)) {
      return NextResponse.json({ error: { code: 'INVALID_HANDOFF', message: 'source_context must be Card or Detail Page (FR-007)' } }, { status: 400 })
    }
    // spec-IAC #19: Explore Experience card/detail → Explore (default); Explore Provider page → Provider Profile.
    if (body.chat_source !== undefined && body.chat_source !== 'Explore' && body.chat_source !== 'Provider Profile') {
      return NextResponse.json({ error: { code: 'INVALID_HANDOFF', message: 'chat_source must be Explore or Provider Profile' } }, { status: 400 })
    }
    const session = (await sessionContextFromRequest(request))
    // FR-007 (spec-EXP #29): the strong action is logged in the Agency's current Explore session.
    const signal = body.source_context
      ? { exploreSessionId: request.cookies.get('explore_session')?.value, sourceContext: body.source_context as SourceContext }
      : undefined
    const context = { source: (body.chat_source ?? 'Explore') as 'Explore' | 'Provider Profile', signal }
    const result = body.action === 'quote'
      ? await createQuoteHandoff(session, body.experience_id, context)
      : await createChatHandoff(session, body.experience_id, context)
    return NextResponse.json({ data: result }, { status: body.action === 'quote' ? 201 : 200 })
  } catch (error) {
    const status = error instanceof HandoffError ? error.statusCode : 500
    return NextResponse.json({ error: { code: 'HANDOFF_FAILED', message: error instanceof Error ? error.message : 'Handoff failed' } }, { status })
  }
}
