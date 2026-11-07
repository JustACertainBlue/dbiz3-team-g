import type { NextRequest } from 'next/server'
import { DEMO_SESSION_COOKIE, demoSessionFor, demoSessionFromRequest, type ActorSession } from './demo-session'
import { productSessionFromRequest, accountNeedsPasswordChange } from './product-session'
import { demoRepository } from '../db/application-store'

export type AuthRole = 'ADMIN' | 'Tour_Agency' | 'Local_Provider'
export type AdminType = 'HDT' | 'UBND'
export type DataScope = 'Platform-wide' | 'Assigned village' | 'Own organization'
export { DEMO_SESSION_COOKIE }

/** The authentication contract consumed by business modules, independently of the auth adapter. */
export interface SessionContext {
  mustChangePassword?: boolean
  authenticated: boolean
  userId: string | null
  role: AuthRole | null
  adminType: AdminType | null
  agencyId: string | null
  providerId: string | null
  assignedVillageId: string | null
  permissions: string[]
  dataScope: DataScope | null
}

/** Transitional input used while older module pages/tests are migrated one slice at a time. */
export type SessionLike = SessionContext | ActorSession

function canonicalRole(session: ActorSession): AuthRole | null {
  if (!session.authenticated || session.role === 'Guest') return null
  if (session.role === 'TourAgency') return 'Tour_Agency'
  if (session.role === 'LocalProvider') return 'Local_Provider'
  return 'ADMIN'
}

async function permissionSet(role: AuthRole | null, adminType: AdminType | null): Promise<string[]> {
  if (!role) return []
  return [...new Set((await demoRepository().all('role_permissions'))
    .filter(row => row.role_code === role && (!row.admin_type || row.admin_type === adminType))
    .map(row => row.permission_code))]
    .sort()
}

/** DemoAuthAdapter: translate the legacy demo vocabulary to the canonical AUT contract. */
export async function sessionContextFor(session: ActorSession): Promise<SessionContext> {
  const role = canonicalRole(session)
  const adminType = role === 'ADMIN' ? session.adminType : null
  const dataScope: DataScope | null = role === 'ADMIN'
    ? adminType === 'HDT' ? 'Platform-wide' : 'Assigned village'
    : role ? 'Own organization' : null

  return {
    authenticated: session.authenticated && role !== null,
    userId: session.authenticated ? session.userId : null,
    role,
    adminType,
    agencyId: role === 'Tour_Agency' ? session.agencyId : null,
    providerId: role === 'Local_Provider' ? session.providerId : null,
    assignedVillageId: role === 'ADMIN' && adminType === 'UBND' ? session.villageId : null,
    permissions: (await permissionSet(role, adminType)),
    dataScope,
  }
}

export async function toSessionContext(session: SessionLike): Promise<SessionContext> {
  return 'permissions' in session ? session : (await sessionContextFor(session))
}

/** Presentation helper for demo pages; identity and authorization stay in SessionContext. */
export async function sessionDisplayName(session: SessionLike): Promise<string> {
  const actor = (await toSessionContext(session))
  if (!actor.authenticated || !actor.userId) return 'Khách xem công khai'
  return (await demoRepository().find('user_accounts', row => row.user_id === actor.userId))?.full_name
    || (actor.role === 'Tour_Agency' ? 'Tour Agency' : actor.role === 'Local_Provider' ? 'Local Provider' : `${actor.adminType ?? ''} Admin`.trim())
}

export async function demoSessionContextFor(key: string | null | undefined): Promise<SessionContext> {
  return (await sessionContextFor(demoSessionFor(key)))
}

export async function sessionContextFromRequest(request: NextRequest | Request): Promise<SessionContext> {
  const productSession = (await productSessionFromRequest(request))
  if (productSession) {
    const mustChangePassword = (await accountNeedsPasswordChange(productSession.userId))
    const path = new URL(request.url).pathname
    if (mustChangePassword && !['/api/auth/change-password', '/api/auth/session', '/api/auth/logout'].includes(path)) return (await sessionContextFor(demoSessionFor('guest')))
    return { ...(await sessionContextFor(productSession)), mustChangePassword }
  }
  // Legacy demo cookies remain available only to the existing automated regression suite.
  // Development and production must authenticate through the opaque product session.
  return (await sessionContextFor(process.env.NODE_ENV === 'test' ? demoSessionFromRequest(request) : demoSessionFor('guest')))
}

export interface AccessCheckResult {
  allowed: boolean
  agencyId?: string
  redirectTo?: string
  statusCode?: number
}

export function checkAitAccess(ctx: SessionContext): AccessCheckResult {
  if (!ctx.authenticated) return { allowed: false, redirectTo: '/login' }
  if (ctx.role !== 'Tour_Agency' || !ctx.agencyId) return { allowed: false, statusCode: 403 }
  return { allowed: true, agencyId: ctx.agencyId }
}
