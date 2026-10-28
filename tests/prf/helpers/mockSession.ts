/**
 * T004 – Mock session factory for PRF tests
 * Produces typed session objects for each actor role without a real auth server.
 *
 * Constitution IV: No real personal data. Session values use seed UUIDs only.
 * Note (analyze finding I2): this helper is intentionally minimal so it cannot
 * mask real auth errors — it produces plain objects, not JWT tokens.
 */

export type ActorRole =
  | 'Guest'
  | 'TourAgency'
  | 'LocalProvider'
  | 'UBND'
  | 'HDT'

export interface MockSession {
  role: ActorRole
  userId: string | null
  agencyId: string | null
  providerId: string | null
  adminType: 'HDT' | 'UBND' | null
  /** Assigned village for UBND actors (from seed ubnd_village_assignments.csv) */
  villageId: string | null
  authenticated: boolean
}

/** Seed UUIDs from data/seed/ — real values, not invented */
const SEED_IDS = {
  // agency_profiles.csv – first agency
  agency1: '02e568d8-d65e-54b1-a554-b411150d1dcb',
  // user_accounts.csv – agency owner for agency1
  agencyUser1: 'ac233721-7dd3-5466-941b-dc7d5d1b0bfa',
  // provider_profiles.csv – Verified provider
  provider1Verified: '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374',
  provider1VerifiedUserId: 'c2c7fe0d-e2cb-5402-ac90-3cd427c2e669',
  // provider_profiles.csv – Draft provider
  providerDraft: 'c8e989d4-88be-5b00-8382-a41177c4c16d',
  providerDraftUserId: '48255ede-2e52-565b-8369-4547416e6e8d',
  // provider_profiles.csv – Pending Verification provider
  providerPending: '3a5d2ffc-79fa-5b75-a1e6-82beea3bed59',
  // villages.csv – village of provider1Verified (Bát Tràng: 20896522-6235-5699-aeaf-f48b8150d895)
  village1: '20896522-6235-5699-aeaf-f48b8150d895',
  // villages.csv – a different village
  village2: 'e482884e-7190-56cf-bc03-4e69614b1fe5',
  // ubnd_village_assignments.csv – UBND user assigned to village1
  ubndUserId: 'ubnd-user-001',
  // HDT admin
  hdtUserId: 'hdt-user-001',
} as const

export function guestSession(): MockSession {
  return {
    role: 'Guest',
    userId: null,
    agencyId: null,
    providerId: null,
    adminType: null,
    villageId: null,
    authenticated: false,
  }
}

export function agencyOwnerSession(
  agencyId: string = SEED_IDS.agency1,
  userId: string = SEED_IDS.agencyUser1,
): MockSession {
  return {
    role: 'TourAgency',
    userId,
    agencyId,
    providerId: null,
    adminType: null,
    villageId: null,
    authenticated: true,
  }
}

export function providerSession(
  providerId: string = SEED_IDS.provider1Verified,
  userId: string = SEED_IDS.provider1VerifiedUserId,
): MockSession {
  return {
    role: 'LocalProvider',
    userId,
    agencyId: null,
    providerId,
    adminType: null,
    villageId: null,
    authenticated: true,
  }
}

export function ubndSession(
  assignedVillageId: string = SEED_IDS.village1,
  userId: string = SEED_IDS.ubndUserId,
): MockSession {
  return {
    role: 'UBND',
    userId,
    agencyId: null,
    providerId: null,
    adminType: 'UBND',
    villageId: assignedVillageId,
    authenticated: true,
  }
}

export function hdtSession(
  userId: string = SEED_IDS.hdtUserId,
): MockSession {
  return {
    role: 'HDT',
    userId,
    agencyId: null,
    providerId: null,
    adminType: 'HDT',
    villageId: null,
    authenticated: true,
  }
}

export { SEED_IDS }
