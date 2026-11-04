/**
 * Admin Mock Session Helper
 * Supports HDT Admin and UBND Admin personas for testing ADM079 dashboard endpoints.
 * Aligned with contracts/admin-dashboard-api.md and Constitution Principle IV (no real personal data).
 */

export interface MockAdminSession {
  role: string
  adminType: 'HDT' | 'UBND' | null
  villageId: string | null
  userId: string | null
  authenticated: boolean
}

export const SEED_ADMIN_IDS = {
  // Bát Tràng Village
  batTrangVillageId: '20896522-6235-5699-aeaf-f48b8150d895',
  // Vạn Phúc Village
  vanPhucVillageId: 'c0d0d95f-d59c-5c35-946a-f397e380dd14',
  // Chuông Village
  chuongVillageId: '688d408b-9d98-5b66-bfa7-659a67462108',
  // Hạ Thái Village — the UBND demo identity on main (ubnd_village_assignments.csv:6)
  haThaiVillageId: '6dfbb5e9-f92e-58a0-b090-d67cea160f62',
  // UBND user assigned to Bát Tràng (ubnd_village_assignments.csv)
  ubndUserId: 'ubnd-user-001',
  // HDT platform administrator
  hdtUserId: 'hdt-user-001',
} as const

export function createHdtSession(userId: string = SEED_ADMIN_IDS.hdtUserId): MockAdminSession {
  return {
    role: 'ADMIN',
    adminType: 'HDT',
    villageId: null,
    userId,
    authenticated: true,
  }
}

export function createUbndSession(
  villageId: string = SEED_ADMIN_IDS.batTrangVillageId,
  userId: string = SEED_ADMIN_IDS.ubndUserId
): MockAdminSession {
  return {
    role: 'ADMIN',
    adminType: 'UBND',
    villageId,
    userId,
    authenticated: true,
  }
}

export function createUnauthorizedSession(): MockAdminSession {
  return {
    role: 'TourAgency',
    adminType: null,
    villageId: null,
    userId: 'agency-user-001',
    authenticated: true,
  }
}

export function createGuestSession(): MockAdminSession {
  return {
    role: 'Guest',
    adminType: null,
    villageId: null,
    userId: null,
    authenticated: false,
  }
}

// Route requests use the server-side demo session cookie (src/lib/auth/demo-session.ts);
// the cookie only names the account, so a UBND request is always UBND Hạ Thái.
export function toSessionHeader(session: MockAdminSession): Record<string, string> {
  const account = !session.authenticated
    ? 'guest'
    : session.adminType === 'HDT'
      ? 'hdt'
      : session.adminType === 'UBND'
        ? 'ubnd'
        : session.role === 'TourAgency'
          ? 'agency'
          : 'guest'
  return { cookie: `hab_demo_account=${account}` }
}
