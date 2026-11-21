import { NextResponse } from 'next/server'
import { DEMO_SESSION_COOKIE } from '@/lib/auth/demo-session'
import { authenticateAccount, inactiveLoginMessage, PRODUCT_SESSION_COOKIE, PRODUCT_SESSION_REMEMBER_TTL_SECONDS, workspacePath } from '@/lib/auth/product-session'
import { sessionContextFor } from '@/lib/auth/session'
import { registrationStatusForLogin } from '@/lib/auth/registration-status'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  let body: { email?: unknown; password?: unknown; remember?: unknown }
  try { body = await request.json() as { email?: unknown; password?: unknown; remember?: unknown } }
  catch { return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Dữ liệu đăng nhập không hợp lệ.' } }, { status: 400 }) }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return NextResponse.json({ error: { code: 'INVALID_REQUEST', message: 'Dữ liệu đăng nhập không hợp lệ.' } }, { status: 400 })

  const result = await authenticateAccount(typeof body.email === 'string' ? body.email : '', typeof body.password === 'string' ? body.password : '', body.remember === true)
  if (!result.ok) {
    const inactive = result.reason === 'ACCOUNT_INACTIVE'
    // spec-AUT FR-007 §5.1 (#55): error_message ∈ {Invalid credentials, Account not approved, Account disabled};
    // the status is only told after the password matched. error.code stays for existing clients.
    const errorMessage = inactive ? (await inactiveLoginMessage(typeof body.email === 'string' ? body.email : '')) : 'Invalid credentials'
    const message = errorMessage === 'Account disabled' ? 'Tài khoản đã bị vô hiệu hóa.' : errorMessage === 'Account not approved' ? 'Tài khoản chưa được duyệt.' : 'Email hoặc mật khẩu không hợp lệ.'
    // Screens 18b/18c: only after the password matched (ACCOUNT_INACTIVE), and only status, reason, reviewed_at. No session is created.
    const registration_status = inactive && errorMessage === 'Account not approved' ? await registrationStatusForLogin(typeof body.email === 'string' ? body.email : '') : null
    return NextResponse.json({ error: { code: result.reason, message }, error_message: errorMessage, ...(registration_status ? { registration_status } : {}) }, { status: inactive ? 403 : 401 })
  }

  const response = NextResponse.json({ data: { session: (await sessionContextFor(result.identity)), redirectTo: (await workspacePath(result.identity)) } })
  response.cookies.set(PRODUCT_SESSION_COOKIE, result.token, {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/',
    // Not ticked: a session cookie (gone when the browser closes). Ticked: 30 days.
    ...(body.remember === true ? { maxAge: PRODUCT_SESSION_REMEMBER_TTL_SECONDS } : {}),
  })
  response.cookies.set(DEMO_SESSION_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return response
}
