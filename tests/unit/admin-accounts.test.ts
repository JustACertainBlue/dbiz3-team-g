import { describe, it, expect } from 'vitest'
import { listAccounts, accountAction } from '../../src/lib/auth/admin-accounts'
import { demoSessionContextFor } from '../../src/lib/auth/session'
import { demoRepository } from '../../src/lib/demo/json-repository'

describe('admin account scope and lifecycle', () => {
  it('rejects guests and missing permission', () => {
    expect(() => listAccounts(demoSessionContextFor('guest'))).toThrow('FORBIDDEN')
    expect(() => listAccounts({ ...demoSessionContextFor('hdt'), permissions: [] })).toThrow('FORBIDDEN')
  })
  it('restricts UBND to providers in its own village', () => {
    const actor = demoSessionContextFor('ubnd')
    const users = listAccounts(actor)
    expect(users.length).toBeGreaterThan(0)
    for (const user of users) {
      expect(user.role).toBe('Local_Provider')
      expect(demoRepository().find('provider_profiles', row => row.user_id === user.user_id)?.village_id).toBe(actor.assignedVillageId)
    }
    expect(() => accountAction(actor, demoSessionContextFor('provider').userId!, 'disable')).toThrow('FORBIDDEN')
  })
  it('revokes sessions, restores exact prior status and preserves business profiles', () => {
    const actor = demoSessionContextFor('hdt')
    const target = demoSessionContextFor('agency').userId!
    const repo = demoRepository()
    const profiles = repo.snapshot(['agency_profiles', 'provider_profiles'])
    const previous = repo.find('user_accounts', row => row.user_id === target)!.account_status
    accountAction(actor, target, 'disable')
    expect(repo.all('sessions').filter(row => row.user_id === target && !row.revoked_at)).toEqual([])
    expect(repo.find('user_accounts', row => row.user_id === target)?.account_status).toBe('Disabled')
    accountAction(actor, target, 'enable')
    expect(repo.find('user_accounts', row => row.user_id === target)?.account_status).toBe(previous)
    expect(repo.snapshot(['agency_profiles', 'provider_profiles'])).toEqual(profiles)
  })
})
