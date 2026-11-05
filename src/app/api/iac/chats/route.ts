import { NextResponse } from 'next/server'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { ChatError } from '@/lib/iac/chat-access'
import { chatErrorResponse } from '@/lib/iac/chat-http'
import { listChats, openChat } from '@/lib/iac/chat-service'

export const dynamic = 'force-dynamic'

// F-CHAT-03 Chat list (contracts/chat-api.md).
export async function GET(request: Request) {
  try {
    return NextResponse.json({ data: { chat_list: listChats(demoSessionFromRequest(request)) } })
  } catch (error) {
    return chatErrorResponse(error)
  }
}

// F-CHAT-01 from a Booking (BKG135 / BKG138). Explore and AIT open through their handoff routes.
export async function POST(request: Request) {
  try {
    const session = demoSessionFromRequest(request)
    const body = await request.json().catch(() => null) as { source?: unknown; booking_id?: unknown } | null
    if (body?.source !== 'Booking') {
      // Authorize first: a denied actor gets 403 whatever the body says (#27).
      listChats(session)
      throw new ChatError('VALIDATION_ERROR', 'Only source Booking can be opened here')
    }
    const bookingId = typeof body.booking_id === 'string' ? body.booking_id : undefined
    return NextResponse.json({ data: await openChat(session, { source: 'Booking', bookingId }) })
  } catch (error) {
    return chatErrorResponse(error)
  }
}
