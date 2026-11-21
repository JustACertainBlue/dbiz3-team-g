/** Screen 15 (png/15) "Ghi nhớ đăng nhập": unticked = session cookie; ticked = 30 days, cookie and server session alike. */
import { beforeEach, describe, expect, it } from 'vitest'
import { POST as login } from '@/app/api/auth/login/route'
import { hashPassword } from '@/lib/auth/password'
import { demoRepository } from '@/lib/demo/json-repository'

const PASSWORD = 'Agency#2026ok'
const AGENCY = 'thanhvien14@example.invalid'
async function post(extra: Record<string, unknown>) {
  const response = await login(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: AGENCY, password: PASSWORD, ...extra }),
  }))
  return { status: response.status, cookie: response.headers.get('set-cookie') ?? '' }
}
const lastSession = () => demoRepository().all('sessions').slice(-1)[0]
const days = (iso: string) => (Date.parse(iso) - Date.now()) / 86400000

describe('login remember-me', () => {
  beforeEach(async () => {
    demoRepository().reset()
    demoRepository().update('user_accounts', row => row.email === AGENCY, { password_hash: await hashPassword(PASSWORD), must_change_password: 'false' })
  })
  it('not ticked: a session cookie (no Max-Age) and the 12 hour server session as before', async () => {
    const res = await post({})
    expect(res.status).toBe(200)
    expect(res.cookie).toContain('hab_session=')
    expect(res.cookie).not.toMatch(/Max-Age=(?!0)/i)
    expect(days(lastSession().expires_at)).toBeLessThan(1)
  })
  it('remember false behaves like not ticked', async () => {
    expect((await post({ remember: false })).cookie).not.toMatch(/hab_session=[^;]+;.*Max-Age=\d{4,}/i)
  })
  it('ticked: a 30 day cookie and a 30 day server session', async () => {
    const res = await post({ remember: true })
    expect(res.cookie).toMatch(/hab_session=[^;]+;[^]*Max-Age=2592000/i)
    expect(days(lastSession().expires_at)).toBeGreaterThan(29.9)
    expect(days(lastSession().expires_at)).toBeLessThan(30.1)
  })
  it('only the boolean true counts (the string "false" does not)', async () => {
    expect((await post({ remember: 'false' })).cookie).not.toContain('Max-Age=2592000')
  })
})
