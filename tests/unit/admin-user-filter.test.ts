import { describe, expect, it } from 'vitest'
import { filterAdminUsers, type AdminUserFilters } from '@/lib/auth/admin-user-filter'

// `/admin/users` "Ngày tạo từ / đến" (spec-AUT US-9 account list; spec-BKG #31 time rule, issue #87):
// the filter compares the Hanoi local date of `created_date`, which PostgreSQL returns as UTC. Hanoi is
// UTC+7, so 17:00:00Z is already the next local day and 16:59:59Z is still the same one.
const user = (name: string, created_date: string) => ({
  user_id: name, name, email: `${name}@example.invalid`, organization: 'Org', role: 'Tour_Agency', status: 'Active', created_date,
})
const LATE_UTC = user('late', '2026-11-22T17:00:00.000Z') // 2026-11-23 00:00 Hanoi
const EDGE_UTC = user('edge', '2026-11-22T16:59:59.000Z') // 2026-11-22 23:59 Hanoi
const MORNING_UTC = user('morning', '2026-11-23T02:00:00.000Z') // 2026-11-23 09:00 Hanoi
const LEGACY = user('legacy', '2026-11-23T00:30:00+07:00') // old +07:00 row, 2026-11-23 Hanoi
const ALL = [LATE_UTC, EDGE_UTC, MORNING_UTC, LEGACY]
const none: AdminUserFilters = { query: '', status: '', role: '', organization: '', dateFrom: '', dateTo: '' }
const names = (filters: Partial<AdminUserFilters>) => filterAdminUsers(ALL, { ...none, ...filters }).map(u => u.name).sort()

describe('#87 spec-BKG #31 | admin/users created-date filter uses the Hanoi date', () => {
  it('normal: a one-day range 2026-11-23 keeps every account created that Hanoi day, UTC or +07:00', () => {
    expect(names({ dateFrom: '2026-11-23', dateTo: '2026-11-23' })).toEqual(['late', 'legacy', 'morning'])
  })

  it('boundary: 17:00:00Z belongs to the next Hanoi day, 16:59:59Z to the same day (dateFrom)', () => {
    expect(names({ dateFrom: '2026-11-23' })).toContain('late')
    expect(names({ dateFrom: '2026-11-23' })).not.toContain('edge')
  })

  it('boundary: dateTo 2026-11-22 keeps 16:59:59Z and drops 17:00:00Z (inclusive end, Hanoi day)', () => {
    expect(names({ dateTo: '2026-11-22' })).toEqual(['edge'])
  })

  it('no date filter: every account is listed; other filters are unchanged by the move', () => {
    expect(names({})).toEqual(['edge', 'late', 'legacy', 'morning'])
    expect(names({ query: 'MORN' })).toEqual(['morning'])
    expect(names({ status: 'Disabled' })).toEqual([])
  })
})
