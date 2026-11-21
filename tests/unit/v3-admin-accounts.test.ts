// Screens 39 and 40 (mockup v3): labels and filters of the account list.
import { describe, expect, it } from 'vitest'
import { accountStatusView, roleLabel, formatLastLogin, filterByStatusGroup, switchAction } from '@/lib/adm/v3-accounts'

describe('accountStatusView', () => {
  it('maps stored statuses to the mockup labels', () => {
    expect(accountStatusView('Active')).toEqual({ label: 'Đang hoạt động', group: 'active', switchable: true, on: true })
    expect(accountStatusView('Approved')).toMatchObject({ label: 'Đang hoạt động', group: 'active', switchable: true, on: true })
    expect(accountStatusView('Disabled')).toEqual({ label: 'Đã tắt', group: 'off', switchable: true, on: false })
    expect(accountStatusView('Pending Approval')).toEqual({ label: 'Chờ duyệt', group: 'pending', switchable: false, on: false })
    expect(accountStatusView('Rejected')).toEqual({ label: 'Bị từ chối', group: 'rejected', switchable: false, on: false })
  })
})

describe('roleLabel', () => {
  it('uses the mockup wording', () => {
    expect(roleLabel('Tour_Agency')).toBe('Công ty lữ hành')
    expect(roleLabel('Local_Provider')).toBe('Xưởng nghề')
    expect(roleLabel('ADMIN', 'UBND')).toBe('UBND xã')
    expect(roleLabel('ADMIN', 'HDT')).toBe('Sở Du lịch')
  })
})

describe('formatLastLogin', () => {
  it('Hanoi date and time, or "Chưa đăng nhập"', () => {
    expect(formatLastLogin('2026-11-15T01:12:00Z')).toBe('15/11/2026, 08:12')
    expect(formatLastLogin(null)).toBe('Chưa đăng nhập')
    expect(formatLastLogin('')).toBe('Chưa đăng nhập')
  })
})

describe('filterByStatusGroup', () => {
  const users = [{ status: 'Active' }, { status: 'Approved' }, { status: 'Disabled' }, { status: 'Pending Approval' }]
  it('filters by group; empty keeps all', () => {
    expect(filterByStatusGroup(users, '')).toHaveLength(4)
    expect(filterByStatusGroup(users, 'active')).toHaveLength(2)
    expect(filterByStatusGroup(users, 'off')).toHaveLength(1)
    expect(filterByStatusGroup(users, 'pending')).toHaveLength(1)
  })
})

describe('switchAction', () => {
  it('turning an active account off disables it; turning an off account on enables it', () => {
    expect(switchAction('Active')).toBe('disable')
    expect(switchAction('Disabled')).toBe('enable')
  })
})
