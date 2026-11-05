import { NextResponse } from 'next/server'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { getChatHistory, sendMessage } from '@/lib/iac/chat-service'
import { chatErrorResponse } from '@/lib/iac/chat-http'

export const dynamic = 'force-dynamic'

// F-CHAT-03 history (+ unread reset on the first page, spec-IAC #23).
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const cursor = new URL(request.url).searchParams.get('before_cursor')
    const data = await getChatHistory(demoSessionFromRequest(request), params.id, cursor === null ? {} : { beforeCursor: cursor })
    return NextResponse.json({ data })
  } catch (error) {
    return chatErrorResponse(error)
  }
}

// F-CHAT-02 send.
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json().catch(() => null) as { message_text?: unknown } | null
    const data = await sendMessage(demoSessionFromRequest(request), params.id, body?.message_text)
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    return chatErrorResponse(error)
  }
}
