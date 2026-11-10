import { beforeEach, describe, expect, it } from 'vitest'
import { POST as changePasswordRoute } from '@/app/api/auth/change-password/route'
import { authenticateAccount } from '@/lib/auth/product-session'
import { hashPassword, verifyPassword } from '@/lib/auth/password'
import { demoRepository } from '@/lib/demo/json-repository'

// Issue #61. spec-AUT US-5 AS-2: "Given the current password is incorrect, then no change is made and an error is
// shown." FR-014 §5.1 error_message Enum[Current password incorrect, New password does not meet requirements,
// Passwords do not match]. Through POST /api/auth/change-password as the demo Agency (thanhvien13), whose seed
// hash is replaced by a real one so the current password can be checked.
const EMAIL = 'thanhvien13@example.invalid'
const CURRENT = 'Current#2026a'
const NEW = 'Changed#2026b'
const repo = () => demoRepository()
const account = () => repo().find('user_accounts', row => row.email === EMAIL)!
const openSessions = () => repo().all('sessions').filter(row => row.user_id === account().user_id && !row.revoked_at).length
const changes = () => repo().all('audit_logs').filter(row => row.action === 'PASSWORD_CHANGED' && row.actor_user_id === account().user_id).length

async function change(current: string, password = NEW, confirmation = password) {
  const response = await changePasswordRoute(new Request('http://localhost:3000/api/auth/change-password', {
    method: 'POST', headers: { cookie: 'hab_demo_account=agency', 'content-type': 'application/json' },
    body: JSON.stringify({ current_password: current, new_password: password, confirm_password: confirmation }),
  }))
  return { status: response.status, body: await response.json() as any }
}

describe('#61 spec-AUT US-5 AS-2 / FR-014 | Change Password with an incorrect current password', () => {
  let hashBefore = '', sessionsBefore = 0
  beforeEach(async () => {
    repo().reset()
    repo().update('user_accounts', row => row.email === EMAIL, { password_hash: await hashPassword(CURRENT), must_change_password: 'false' })
    hashBefore = account().password_hash
    expect((await authenticateAccount(EMAIL, CURRENT)).ok).toBe(true) // at least one open session to watch
    sessionsBefore = openSessions()
    expect(sessionsBefore).toBeGreaterThan(0)
  })

  it('US-5 AS-1 (normal): the correct current password and a valid new one update the password, record it and end open sessions', async () => {
    const res = await change(CURRENT)
    expect(res.status).toBe(200)
    expect(await verifyPassword(NEW, account().password_hash)).toBe(true)
    expect(changes()).toBe(1)
    expect(openSessions()).toBe(0)
  })

  it('US-5 AS-2 (error): a wrong current password changes nothing and returns "Current password incorrect"', async () => {
    const res = await change('Wrong#2026x')
    expect(res.status).toBe(400)
    expect(res.body.error_message).toBe('Current password incorrect')
    expect(account().password_hash).toBe(hashBefore)
    expect(await verifyPassword(CURRENT, account().password_hash)).toBe(true)
    expect(changes()).toBe(0)
    expect(openSessions()).toBe(sessionsBefore)
  })

  it.each([
    ['different letter case', CURRENT.toLowerCase()],
    ['a trailing space', `${CURRENT} `],
    ['empty', ''],
  ])('US-5 AS-2 (boundary): a current password with %s is incorrect; nothing changes', async (_label, current) => {
    const res = await change(current)
    expect(res.status).toBe(400)
    expect(res.body.error_message).toBe('Current password incorrect')
    expect(account().password_hash).toBe(hashBefore)
    expect(openSessions()).toBe(sessionsBefore)
  })

  it('US-5 AS-2 (boundary): repeated wrong attempts never change the password; the right one still works afterwards', async () => {
    for (let i = 0; i < 3; i++) expect((await change(`Wrong#2026${i}`)).status).toBe(400)
    expect(account().password_hash).toBe(hashBefore)
    expect((await change(CURRENT)).status).toBe(200)
  })
})
