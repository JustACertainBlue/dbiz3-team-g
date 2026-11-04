import { getCurrentSession, refreshDemoSession } from '@/lib/prf/client-session'
import type { DemoSession } from '@/lib/auth/demo-session'

/**
 * Keeps ADM079 in step with the demo session. refreshDemoSession() dispatches `hab_role_changed`, so the
 * event handler must only read the current session; refreshing there loops forever (demo C6, 2026-11-04).
 */
export function startAdminRoleSync(apply: (session: DemoSession) => void, target: EventTarget = window): () => void {
  let active = true
  refreshDemoSession()
    .then(session => { if (active) apply(session) })
    .catch(() => { if (active) apply(getCurrentSession()) })

  const onRoleChanged = () => apply(getCurrentSession())
  target.addEventListener('hab_role_changed', onRoleChanged)
  return () => {
    active = false
    target.removeEventListener('hab_role_changed', onRoleChanged)
  }
}
