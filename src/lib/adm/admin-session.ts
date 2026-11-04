import { DEMO_SESSION_COOKIE, demoSessionFor } from '@/lib/auth/demo-session'
import type { SessionLike } from './scope-guard'

/**
 * A2 (AC-ADM-SCOPE, SC-007): the admin actor comes only from the server-side demo session cookie
 * (hab_demo_account). Client-supplied session JSON (x-mock-session, hab_mock_session) is ignored, so a
 * UBND Admin cannot choose another village and nobody can claim HDT. This reads the cookie directly
 * because demoSessionFromRequest still accepts the legacy x-mock-session header when no cookie is sent.
 */
export function adminSessionFromRequest(req: Request): SessionLike | null {
  const encoded = req.headers.get('cookie')?.split(';').map(part => part.trim())
    .find(part => part.startsWith(`${DEMO_SESSION_COOKIE}=`))?.split('=')[1]
  const session = demoSessionFor(encoded ? decodeURIComponent(encoded) : null)
  if (!session.authenticated) return null
  return {
    role: session.role,
    adminType: session.adminType,
    villageId: session.villageId,
    userId: session.userId,
    authenticated: true,
  }
}
