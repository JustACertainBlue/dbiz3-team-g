import { NextResponse } from 'next/server'
import { ChatError } from './chat-access'

/** Error body of contracts/chat-api.md: `{ error: { code, message } }`. */
export function chatErrorResponse(error: unknown) {
  if (error instanceof ChatError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.statusCode })
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Chat request failed' } }, { status: 500 })
}
