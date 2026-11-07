import { describe, expect, it } from 'vitest'
import { demoSessionContextFor } from '../../src/lib/auth/session'
import { ownAccount, updateOwnAccount } from '../../src/lib/auth/account-service'

describe('personal account access', () => {
  it('rejects unauthenticated reads and writes', async () => {
    const guest = (await demoSessionContextFor('guest'))
    ;(await expect(async () => (await ownAccount(guest))).rejects.toThrow('UNAUTHENTICATED'))
    ;(await expect(async () => (await updateOwnAccount(guest, {}))).rejects.toThrow('UNAUTHENTICATED'))
  })
  it('returns only public account fields and rejects invalid edits', async () => {
    const session = (await demoSessionContextFor('agency'))
    const before = (await ownAccount(session))
    expect(before).not.toHaveProperty('password_hash')
    ;(await expect(async () => (await updateOwnAccount(session, { full_name: '', title: 'Owner', phone: '12' }))).rejects.toThrow('INVALID_ACCOUNT'))
    expect((await ownAccount(session))).toEqual(before)
  })
  it('updates the current account without accepting a different identity or role', async () => {
    const session = (await demoSessionContextFor('agency'))
    const before = (await ownAccount(session))
    const result = (await updateOwnAccount(session, { full_name: 'Synthetic Account', title: 'Representative', phone: '+84912345678', role: 'ADMIN', email: 'changed@example.invalid', user_id: 'other-user' }))
    expect(result.full_name).toBe('Synthetic Account')
    expect(result.role).toBe(before.role)
    expect(result.email).toBe(before.email)
    ;(await updateOwnAccount(session, before))
  })
})
