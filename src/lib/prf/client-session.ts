'use client'

import {
  providerSession,
  agencyOwnerSession,
  ubndSession,
  hdtSession,
  guestSession,
  SEED_IDS,
  type MockSession,
} from '../../../tests/prf/helpers/mockSession'

export type CurrentUserRole = 'LocalProvider' | 'TourAgency' | 'UBND' | 'HDT' | 'Guest'

const STORAGE_KEY = 'hab_current_role'

export function getCurrentRole(): CurrentUserRole {
  if (typeof window === 'undefined') return 'LocalProvider'
  const saved = localStorage.getItem(STORAGE_KEY) as CurrentUserRole | null
  if (saved && ['LocalProvider', 'TourAgency', 'UBND', 'HDT', 'Guest'].includes(saved)) {
    return saved
  }
  return 'LocalProvider'
}

function syncSessionCookie(session: MockSession) {
  if (typeof document === 'undefined') return
  try {
    document.cookie = `hab_mock_session=${encodeURIComponent(JSON.stringify(session))}; path=/; SameSite=Lax`
  } catch {
    // ignore
  }
}

export function setCurrentRole(role: CurrentUserRole): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, role)
  const session = getClientMockSession()
  syncSessionCookie(session)
  window.dispatchEvent(new Event('hab_role_changed'))
}

export function getClientMockSession(customId?: string): MockSession {
  const role = getCurrentRole()
  switch (role) {
    case 'TourAgency':
      return agencyOwnerSession(customId || SEED_IDS.agency1)
    case 'LocalProvider':
      return providerSession(customId || SEED_IDS.provider1Verified, SEED_IDS.provider1VerifiedUserId)
    case 'UBND':
      return ubndSession(customId || SEED_IDS.village1, SEED_IDS.ubndUserId)
    case 'HDT':
      return hdtSession(SEED_IDS.hdtUserId)
    case 'Guest':
    default:
      return guestSession()
  }
}

export function getAuthHeaders(customId?: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-mock-session': JSON.stringify(getClientMockSession(customId)),
  }
}
