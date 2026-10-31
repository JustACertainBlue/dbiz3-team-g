import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { scheduleEntryFor, showScheduleLink } from '@/lib/booking/provider-schedule'

// T039 (analyze M3; #74, #82): SCH140 entry and the Agency-only "Xem lịch trống" link.
const PROVIDER = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'

describe('T039 | scheduleEntryFor / showScheduleLink', () => {
  beforeEach(() => demoRepository().reset())

  it('routes each actor', () => {
    expect(scheduleEntryFor(DEMO_IDENTITIES.provider, PROVIDER)).toBe('redirect-owner')
    expect(scheduleEntryFor(DEMO_IDENTITIES.agency, PROVIDER)).toBe('public')
    expect(scheduleEntryFor(DEMO_IDENTITIES.agency, '3a5d2ffc-79fa-5b75-a1e6-82beea3bed59')).toBe('not-found')
    expect(scheduleEntryFor(DEMO_IDENTITIES.agency, 'no-such-provider')).toBe('not-found')
    expect(scheduleEntryFor(DEMO_IDENTITIES.provider, '70efa801-a908-5e16-8510-fd094fbdc020')).toBe('denied')
    for (const key of ['ubnd', 'hdt', 'guest'] as const) expect(scheduleEntryFor(DEMO_IDENTITIES[key], PROVIDER)).toBe('denied')
  })

  it('shows the Explore link only to an authenticated Tour Agency', () => {
    expect(showScheduleLink(DEMO_IDENTITIES.agency)).toBe(true)
    for (const key of ['provider', 'ubnd', 'hdt', 'guest'] as const) expect(showScheduleLink(DEMO_IDENTITIES[key])).toBe(false)
  })
})
