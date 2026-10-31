import { describe, it, expect } from 'vitest'
import {
  assertChatParticipantRole,
  validatePairRoles,
  ChatAuthError,
  type AuthContext,
} from '@/lib/iac/auth-guard'
import { getSeedAgencies, getSeedProviders } from '@/lib/iac/seed-accessor'

describe('T007 | Chat Authorization Guard (BR-001, BR-002, BR-003, BR-016)', () => {
  const seedAgencies = getSeedAgencies()
  const seedProviders = getSeedProviders()

  const validAgencyUser = seedAgencies[0].user_id
  const validProviderUser = seedProviders[0].user_id

  it('rejects unauthenticated caller with 401', () => {
    expect(() =>
      assertChatParticipantRole({ userId: '', role: 'TourAgency' } as AuthContext)
    ).toThrowError(ChatAuthError)
  })

  it('rejects Admin role from participating in chat with 403 (BR-001)', () => {
    expect(() =>
      assertChatParticipantRole({ userId: 'admin-uuid', role: 'Admin' } as AuthContext)
    ).toThrowError(/not permitted/i)
  })

  it('rejects Guest role with 403 (BR-001)', () => {
    expect(() =>
      assertChatParticipantRole({ userId: 'guest-uuid', role: 'Guest' } as AuthContext)
    ).toThrowError(/not permitted/i)
  })

  it('allows Tour Agency and Local Provider roles (BR-001)', () => {
    expect(() =>
      assertChatParticipantRole({ userId: validAgencyUser, role: 'TourAgency' })
    ).not.toThrow()

    expect(() =>
      assertChatParticipantRole({ userId: validProviderUser, role: 'LocalProvider' })
    ).not.toThrow()
  })

  it('validates Agency-Provider pair formation (BR-001, BR-016)', () => {
    const initiator: AuthContext = {
      userId: validAgencyUser,
      role: 'TourAgency',
      agencyId: seedAgencies[0].agency_id,
    }

    const pair = validatePairRoles(initiator, seedProviders[0].provider_id)
    expect(pair.agencyId).toBe(seedAgencies[0].agency_id)
    expect(pair.providerId).toBe(seedProviders[0].provider_id)
  })
})

