import { NextResponse } from 'next/server'

export const GENERIC_ERROR_TEXT = 'Đã xảy ra lỗi kỹ thuật. Vui lòng thử lại sau.'

/**
 * Error answer of an AIT route. An error the route expects (a handoff refusal, a text validation
 * error) keeps its own message and status; anything else is logged on the server and the browser only
 * gets a generic text, so database or host details never leave the server.
 */
export function errorResponse(
  err: unknown,
  label: string,
  expected?: (err: unknown) => { status: number } | null
): NextResponse {
  const known = expected?.(err)
  if (known) {
    return NextResponse.json({ error: err instanceof Error ? err.message : GENERIC_ERROR_TEXT }, { status: known.status })
  }
  console.error(`[AIT] ${label} failed: ${err instanceof Error ? err.name : 'UnknownError'}`)
  return NextResponse.json({ error: GENERIC_ERROR_TEXT, error_code: 'INTERNAL_ERROR' }, { status: 500 })
}
