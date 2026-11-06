import { sessionContextFromRequest, type SessionContext } from '@/lib/auth/session'

/**
 * A2 (AC-ADM-SCOPE, SC-007): the admin actor comes only from the server-side demo session cookie
 * (hab_demo_account). Client-supplied session JSON (x-mock-session, hab_mock_session) is ignored, so a
 * UBND Admin cannot choose another village and nobody can claim HDT.
 */
export function adminSessionFromRequest(req: Request): SessionContext | null {
  const session = sessionContextFromRequest(req)
  return session.authenticated ? session : null
}
