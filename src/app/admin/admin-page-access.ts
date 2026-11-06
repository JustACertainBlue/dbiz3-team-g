import { toSessionContext, type SessionLike } from '@/lib/auth/session'

// L3 (BR-001, BR-002): ADM079 is for HDT and UBND Admins; others see the restricted state,
// as /admin/providers does.
export function adminPageAccess(session: SessionLike): 'allow' | 'restricted' {
  const actor = toSessionContext(session)
  return actor.authenticated && actor.role === 'ADMIN' && actor.adminType !== null ? 'allow' : 'restricted'
}
