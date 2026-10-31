import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { authorizeAgencyList, authorizeProviderSchedule } from '@/lib/booking/booking-access'

// T003: F-SCHED-01 access (#74, #24) and F-SCHED-02 access (#33, BR-002, BR-008).
const OWN = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const OTHER = '70efa801-a908-5e16-8510-fd094fbdc020'
const PENDING = '3a5d2ffc-79fa-5b75-a1e6-82beea3bed59' // Pending Verification
const fails = (fn: () => unknown, code: string) => expect(fn).toThrow(expect.objectContaining({ code }))

describe('T003 | authorizeProviderSchedule', () => {
  beforeEach(() => demoRepository().reset())

  it('owner view for the owning Local Provider, public view for a Tour Agency', () => {
    expect(authorizeProviderSchedule(DEMO_IDENTITIES.provider, OWN)).toBe('owner')
    expect(authorizeProviderSchedule(DEMO_IDENTITIES.agency, OWN)).toBe('public')
  })

  it('a non-Verified or unknown Provider is not found for an Agency', () => {
    fails(() => authorizeProviderSchedule(DEMO_IDENTITIES.agency, PENDING), 'NOT_FOUND')
    fails(() => authorizeProviderSchedule(DEMO_IDENTITIES.agency, 'no-such-provider'), 'NOT_FOUND')
  })

  it('another Local Provider, UBND, HDT and Guest are forbidden', () => {
    fails(() => authorizeProviderSchedule(DEMO_IDENTITIES.provider, OTHER), 'FORBIDDEN')
    for (const key of ['ubnd', 'hdt', 'guest'] as const) fails(() => authorizeProviderSchedule(DEMO_IDENTITIES[key], OWN), 'FORBIDDEN')
  })
})

describe('T003 | authorizeAgencyList', () => {
  it('a Tour Agency gets its own agency id; everyone else is forbidden', () => {
    expect(authorizeAgencyList(DEMO_IDENTITIES.agency)).toBe('02e568d8-d65e-54b1-a554-b411150d1dcb')
    for (const key of ['provider', 'ubnd', 'hdt', 'guest'] as const) fails(() => authorizeAgencyList(DEMO_IDENTITIES[key]), 'FORBIDDEN')
  })
})
