import { NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

/** Canonical session endpoint. Authentication adapters may change; this response contract does not. */
export async function GET(request: Request) {
  return NextResponse.json({ data: { session: (await sessionContextFromRequest(request)) } })
}
