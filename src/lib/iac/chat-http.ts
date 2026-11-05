import { NextResponse } from 'next/server'
import { ChatError } from './chat-access'

/** Error body of contracts/chat-api.md: `{ error: { code, message } }`; an invalid attachment batch adds `file_errors` (#45). */
export function chatErrorResponse(error: unknown) {
  if (error instanceof ChatError) {
    const body = error.fileErrors
      ? { code: error.code, message: error.message, file_errors: error.fileErrors }
      : { code: error.code, message: error.message }
    return NextResponse.json({ error: body }, { status: error.statusCode })
  }
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Chat request failed' } }, { status: 500 })
}
