import { describe, expect, it } from 'vitest'
import { demoSessionContextFor } from '../../src/lib/auth/session'
import { ownAccount, updateOwnAccount } from '../../src/lib/auth/account-service'

describe('personal account access', () => {
  it('rejects unauthenticated reads and writes', () => {
    const guest = demoSessionContextFor('guest')
    expect(() => ownAccount(guest)).toThrow('UNAUTHENTICATED')
    expect(() => updateOwnAccount(guest, {})).toThrow('UNAUTHENTICATED')
  })
  it('returns only public account fields and rejects invalid edits', () => {
    const session = demoSessionContextFor('agency')
    const before = ownAccount(session)
    expect(before).not.toHaveProperty('password_hash')
    expect(() => updateOwnAccount(session, { full_name: '', title: 'Owner', phone: '12' })).toThrow('INVALID_ACCOUNT')
    expect(ownAccount(session)).toEqual(before)
  })
  it('updates the current account without accepting a different identity or role', () => {
    const session = demoSessionContextFor('agency')
    const before = ownAccount(session)
    const result = updateOwnAccount(session, { full_name: 'Synthetic Account', title: 'Representative', phone: '+84912345678', role: 'ADMIN', email: 'changed@example.invalid', user_id: 'other-user' })
    expect(result.full_name).toBe('Synthetic Account')
    expect(result.role).toBe(before.role)
    expect(result.email).toBe(before.email)
    updateOwnAccount(session, before)
  })
})
