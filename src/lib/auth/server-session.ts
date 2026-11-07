import { cookies } from 'next/headers'
import { DEMO_SESSION_COOKIE, sessionContextFromRequest, type SessionContext } from './session'
import { PRODUCT_SESSION_COOKIE } from './product-session'

/** Give Server Components the same canonical session contract used by API routes. */
export async function currentServerSession(): Promise<SessionContext> {
  const store = cookies()
  const header = [PRODUCT_SESSION_COOKIE, DEMO_SESSION_COOKIE]
    .map(name => ({ name, value: store.get(name)?.value }))
    .filter((cookie): cookie is { name: string; value: string } => typeof cookie.value === 'string')
    .map(cookie => `${cookie.name}=${encodeURIComponent(cookie.value)}`)
    .join('; ')
  return (await sessionContextFromRequest(new Request('http://localhost/internal/session', {
    headers: header ? { cookie: header } : undefined,
  })))
}
