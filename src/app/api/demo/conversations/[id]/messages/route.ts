import { NextRequest, NextResponse } from 'next/server'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { HandoffError, sendConversationMessage } from '@/lib/demo/commercial-handoff-service'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json() as { text?: string }
    const message = sendConversationMessage(demoSessionFromRequest(request), params.id, body.text || '')
    return NextResponse.json({ data: message }, { status: 201 })
  } catch (error) {
    const status = error instanceof HandoffError ? error.statusCode : 500
    return NextResponse.json({ error: { code: 'MESSAGE_FAILED', message: error instanceof Error ? error.message : 'Unable to send message' } }, { status })
  }
}
