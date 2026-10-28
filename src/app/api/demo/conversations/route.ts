import { NextRequest, NextResponse } from 'next/server'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { HandoffError, listConversations } from '@/lib/demo/commercial-handoff-service'

export function GET(request: NextRequest) {
  try {
    return NextResponse.json({ data: listConversations(demoSessionFromRequest(request)) })
  } catch (error) {
    const status = error instanceof HandoffError ? error.statusCode : 500
    return NextResponse.json({ error: { code: 'CONVERSATIONS_FAILED', message: error instanceof Error ? error.message : 'Unable to load conversations' } }, { status })
  }
}
