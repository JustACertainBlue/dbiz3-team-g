import { toSessionContext, type SessionLike } from '@/lib/auth/session'

// AIT121 access (BR-001, BR-002, #28): a Guest goes to Login; other non-Agency actors see a restricted page.
export const RESTRICTED_TEXT = 'AI Tour Matching is available only to Tour Agencies.'

export function aiMatchingAccess(session: SessionLike): 'allow' | 'redirect-login' | 'restricted' {
  const actor = toSessionContext(session)
  if (!actor.authenticated) return 'redirect-login'
  return actor.role === 'Tour_Agency' && actor.agencyId ? 'allow' : 'restricted'
}
