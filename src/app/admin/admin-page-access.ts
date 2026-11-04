import type { ActorSession } from '@/lib/auth/demo-session'

// L3 (BR-001, BR-002): ADM079 is for HDT and UBND Admins; others see the restricted state,
// as /admin/providers does.
export function adminPageAccess(session: ActorSession): 'allow' | 'restricted' {
  return session.authenticated && (session.role === 'HDT' || session.role === 'UBND') ? 'allow' : 'restricted'
}
