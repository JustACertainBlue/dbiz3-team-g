import { NextRequest, NextResponse } from 'next/server'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { createChatHandoff, createQuoteHandoff, HandoffError } from '@/lib/demo/commercial-handoff-service'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { action?: 'quote' | 'chat'; experience_id?: string }
    if (!body.experience_id || (body.action !== 'quote' && body.action !== 'chat')) {
      return NextResponse.json({ error: { code: 'INVALID_HANDOFF', message: 'action and experience_id are required' } }, { status: 400 })
    }
    const session = demoSessionFromRequest(request)
    const result = body.action === 'quote'
      ? createQuoteHandoff(session, body.experience_id)
      : createChatHandoff(session, body.experience_id)
    return NextResponse.json({ data: result }, { status: body.action === 'quote' ? 201 : 200 })
  } catch (error) {
    const status = error instanceof HandoffError ? error.statusCode : 500
    return NextResponse.json({ error: { code: 'HANDOFF_FAILED', message: error instanceof Error ? error.message : 'Handoff failed' } }, { status })
  }
}
