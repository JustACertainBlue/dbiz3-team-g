'use client'

import type { DemoAccountKey, DemoRole, DemoSession } from '../auth/demo-session'

export type CurrentUserRole = DemoRole

let currentSession: DemoSession = {
  authenticated: false,
  accountKey: 'guest',
  role: 'Guest',
  userId: null,
  agencyId: null,
  providerId: null,
  villageId: null,
  adminType: null,
  displayName: 'Khách xem công khai',
}

const roleAccounts: Record<CurrentUserRole, DemoAccountKey> = {
  Guest: 'guest',
  TourAgency: 'agency',
  LocalProvider: 'provider',
  UBND: 'ubnd',
  HDT: 'hdt',
}

export function getCurrentRole(): CurrentUserRole {
  return currentSession.role
}

export function getCurrentSession(): DemoSession {
  return currentSession
}

export async function refreshDemoSession(): Promise<DemoSession> {
  const response = await fetch('/api/demo/session', { cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to read demo session')
  const body = await response.json() as { session: DemoSession }
  currentSession = body.session
  window.dispatchEvent(new Event('hab_role_changed'))
  return currentSession
}

export async function setCurrentRole(role: CurrentUserRole): Promise<void> {
  const response = await fetch('/api/demo/session', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ account: roleAccounts[role] }),
  })
  if (!response.ok) throw new Error('Unable to change demo account')
  const body = await response.json() as { session: DemoSession }
  currentSession = body.session
  window.dispatchEvent(new Event('hab_role_changed'))
}

export function getAuthHeaders(legacyProfileId?: string): Record<string, string> {
  void legacyProfileId
  return { 'Content-Type': 'application/json' }
}
