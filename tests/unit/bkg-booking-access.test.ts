import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES, type ActorSession } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { loadBookingForActor } from '@/lib/booking/booking-access'

// T003: BR-001, BR-002, BR-008, BR-014 — who may load a Booking, and in which view.
const BOOKING = '4bf17b30-9819-5c47-b745-06be7171087b' // Provider 50f2c8fc, Agency ebf4fcfa
const AGENCY_OF_BOOKING = 'ebf4fcfa-1013-5ecd-b7c6-e0d8e9fa0277'

function agencySession(agencyId: string): ActorSession {
  const agency = demoRepository().find('agency_profiles', row => row.agency_id === agencyId)!
  return { authenticated: true, role: 'TourAgency', userId: agency.user_id, agencyId, providerId: null, villageId: null, adminType: null }
}

const otherProvider: ActorSession = {
  authenticated: true, role: 'LocalProvider', userId: 'u', providerId: '70efa801-a908-5e16-8510-fd094fbdc020',
  agencyId: null, villageId: null, adminType: null,
}

describe('T003 | loadBookingForActor', () => {
  beforeEach(() => demoRepository().reset())

  it('gives the owning Local Provider the provider view', () => {
    const result = loadBookingForActor(DEMO_IDENTITIES.provider, BOOKING)
    expect(result.view).toBe('provider')
    expect(result.booking.booking_id).toBe(BOOKING)
  })

  it('gives the owning Tour Agency the agency view', () => {
    expect(loadBookingForActor(agencySession(AGENCY_OF_BOOKING), BOOKING).view).toBe('agency')
  })

  it('denies another Agency (BR-002, BR-008)', () => {
    expect(() => loadBookingForActor(DEMO_IDENTITIES.agency, BOOKING)).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }))
  })

  it('denies another Provider (BR-001)', () => {
    expect(() => loadBookingForActor(otherProvider, BOOKING)).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }))
  })

  it.each(['ubnd', 'hdt', 'guest'] as const)('denies %s (BR-014)', key => {
    expect(() => loadBookingForActor(DEMO_IDENTITIES[key], BOOKING)).toThrow(expect.objectContaining({ code: 'FORBIDDEN' }))
  })

  it('reports an unknown Booking as not found', () => {
    expect(() => loadBookingForActor(DEMO_IDENTITIES.provider, '00000000-0000-4000-8000-000000000000')).toThrow(expect.objectContaining({ code: 'NOT_FOUND' }))
  })
})
