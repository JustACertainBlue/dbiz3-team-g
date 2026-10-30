import { describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { canOpenCreateBooking } from '@/lib/booking/create-booking'

// T029 (analyze M1): AS-6 / BR-001 on screen BKG134 — only the owning Local Provider may open it.
const OWN_PROVIDER = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374' // DEMO_IDENTITIES.provider
const OTHER_PROVIDER = '70efa801-a908-5e16-8510-fd094fbdc020'

describe('T029 | canOpenCreateBooking', () => {
  it('allows the Local Provider on its own Provider page', () => {
    expect(canOpenCreateBooking(DEMO_IDENTITIES.provider, OWN_PROVIDER)).toBe(true)
  })

  it("denies the Local Provider on another Provider's page", () => {
    expect(canOpenCreateBooking(DEMO_IDENTITIES.provider, OTHER_PROVIDER)).toBe(false)
  })

  it.each(['agency', 'ubnd', 'hdt', 'guest'] as const)('denies %s', key => {
    expect(canOpenCreateBooking(DEMO_IDENTITIES[key], OWN_PROVIDER)).toBe(false)
  })
})
