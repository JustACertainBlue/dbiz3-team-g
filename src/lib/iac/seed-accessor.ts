import { demoRepository } from '@/lib/demo/json-repository'

export interface SeedUser {
  user_id: string
  email: string
  role_code: string
  account_status: string
  full_name: string
}

export interface SeedAgency {
  agency_id: string
  user_id: string
  company_name: string
}

export interface SeedProvider {
  provider_id: string
  user_id: string
  village_id: string
  verification_status: string
  business_name?: string
}

export function getSeedUsers(): SeedUser[] {
  const rows = demoRepository().all('user_accounts')
  return rows.map(r => ({
    user_id: String(r.user_id),
    email: String(r.email),
    role_code: String(r.role_code),
    account_status: String(r.account_status),
    full_name: String(r.full_name),
  }))
}

export function getSeedAgencies(): SeedAgency[] {
  const rows = demoRepository().all('agency_profiles')
  return rows.map(r => ({
    agency_id: String(r.agency_id),
    user_id: String(r.user_id),
    company_name: String(r.company_name),
  }))
}

export function getSeedProviders(): SeedProvider[] {
  const providers = demoRepository().all('provider_profiles')
  const versions = demoRepository().all('provider_profile_versions')

  return providers.map(p => {
    const version = versions.find(
      v => String(v.provider_id) === String(p.provider_id) && String(v.version_no) === String(p.published_version_no || '1')
    )
    return {
      provider_id: String(p.provider_id),
      user_id: String(p.user_id),
      village_id: String(p.village_id),
      verification_status: String(p.verification_status),
      business_name: version ? String(version.business_name) : undefined,
    }
  })
}

export function findUserById(userId: string): SeedUser | undefined {
  return getSeedUsers().find(u => u.user_id === userId)
}

export function findAgencyByUserId(userId: string): SeedAgency | undefined {
  return getSeedAgencies().find(a => a.user_id === userId)
}

export function findAgencyById(agencyId: string): SeedAgency | undefined {
  return getSeedAgencies().find(a => a.agency_id === agencyId)
}

export function findProviderByUserId(userId: string): SeedProvider | undefined {
  return getSeedProviders().find(p => p.user_id === userId)
}

export function findProviderById(providerId: string): SeedProvider | undefined {
  return getSeedProviders().find(p => p.provider_id === providerId)
}

