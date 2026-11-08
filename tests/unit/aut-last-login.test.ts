import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POST as login } from '@/app/api/auth/login/route'
import { GET as listUsers } from '@/app/api/auth/users/route'
import { hashPassword } from '@/lib/auth/password'
import { demoRepository } from '@/lib/demo/json-repository'

// Issue #56. spec-AUT FR-021 §5.1: the account list returns last_login (DateTime; null only if the user never
// logged in); data model (data/04-data-model.md) writes user_accounts.last_login from F-AUTH-07 (log in).
const EMAIL = 'thanhvien14@example.invalid' // seed Tour Agency
const PASSWORD = 'Login#2026ok'
const T0 = new Date('2026-11-08T03:00:00.000Z')
const repo = () => demoRepository()
const account = () => repo().find('user_accounts', row => row.email === EMAIL)!
const post = (password: string) => login(new Request('http://localhost:3000/api/auth/login', {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: EMAIL, password }),
}))

describe('#56 spec-AUT FR-021 / F-AUTH-07 | a successful login records last_login', () => {
  beforeEach(async () => {
    repo().reset()
    repo().update('user_accounts', row => row.email === EMAIL, { password_hash: await hashPassword(PASSWORD), must_change_password: 'false', last_login: '' })
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(T0)
  })
  afterEach(() => vi.useRealTimers())

  it('F-AUTH-07 (normal): a successful login stores the login time, and the HDT account list shows it', async () => {
    expect((await post(PASSWORD)).status).toBe(200)
    expect(account().last_login).toBe(T0.toISOString())
    const users = (await (await listUsers(new Request('http://localhost:3000/api/auth/users', { headers: { cookie: 'hab_demo_account=hdt' } }))).json()).data
    expect(users.find((u: any) => u.email === EMAIL).last_login).toBe(T0.toISOString())
  })

  it('FR-021 (boundary): a later login moves last_login forward to the latest login', async () => {
    await post(PASSWORD)
    vi.setSystemTime(new Date(T0.getTime() + 60_000))
    await post(PASSWORD)
    expect(account().last_login).toBe('2026-11-08T03:01:00.000Z')
  })

  it('FR-021 (boundary): an account that never logged in keeps an empty last_login', () => {
    expect(account().last_login ?? '').toBe('')
  })

  it('F-AUTH-07 (error): a wrong password or a Disabled account does not change last_login', async () => {
    expect((await post('Wrong#2026x')).status).toBe(401)
    repo().update('user_accounts', row => row.email === EMAIL, { account_status: 'Disabled' })
    expect((await post(PASSWORD)).status).toBe(403)
    expect(account().last_login ?? '').toBe('')
  })
})
