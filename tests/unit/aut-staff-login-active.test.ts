import { beforeEach, describe, expect, it } from 'vitest'
import { POST as login } from '@/app/api/auth/login/route'
import { PRODUCT_SESSION_COOKIE } from '@/lib/auth/product-session'
import { hashPassword } from '@/lib/auth/password'
import { demoRepository } from '@/lib/demo/json-repository'

// Issue #59. spec-AUT BR-004: "HDT, UBND and Local Provider login requires Active status" (US-2 AS-3).
// Checked through POST /api/auth/login with a real password hash (the production path), for each of the three
// roles, plus the development prototype path for a seeded Provider. A refused login creates no session and
// sets no hab_session cookie. Agencies use Approved and are covered by their own tests.
const PASSWORD = 'Staff#2026ok'
const STAFF = [
  { role: 'HDT', email: 'thanhvien10@example.invalid' },
  { role: 'UBND', email: 'thanhvien1@example.invalid' },
  { role: 'Local Provider', email: 'thanhvien20@example.invalid' },
] as const
const repo = () => demoRepository()
const account = (email: string) => repo().find('user_accounts', row => row.email === email)!
const setAccount = (email: string, changes: Record<string, string>) => repo().update('user_accounts', row => row.email === email, changes)
async function post(email: string, password = PASSWORD) {
  const response = await login(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
  }))
  return { status: response.status, body: await response.json() as any, cookie: response.headers.get('set-cookie') ?? '' }
}
const sessionsOf = (email: string) => repo().all('sessions').filter(row => row.user_id === account(email).user_id).length
const setsSession = (cookie: string) => new RegExp(`${PRODUCT_SESSION_COOKIE}=[^;]+`).test(cookie) && !new RegExp(`${PRODUCT_SESSION_COOKIE}=;`).test(cookie)

describe('#59 spec-AUT BR-004 / US-2 AS-3 | HDT, UBND and Local Provider log in only when Active', () => {
  beforeEach(async () => {
    repo().reset()
    const hash = await hashPassword(PASSWORD)
    for (const { email } of STAFF) setAccount(email, { password_hash: hash, must_change_password: 'false' })
  })

  it.each(STAFF)('BR-004 (normal): an Active $role account with the right password logs in and gets a session', async ({ email }) => {
    const res = await post(email)
    expect(res.status).toBe(200)
    expect(setsSession(res.cookie)).toBe(true)
    expect(sessionsOf(email)).toBe(1)
  })

  it.each(STAFF)('BR-004 (error): a Disabled $role account is refused with ACCOUNT_INACTIVE even with the right password; no session, no cookie', async ({ email }) => {
    setAccount(email, { account_status: 'Disabled' })
    const res = await post(email)
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE')
    expect(setsSession(res.cookie)).toBe(false)
    expect(sessionsOf(email)).toBe(0)
  })

  it.each(STAFF)('BR-004 (boundary): "Approved" is an Agency status and is not Active, so a $role account in Approved is refused', async ({ email }) => {
    setAccount(email, { account_status: 'Approved' })
    const res = await post(email)
    expect(res.status).toBe(403)
    expect(sessionsOf(email)).toBe(0)
  })

  it('BR-004 (boundary, development prototype path): the seeded demo Provider is refused once Disabled, with any password', async () => {
    const demoProvider = 'thanhvien19@example.invalid'
    expect((await post(demoProvider, 'demo')).status).toBe(200)
    setAccount(demoProvider, { account_status: 'Disabled' })
    const res = await post(demoProvider, 'demo')
    expect(res.status).toBe(403)
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE')
  })
})
