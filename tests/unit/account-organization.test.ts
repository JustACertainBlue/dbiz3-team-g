/**
 * Admin header organisation name (human decision 2026-11-18): the account API returns "UBND xã <village name>" for a
 * UBND admin, read from ubnd_village_assignments → villages (read only). HDT is unchanged (empty; the header shows
 * "Sở Du lịch Hà Nội"). Seed: the demo UBND admin b52561f0… is assigned to Hạ Thái.
 */
import { describe, expect, it } from 'vitest'
import { demoSessionContextFor } from '../../src/lib/auth/session'
import { ownAccount } from '../../src/lib/auth/account-service'

describe('ownAccount organisation for admins', () => {
  it('UBND: "UBND xã" + the assigned village name', async () => {
    const session = await demoSessionContextFor('ubnd')
    expect((await ownAccount(session)).organization).toBe('UBND xã Hạ Thái')
  })
  it('HDT: no organisation from the API (unchanged)', async () => {
    const session = await demoSessionContextFor('hdt')
    expect((await ownAccount(session)).organization).toBe('')
  })
  it('UBND without a village assignment: empty, nothing invented', async () => {
    const hdt = await demoSessionContextFor('hdt')
    const ubnd = await demoSessionContextFor('ubnd')
    expect((await ownAccount({ ...ubnd, userId: hdt.userId })).organization).toBe('')
  })
  it('Agency and Provider keep their business name', async () => {
    expect((await ownAccount(await demoSessionContextFor('agency'))).organization).not.toBe('')
    expect((await ownAccount(await demoSessionContextFor('provider'))).organization).toBe('Xưởng thủ công Bát Tràng')
  })
})
