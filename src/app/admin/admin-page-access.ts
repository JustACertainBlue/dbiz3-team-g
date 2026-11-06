import type { SessionContext } from '@/lib/auth/session'

// L3 (BR-001, BR-002): ADM079 is for HDT and UBND Admins; others see the restricted state,
// as /admin/providers does.
export function adminPageAccess(session: SessionContext): 'allow' | 'restricted' {
  return session.authenticated && session.role === 'ADMIN' && session.adminType !== null ? 'allow' : 'restricted'
}
