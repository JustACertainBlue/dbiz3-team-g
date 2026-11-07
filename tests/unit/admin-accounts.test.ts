import { describe, it, expect } from 'vitest'
import { listAccounts, accountAction } from '../../src/lib/auth/admin-accounts'
import { demoSessionContextFor } from '../../src/lib/auth/session'
import { demoRepository } from '../../src/lib/demo/json-repository'

describe('admin account scope and lifecycle', () => {
  it('rejects guests and missing permission', async () => {
    ;(await expect(async () => (await listAccounts((await demoSessionContextFor('guest'))))).rejects.toThrow('FORBIDDEN'))
    ;(await expect(async () => (await listAccounts({ ...(await demoSessionContextFor('hdt')), permissions: [] }))).rejects.toThrow('FORBIDDEN'))
  })
  it('restricts UBND to providers in its own village', async () => {
    const actor = (await demoSessionContextFor('ubnd'))
    const users = (await listAccounts(actor))
    expect(users.length).toBeGreaterThan(0)
    for (const user of users) {
      expect(user.role).toBe('Local_Provider')
      expect(demoRepository().find('provider_profiles', row => row.user_id === user.user_id)?.village_id).toBe(actor.assignedVillageId)
    }
    ;(await expect(async () => (await accountAction(actor, (await demoSessionContextFor('provider')).userId!, 'disable'))).rejects.toThrow('FORBIDDEN'))
  })
  it('revokes sessions, restores exact prior status and preserves business profiles', async () => {
    const actor = (await demoSessionContextFor('hdt'))
    const target = (await demoSessionContextFor('agency')).userId!
    const repo = demoRepository()
    const profiles = repo.snapshot(['agency_profiles', 'provider_profiles'])
    const previous = repo.find('user_accounts', row => row.user_id === target)!.account_status
    ;(await accountAction(actor, target, 'disable'))
    expect(repo.all('sessions').filter(row => row.user_id === target && !row.revoked_at)).toEqual([])
    expect(repo.find('user_accounts', row => row.user_id === target)?.account_status).toBe('Disabled')
    ;(await accountAction(actor, target, 'enable'))
    expect(repo.find('user_accounts', row => row.user_id === target)?.account_status).toBe(previous)
    expect(repo.snapshot(['agency_profiles', 'provider_profiles'])).toEqual(profiles)
  })
})
