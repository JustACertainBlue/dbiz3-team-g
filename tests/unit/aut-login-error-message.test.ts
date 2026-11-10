import { beforeEach, describe, expect, it } from 'vitest'
import { POST as login } from '@/app/api/auth/login/route'
import { hashPassword } from '@/lib/auth/password'
import { demoRepository } from '@/lib/demo/json-repository'

// Issue #55. spec-AUT FR-007: Agency "Approved" only can log in; "Pending Approval" / "Rejected" / "Disabled" →
// deny with message; UBND/HDT/Local Provider "Active" only, "Disabled" → deny. §5.1 FR-007 failure output:
// error_message (Enum[Invalid credentials, Account not approved, Account disabled]).
// A wrong password never reveals the account status. `error.code` stays as before for existing clients.
const PASSWORD = 'Agency#2026ok'
const AGENCY = 'thanhvien14@example.invalid'   // seed Tour_Agency, Approved
const PROVIDER = 'thanhvien20@example.invalid' // seed Local_Provider, Active
const repo = () => demoRepository()
const setAccount = (email: string, changes: Record<string, string>) => repo().update('user_accounts', row => row.email === email, changes)
async function post(email: string, password = PASSWORD) {
  const response = await login(new Request('http://localhost:3000/api/auth/login', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password }),
  }))
  return { status: response.status, body: await response.json() as any }
}

describe('#55 spec-AUT FR-007 §5.1 | login failure error_message per account status', () => {
  beforeEach(async () => {
    repo().reset()
    const hash = await hashPassword(PASSWORD)
    for (const email of [AGENCY, PROVIDER]) setAccount(email, { password_hash: hash, must_change_password: 'false' })
  })

  it('FR-007 (normal): an Approved Agency logs in and the response has no error_message', async () => {
    const res = await post(AGENCY)
    expect(res.status).toBe(200)
    expect(res.body.error_message).toBeUndefined()
  })

  it.each(['Pending Approval', 'Rejected'])('FR-007 (boundary): an Agency in %s is told "Account not approved"', async status => {
    setAccount(AGENCY, { account_status: status })
    const res = await post(AGENCY)
    expect(res.status).toBe(403)
    expect(res.body.error_message).toBe('Account not approved')
    expect(res.body.error.message).toMatch(/chưa được duyệt/)
  })

  it.each([AGENCY, PROVIDER])('FR-007 (boundary): a Disabled account (%s) is told "Account disabled"', async email => {
    setAccount(email, { account_status: 'Disabled' })
    const res = await post(email)
    expect(res.status).toBe(403)
    expect(res.body.error_message).toBe('Account disabled')
    expect(res.body.error.message).toMatch(/vô hiệu hóa/)
  })

  it('FR-007 (error): a wrong password or an unknown email gives "Invalid credentials", and a wrong password on a Disabled or Pending account does not reveal its status', async () => {
    expect((await post(AGENCY, 'Wrong#2026ok')).body.error_message).toBe('Invalid credentials')
    expect((await post('nobody@example.invalid')).body.error_message).toBe('Invalid credentials')
    setAccount(AGENCY, { account_status: 'Pending Approval' })
    setAccount(PROVIDER, { account_status: 'Disabled' })
    for (const email of [AGENCY, PROVIDER]) {
      const res = await post(email, 'Wrong#2026ok')
      expect(res.status, email).toBe(401)
      expect(res.body.error_message, email).toBe('Invalid credentials')
    }
  })
})
