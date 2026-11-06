import { readSessionContext } from '@/lib/auth/client-session'
import type { SessionContext } from '@/lib/auth/session'

/**
 * Keeps ADM079 in step with the canonical session. Reading `/api/auth/session` does not emit
 * `hab_role_changed`, so one read per event cannot recurse (demo C6, 2026-11-04).
 */
export function startAdminRoleSync(apply: (session: SessionContext) => void, target: EventTarget = window): () => void {
  let active = true
  const refresh = () => readSessionContext()
    .then(session => { if (active) apply(session) })
    .catch(() => undefined)

  void refresh()
  const onRoleChanged = () => { void refresh() }
  target.addEventListener('hab_role_changed', onRoleChanged)
  return () => {
    active = false
    target.removeEventListener('hab_role_changed', onRoleChanged)
  }
}
