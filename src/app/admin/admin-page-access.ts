import type { SessionContext } from '@/lib/auth/session'

// L3 (BR-001, BR-002): ADM079 is for HDT and UBND Admins; others see the restricted state,
// as /admin/providers does.
export function adminPageAccess(session: SessionContext): 'allow' | 'restricted' {
  return session.authenticated && session.role === 'ADMIN' && session.adminType !== null ? 'allow' : 'restricted'
}

// #242 (from nguyenthu-0505): a signed-out visitor goes to Login and comes back to /admin; a signed-in non-admin
// still sees the restricted state above.
export function adminGuestRedirect(session: Pick<SessionContext, 'authenticated'>): string | null {
  return session.authenticated ? null : '/login?next=/admin'
}
