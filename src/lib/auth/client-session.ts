'use client'

import type { SessionContext } from './session'

/** Read the canonical server session for client-side presentation and navigation guards. */
export async function readSessionContext(): Promise<SessionContext> {
  const response = await fetch('/api/auth/session', { cache: 'no-store' })
  if (!response.ok) throw new Error('Unable to read session')
  const body = await response.json() as { data: { session: SessionContext } }
  return body.data.session
}
