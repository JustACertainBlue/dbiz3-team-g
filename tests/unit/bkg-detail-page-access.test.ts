import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { canManageBooking, canViewAgencyBooking } from '@/lib/booking/booking-access'

// T030: page gates for BKG135/BKG144/BKG136 (Provider) and BKG138 (Agency); BR-001, BR-002, BR-008, BR-014.
const OWN_PROVIDER = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const OTHER_PROVIDER = '70efa801-a908-5e16-8510-fd094fbdc020'
const HONG_HA = 'ebf4fcfa-1013-5ecd-b7c6-e0d8e9fa0277'
const booking = (id: string) => demoRepository().find('bookings', r => r.booking_id === id)!
const own = () => booking('4bf17b30-9819-5c47-b745-06be7171087b') // Provider 50f2c8fc, Agency ebf4fcfa
const othersBooking = () => booking('54d7a276-90a2-5c70-be22-cb59ea95ea14') // Provider 70efa801
const hongHa = { ...DEMO_IDENTITIES.agency, agencyId: HONG_HA }

describe('T030 | canManageBooking / canViewAgencyBooking', () => {
  beforeEach(() => demoRepository().reset())

  it('Provider: own Booking on own URL only', () => {
    expect(canManageBooking(DEMO_IDENTITIES.provider, OWN_PROVIDER, own())).toBe(true)
    expect(canManageBooking(DEMO_IDENTITIES.provider, OTHER_PROVIDER, own())).toBe(false)
    expect(canManageBooking(DEMO_IDENTITIES.provider, OWN_PROVIDER, othersBooking())).toBe(false)
  })

  it('Agency: own Booking on own URL only', () => {
    expect(canViewAgencyBooking(hongHa, HONG_HA, own())).toBe(true)
    expect(canViewAgencyBooking(DEMO_IDENTITIES.agency, DEMO_IDENTITIES.agency.agencyId!, own())).toBe(false)
    expect(canViewAgencyBooking(DEMO_IDENTITIES.agency, HONG_HA, own())).toBe(false)
  })

  it('an Agency cannot open the Provider screens, a Provider cannot open BKG138', () => {
    expect(canManageBooking(hongHa, OWN_PROVIDER, own())).toBe(false)
    expect(canViewAgencyBooking(DEMO_IDENTITIES.provider, HONG_HA, own())).toBe(false)
  })

  it('UBND, HDT, Guest → false on both gates', () => {
    for (const key of ['ubnd', 'hdt', 'guest'] as const) {
      expect(canManageBooking(DEMO_IDENTITIES[key], OWN_PROVIDER, own())).toBe(false)
      expect(canViewAgencyBooking(DEMO_IDENTITIES[key], HONG_HA, own())).toBe(false)
    }
  })
})
