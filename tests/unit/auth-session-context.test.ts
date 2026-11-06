import { describe, expect, it } from 'vitest'
import { demoSessionContextFor } from '@/lib/auth/session'

describe('AUT SessionContext demo adapter', () => {
  it('maps Guest to an unauthenticated, unscoped context', () => {
    expect(demoSessionContextFor('guest')).toEqual({
      authenticated: false, userId: null, role: null, adminType: null, agencyId: null, providerId: null,
      assignedVillageId: null, permissions: [], dataScope: null,
    })
  })

  it('maps Tour Agency to its organization and seeded permissions', () => {
    expect(demoSessionContextFor('agency')).toMatchObject({
      authenticated: true, role: 'Tour_Agency', adminType: null, agencyId: '02e568d8-d65e-54b1-a554-b411150d1dcb',
      providerId: null, assignedVillageId: null, dataScope: 'Own organization',
      permissions: ['manage_profile', 'use_chat', 'use_matching'],
    })
  })

  it('maps Local Provider to its organization and seeded permissions', () => {
    expect(demoSessionContextFor('provider')).toMatchObject({
      authenticated: true, role: 'Local_Provider', adminType: null, agencyId: null,
      providerId: '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374', assignedVillageId: null,
      dataScope: 'Own organization', permissions: ['manage_bookings', 'manage_experiences', 'manage_profile', 'use_chat'],
    })
  })

  it('maps UBND and HDT to ADMIN with different scopes', () => {
    expect(demoSessionContextFor('ubnd')).toMatchObject({
      role: 'ADMIN', adminType: 'UBND', assignedVillageId: '6dfbb5e9-f92e-58a0-b090-d67cea160f62', dataScope: 'Assigned village',
      permissions: ['manage_users', 'review_agencies', 'review_providers', 'view_dashboard'],
    })
    expect(demoSessionContextFor('hdt')).toMatchObject({
      role: 'ADMIN', adminType: 'HDT', assignedVillageId: null, dataScope: 'Platform-wide',
      permissions: ['manage_users', 'review_agencies', 'review_providers', 'view_dashboard'],
    })
  })
})
