import { describe, it, expect } from 'vitest'
import {
  getSeedUsers,
  getSeedAgencies,
  getSeedProviders,
  findAgencyByUserId,
  findProviderByUserId,
} from '@/lib/iac/seed-accessor'

describe('T003 | Seed Data Verification for IAC', () => {
  it('loads real user accounts from data/seed/user_accounts.csv', () => {
    const users = getSeedUsers()
    expect(users.length).toBeGreaterThan(0)

    const tourAgencies = users.filter(u => u.role_code === 'Tour_Agency')
    const localProviders = users.filter(u => u.role_code === 'Local_Provider')

    expect(tourAgencies.length).toBeGreaterThanOrEqual(1)
    expect(localProviders.length).toBeGreaterThanOrEqual(1)
  })

  it('contains approved Tour Agency accounts with matching agency profiles', () => {
    const agencies = getSeedAgencies()
    expect(agencies.length).toBeGreaterThan(0)

    const firstAgency = agencies[0]
    expect(firstAgency.agency_id).toBeTruthy()
    expect(firstAgency.company_name).toBeTruthy()

    const agencyUser = findAgencyByUserId(firstAgency.user_id)
    expect(agencyUser).toBeDefined()
  })

  it('contains verified Local Provider accounts with matching provider profiles', () => {
    const providers = getSeedProviders()
    expect(providers.length).toBeGreaterThan(0)

    const verified = providers.filter(p => p.verification_status === 'Verified')
    expect(verified.length).toBeGreaterThanOrEqual(1)

    const sample = verified[0]
    expect(sample.provider_id).toBeTruthy()
    expect(sample.business_name).toBeTruthy()

    const providerUser = findProviderByUserId(sample.user_id)
    expect(providerUser).toBeDefined()
  })
})

