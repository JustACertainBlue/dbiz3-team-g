import { NextResponse } from 'next/server'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { chatErrorResponse } from '@/lib/iac/chat-http'
import { closeChat } from '@/lib/iac/chat-service'

export const dynamic = 'force-dynamic'

// F-CHAT-04 Close Chat (contracts/close-api.md, spec-IAC FR-004, #29–#32).
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => null) as { close_reason?: unknown } | null
    return NextResponse.json({ data: await closeChat(demoSessionFromRequest(request), params.id, { closeReason: body?.close_reason }) })
  } catch (error) {
    return chatErrorResponse(error)
  }
}
