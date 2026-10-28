import { NextRequest, NextResponse } from 'next/server'
import { DEMO_IDENTITIES, DEMO_SESSION_COOKIE, demoSessionFor, type DemoAccountKey } from '@/lib/auth/demo-session'

export const dynamic = 'force-dynamic'

export function GET(request: NextRequest) {
  const key = request.cookies.get(DEMO_SESSION_COOKIE)?.value
  return NextResponse.json({ session: demoSessionFor(key), accounts: Object.values(DEMO_IDENTITIES) })
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { account?: DemoAccountKey }
  if (!body.account || !(body.account in DEMO_IDENTITIES)) {
    return NextResponse.json({ error: { code: 'INVALID_DEMO_ACCOUNT', message: 'Unknown demo account' } }, { status: 400 })
  }
  const response = NextResponse.json({ session: DEMO_IDENTITIES[body.account] })
  response.cookies.set(DEMO_SESSION_COOKIE, body.account, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 12,
  })
  return response
}

export function DELETE() {
  const response = NextResponse.json({ session: DEMO_IDENTITIES.guest })
  response.cookies.set(DEMO_SESSION_COOKIE, 'guest', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return response
}
