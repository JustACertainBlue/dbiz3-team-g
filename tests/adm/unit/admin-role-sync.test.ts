/**
 * Demo finding (C6, 2026-11-04): /admin refreshed the demo session on every `hab_role_changed` event, and
 * `refreshDemoSession()` dispatches that same event, so the page looped forever (and FilterPanel refetched
 * /api/adm/filter-options on each turn). The role sync must refresh once on load and only read the current
 * session when the event fires.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { demoSessionContextFor } from '@/lib/auth/session'

const target = new EventTarget()
const session = (await demoSessionContextFor('ubnd'))

vi.mock('@/lib/auth/client-session', () => ({
  readSessionContext: vi.fn(async () => session),
}))

import { readSessionContext } from '@/lib/auth/client-session'
import { startAdminRoleSync } from '@/app/admin/admin-role-sync'

const settle = () => new Promise(resolve => setTimeout(resolve, 30))

describe('admin role sync does not loop', () => {
  beforeEach(() => vi.mocked(readSessionContext).mockClear())

  it('reads once on load and once per role-change event without recursion', async () => {
    const apply = vi.fn()
    const stop = startAdminRoleSync(apply, target)
    await settle()
    expect(readSessionContext).toHaveBeenCalledTimes(1)
    expect(apply).toHaveBeenCalledWith(session)

    const before = apply.mock.calls.length
    target.dispatchEvent(new Event('hab_role_changed'))
    await settle()
    expect(readSessionContext).toHaveBeenCalledTimes(2)
    expect(apply.mock.calls.length).toBe(before + 1)

    stop()
    target.dispatchEvent(new Event('hab_role_changed'))
    await settle()
    expect(apply.mock.calls.length).toBe(before + 1)
  })
})
