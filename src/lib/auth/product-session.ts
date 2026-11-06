import { createHash, randomBytes, randomUUID } from 'node:crypto'
import type { NextRequest } from 'next/server'
import { DEMO_IDENTITIES, type DemoSession } from './demo-session'
import { demoRepository } from '../demo/json-repository'
import { verifyPassword } from './password'

export const PRODUCT_SESSION_COOKIE = 'hab_session'
export const PRODUCT_SESSION_TTL_SECONDS = 60 * 60 * 12

export type LoginFailure = 'INVALID_CREDENTIALS' | 'ACCOUNT_INACTIVE'
export type LoginResult =
  | { ok: true; token: string; identity: DemoSession }
  | { ok: false; reason: LoginFailure }

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function identityForUser(userId: string): DemoSession | undefined {
  const repo = demoRepository()
  const account = repo.find('user_accounts', row => row.user_id === userId)
  if (!account) return undefined
  const role = account.role_code
  if (role === 'Tour_Agency' && account.account_status !== 'Approved') return undefined
  if (role !== 'Tour_Agency' && account.account_status !== 'Active') return undefined
  const base = { authenticated: true, userId, displayName: account.full_name, agencyId: null, providerId: null, villageId: null, adminType: null }
  if (role === 'Tour_Agency') {
    const profile = repo.find('agency_profiles', row => row.user_id === userId)
    return profile ? { ...base, accountKey: 'agency', role: 'TourAgency', agencyId: profile.agency_id } : undefined
  }
  if (role === 'Local_Provider') {
    const profile = repo.find('provider_profiles', row => row.user_id === userId)
    return profile ? { ...base, accountKey: 'provider', role: 'LocalProvider', providerId: profile.provider_id, villageId: profile.village_id } : undefined
  }
  if (role === 'ADMIN' && account.admin_type === 'HDT') return { ...base, accountKey: 'hdt', role: 'HDT', adminType: 'HDT' }
  if (role === 'ADMIN' && account.admin_type === 'UBND') {
    const assignment = repo.find('ubnd_village_assignments', row => row.ubnd_user_id === userId)
    return assignment ? { ...base, accountKey: 'ubnd', role: 'UBND', adminType: 'UBND', villageId: assignment.village_id } : undefined
  }
  return undefined
}

function cookieValue(request: NextRequest | Request, name: string): string | null {
  const cookie = request.headers.get('cookie')
  const encoded = cookie?.split(';').map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))?.slice(name.length + 1)
  return encoded ? decodeURIComponent(encoded) : null
}

/**
 * Prototype credential adapter. Seed hashes are fixtures, not usable password hashes. Until AUT
 * has a production identity provider, a seeded email plus any non-empty password enters the demo.
 * Role and organization IDs always come from stored account data, never client input.
 */
export function authenticatePrototype(email: string, password: string): LoginResult {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !password) return { ok: false, reason: 'INVALID_CREDENTIALS' }

  const account = demoRepository().find('user_accounts', row => row.email.toLowerCase() === normalizedEmail)
  if (!account) return { ok: false, reason: 'INVALID_CREDENTIALS' }
  // Compatibility is limited to the original four fixture identities and unusable seed hashes.
  if (!Object.values(DEMO_IDENTITIES).some(item => item.userId === account.user_id)
    || !account.password_hash.includes('seedhash')) return { ok: false, reason: 'INVALID_CREDENTIALS' }
  if (!['Active', 'Approved'].includes(account.account_status)) return { ok: false, reason: 'ACCOUNT_INACTIVE' }

  const identity = identityForUser(account.user_id)
  if (!identity) return { ok: false, reason: 'INVALID_CREDENTIALS' }

  return createSession(identity)
}

function createSession(identity: DemoSession): LoginResult {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  demoRepository().insert('sessions', {
    session_id: randomUUID(), user_id: identity.userId!, role_context: identity.role === 'TourAgency' ? 'Tour_Agency' : identity.role === 'LocalProvider' ? 'Local_Provider' : 'ADMIN',
    token_hash: hashToken(token),
    expires_at: new Date(now.getTime() + PRODUCT_SESSION_TTL_SECONDS * 1000).toISOString(),
    revoked_at: '', created_at: now.toISOString(),
  })
  return { ok: true, token, identity }
}

/** Password verification reused from PR #11, adapted to the shared repository and session. */
export async function authenticateAccount(email: string, password: string): Promise<LoginResult> {
  if (!email.trim() || !password.trim()) return { ok: false, reason: 'INVALID_CREDENTIALS' }
  const account = demoRepository().find('user_accounts', row => row.email.toLowerCase() === email.trim().toLowerCase())
  if (!account) return { ok: false, reason: 'INVALID_CREDENTIALS' }
  if (process.env.NODE_ENV !== 'production' && account.password_hash.includes('seedhash')) return authenticatePrototype(email, password)
  if (!await verifyPassword(password, account.password_hash)) return { ok: false, reason: 'INVALID_CREDENTIALS' }
  const identity = identityForUser(account.user_id)
  if (!identity) return { ok: false, reason: 'ACCOUNT_INACTIVE' }
  return createSession(identity)
}

export function productSessionFromRequest(request: NextRequest | Request): DemoSession | null {
  const token = cookieValue(request, PRODUCT_SESSION_COOKIE)
  if (!token) return null
  const session = demoRepository().find('sessions', row => row.token_hash === hashToken(token)
    && !row.revoked_at && Date.parse(row.expires_at) > Date.now())
  if (!session) return null
  const account = demoRepository().find('user_accounts', row => row.user_id === session.user_id)
  if (!account || !['Active', 'Approved'].includes(account.account_status)) return null
  if (session.role_context !== account.role_code) return null
  return identityForUser(session.user_id) ?? null
}

export function revokeProductSession(request: NextRequest | Request): boolean {
  const token = cookieValue(request, PRODUCT_SESSION_COOKIE)
  if (!token) return false
  return Boolean(demoRepository().update('sessions', row => row.token_hash === hashToken(token) && !row.revoked_at,
    { revoked_at: new Date().toISOString() }))
}

export function workspacePath(identity: DemoSession): string {
  if (identity.role === 'TourAgency') return '/explore'
  if (identity.role === 'LocalProvider') return `/provider/${identity.providerId}/dashboard`
  if (identity.role === 'UBND') return '/admin/providers'
  if (identity.role === 'HDT') return '/admin'
  return '/explore'
}
