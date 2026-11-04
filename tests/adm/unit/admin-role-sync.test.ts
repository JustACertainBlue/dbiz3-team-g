/**
 * Demo finding (C6, 2026-11-04): /admin refreshed the demo session on every `hab_role_changed` event, and
 * `refreshDemoSession()` dispatches that same event, so the page looped forever (and FilterPanel refetched
 * /api/adm/filter-options on each turn). The role sync must refresh once on load and only read the current
 * session when the event fires.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'

const target = new EventTarget()
const session = DEMO_IDENTITIES.ubnd

vi.mock('@/lib/prf/client-session', () => ({
  // Like main: refreshing the session announces a role change.
  refreshDemoSession: vi.fn(async () => {
    setTimeout(() => target.dispatchEvent(new Event('hab_role_changed')), 0)
    return session
  }),
  getCurrentSession: vi.fn(() => session),
}))

import { refreshDemoSession } from '@/lib/prf/client-session'
import { startAdminRoleSync } from '@/app/admin/admin-role-sync'

const settle = () => new Promise(resolve => setTimeout(resolve, 30))

describe('admin role sync does not loop', () => {
  beforeEach(() => vi.mocked(refreshDemoSession).mockClear())

  it('refreshes once on load; the role-change event only reads the current session', async () => {
    const apply = vi.fn()
    const stop = startAdminRoleSync(apply, target)
    await settle()
    expect(refreshDemoSession).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledWith(session)

    const before = apply.mock.calls.length
    target.dispatchEvent(new Event('hab_role_changed'))
    await settle()
    expect(refreshDemoSession).toHaveBeenCalledTimes(1)
    expect(apply.mock.calls.length).toBe(before + 1)

    stop()
    target.dispatchEvent(new Event('hab_role_changed'))
    await settle()
    expect(apply.mock.calls.length).toBe(before + 1)
  })
})
