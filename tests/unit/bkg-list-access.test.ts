import { describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { authorizeProviderList } from '@/lib/booking/booking-access'

// T003: F-SCHED-10 access (AS-5, #67, BR-001, BR-002, BR-014): provider_id only from the session.
const OWN = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const OTHER = '70efa801-a908-5e16-8510-fd094fbdc020'
const forbidden = (fn: () => Promise<unknown>) => expect(fn).rejects.toThrow(expect.objectContaining({ code: 'FORBIDDEN' }))

describe('T003 | authorizeProviderList', () => {
  it('the owning Local Provider gets its own provider id', async () => {
    expect((await authorizeProviderList(DEMO_IDENTITIES.provider))).toBe(OWN)
    expect((await authorizeProviderList(DEMO_IDENTITIES.provider, OWN))).toBe(OWN)
  })

  it('naming another Provider is forbidden', async () => {
    ;(await forbidden(async () => (await authorizeProviderList(DEMO_IDENTITIES.provider, OTHER))))
  })

  it('Tour Agency, UBND, HDT and Guest are forbidden', async () => {
    for (const key of ['agency', 'ubnd', 'hdt', 'guest'] as const) {
      ;(await forbidden(async () => (await authorizeProviderList(DEMO_IDENTITIES[key]))))
    }
  })
})
