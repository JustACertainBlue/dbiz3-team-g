import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { prototypeLoginEnabled } from './prototype-login'
import type { NextRequest } from 'next/server'
import { DEMO_IDENTITIES, type DemoSession } from './demo-session'
import { demoRepository } from '../db/application-store'
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

async function identityForUser(userId: string): Promise<DemoSession | undefined> {
  const repo = demoRepository()
  const account = (await repo.find('user_accounts', row => row.user_id === userId))
  if (!account) return undefined
  const role = account.role_code
  if (role === 'Tour_Agency' && account.account_status !== 'Approved') return undefined
  if (role !== 'Tour_Agency' && account.account_status !== 'Active') return undefined
  const base = { authenticated: true, userId, displayName: account.full_name, agencyId: null, providerId: null, villageId: null, adminType: null }
  if (role === 'Tour_Agency') {
    const profile = (await repo.find('agency_profiles', row => row.user_id === userId))
    return profile ? { ...base, accountKey: 'agency', role: 'TourAgency', agencyId: profile.agency_id } : undefined
  }
  if (role === 'Local_Provider') {
    const profile = (await repo.find('provider_profiles', row => row.user_id === userId))
    return profile ? { ...base, accountKey: 'provider', role: 'LocalProvider', providerId: profile.provider_id, villageId: profile.village_id } : undefined
  }
  if (role === 'ADMIN' && account.admin_type === 'HDT') return { ...base, accountKey: 'hdt', role: 'HDT', adminType: 'HDT' }
  if (role === 'ADMIN' && account.admin_type === 'UBND') {
    const assignment = (await repo.find('ubnd_village_assignments', row => row.ubnd_user_id === userId))
    return assignment ? { ...base, accountKey: 'ubnd', role: 'UBND', adminType: 'UBND', villageId: assignment.village_id } : undefined
  }
  return undefined
}

function cookieValue(request: NextRequest | Request, name: string): string | null {
  const cookie = request.headers.get('cookie')
  const encoded = cookie?.split(';').map(part => part.trim())
    .find(part => part.startsWith(`${name}=`))?.slice(name.length + 1)
  try { return encoded ? decodeURIComponent(encoded) : null } catch { return null }
}

/**
 * Prototype credential adapter. Seed hashes are fixtures, not usable password hashes. Until AUT
 * has a production identity provider, a seeded email plus any non-empty password enters the demo.
 * Role and organization IDs always come from stored account data, never client input.
 */
export async function authenticatePrototype(email: string, password: string): Promise<LoginResult> {
  if (!prototypeLoginEnabled()) return { ok: false, reason: 'INVALID_CREDENTIALS' }
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail || !password) return { ok: false, reason: 'INVALID_CREDENTIALS' }

  const account = (await demoRepository().find('user_accounts', row => row.email.toLowerCase() === normalizedEmail))
  if (!account) return { ok: false, reason: 'INVALID_CREDENTIALS' }
  // Compatibility is limited to the original four fixture identities and unusable seed hashes.
  if (!Object.values(DEMO_IDENTITIES).some(item => item.userId === account.user_id)
    || !account.password_hash.includes('seedhash')) return { ok: false, reason: 'INVALID_CREDENTIALS' }
  if (!['Active', 'Approved'].includes(account.account_status)) return { ok: false, reason: 'ACCOUNT_INACTIVE' }

  const identity = (await identityForUser(account.user_id))
  if (!identity) return { ok: false, reason: 'INVALID_CREDENTIALS' }

  return (await createSession(identity))
}

async function createSession(identity: DemoSession): Promise<LoginResult> {
  const token = randomBytes(32).toString('base64url')
  const now = new Date()
  ;(await demoRepository().insert('sessions', {
    session_id: randomUUID(), user_id: identity.userId!, role_context: identity.role === 'TourAgency' ? 'Tour_Agency' : identity.role === 'LocalProvider' ? 'Local_Provider' : 'ADMIN',
    token_hash: hashToken(token),
    expires_at: new Date(now.getTime() + PRODUCT_SESSION_TTL_SECONDS * 1000).toISOString(),
    revoked_at: '', created_at: now.toISOString(),
  }))
  // spec-AUT FR-021 §5.1 / F-AUTH-07 (#56): the account list shows the last successful login.
  ;(await demoRepository().update('user_accounts', row => row.user_id === identity.userId, { last_login: now.toISOString() }))
  return { ok: true, token, identity }
}

/** spec-AUT FR-007 §5.1 (#55): which refusal an inactive account gets; call only after the password matched. */
export async function inactiveLoginMessage(email: string): Promise<'Account not approved' | 'Account disabled'> {
  const account = (await demoRepository().find('user_accounts', row => row.email.toLowerCase() === email.trim().toLowerCase()))
  return account?.account_status === 'Disabled' ? 'Account disabled' : 'Account not approved'
}

/** Password verification reused from PR #11, adapted to the shared repository and session. */
export async function authenticateAccount(email: string, password: string): Promise<LoginResult> {
  if (!email.trim() || !password.trim()) return { ok: false, reason: 'INVALID_CREDENTIALS' }
  const account = (await demoRepository().find('user_accounts', row => row.email.toLowerCase() === email.trim().toLowerCase()))
  if (!account) return { ok: false, reason: 'INVALID_CREDENTIALS' }
  if (prototypeLoginEnabled() && account.password_hash.includes('seedhash')) return (await authenticatePrototype(email, password))
  if (!await verifyPassword(password, account.password_hash)) return { ok: false, reason: 'INVALID_CREDENTIALS' }
  const identity = (await identityForUser(account.user_id))
  if (!identity) return { ok: false, reason: 'ACCOUNT_INACTIVE' }
  return (await createSession(identity))
}

export async function productSessionFromRequest(request: NextRequest | Request): Promise<DemoSession | null> {
  const token = cookieValue(request, PRODUCT_SESSION_COOKIE)
  if (!token) return null
  const session = (await demoRepository().find('sessions', row => row.token_hash === hashToken(token)
    && !row.revoked_at && Date.parse(row.expires_at) > Date.now()))
  if (!session) return null
  const account = (await demoRepository().find('user_accounts', row => row.user_id === session.user_id))
  if (!account || !['Active', 'Approved'].includes(account.account_status)) return null
  if (session.role_context !== account.role_code) return null
  return (await identityForUser(session.user_id)) ?? null
}

export async function revokeProductSession(request: NextRequest | Request): Promise<boolean> {
  const token = cookieValue(request, PRODUCT_SESSION_COOKIE)
  if (!token) return false
  return Boolean((await demoRepository().update('sessions', row => row.token_hash === hashToken(token) && !row.revoked_at,
    { revoked_at: new Date().toISOString() })))
}

export async function workspacePath(identity: DemoSession): Promise<string> {
  if ((await accountNeedsPasswordChange(identity.userId))) return '/account/change-password'
  if (identity.role === 'TourAgency') return '/explore'
  if (identity.role === 'LocalProvider') return `/provider/${identity.providerId}/dashboard`
  if (identity.role === 'UBND') return '/admin/providers'
  if (identity.role === 'HDT') return '/admin'
  return '/explore'
}

export async function accountNeedsPasswordChange(userId: string | null): Promise<boolean> {
  const row = userId && (await demoRepository().find('user_accounts', item => item.user_id === userId))
  return Boolean(row && row.must_change_password === 'true' && !row.password_hash.includes('seedhash'))
}
