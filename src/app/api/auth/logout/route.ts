import { NextResponse } from 'next/server'
import { DEMO_SESSION_COOKIE } from '@/lib/auth/demo-session'
import { PRODUCT_SESSION_COOKIE, revokeProductSession } from '@/lib/auth/product-session'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  ;(await revokeProductSession(request))
  const response = NextResponse.json({ data: { loggedOut: true, redirectTo: '/login' } })
  response.cookies.set(PRODUCT_SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
  response.cookies.set(DEMO_SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return response
}
