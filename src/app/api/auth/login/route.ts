import { NextResponse } from 'next/server'
import { DEMO_SESSION_COOKIE } from '@/lib/auth/demo-session'
import { authenticateAccount, PRODUCT_SESSION_COOKIE, PRODUCT_SESSION_TTL_SECONDS, workspacePath } from '@/lib/auth/product-session'
import { sessionContextFor } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown }
  try { body = await request.json() as { email?: unknown; password?: unknown } }
  catch { return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Dữ liệu đăng nhập không hợp lệ.' } }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Dữ liệu đăng nhập không hợp lệ.' } }, { status: 400 })

  const result = await authenticateAccount(typeof body.email === 'string' ? body.email : '', typeof body.password === 'string' ? body.password : '')
  if (!result.ok) {
    const inactive = result.reason === 'ACCOUNT_INACTIVE'
    return NextResponse.json({ error: { code: result.reason, message: inactive ? 'Tài khoản hiện không hoạt động.' : 'Email hoặc mật khẩu không hợp lệ.' } }, { status: inactive ? 403 : 401 })
  }

  const response = NextResponse.json({ data: { session: sessionContextFor(result.identity), redirectTo: workspacePath(result.identity) } })
  response.cookies.set(PRODUCT_SESSION_COOKIE, result.token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: PRODUCT_SESSION_TTL_SECONDS,
  })
  response.cookies.set(DEMO_SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return response
}
