// Screens 39 (account list) and 40 (account info), mockup v3: wording and small helpers. The data and the
// enable/disable rules stay in src/lib/auth/admin-accounts.ts; this file only presents them.
import { hanoiClock, hanoiDate } from '@/lib/time/hanoi-time'

export type StatusGroup = 'active' | 'off' | 'pending' | 'rejected'
export interface StatusView { label: string; group: StatusGroup; switchable: boolean; on: boolean }

export function accountStatusView(status: string): StatusView {
  switch (status) {
    case 'Active': case 'Approved': return { label: 'Đang hoạt động', group: 'active', switchable: true, on: true }
    case 'Disabled': return { label: 'Đã tắt', group: 'off', switchable: true, on: false }
    case 'Pending Approval': return { label: 'Chờ duyệt', group: 'pending', switchable: false, on: false }
    case 'Rejected': return { label: 'Bị từ chối', group: 'rejected', switchable: false, on: false }
    default: return { label: status, group: 'off', switchable: false, on: false }
  }
}

export function roleLabel(role: string, adminType?: string | null): string {
  if (role === 'Tour_Agency') return 'Công ty lữ hành'
  if (role === 'Local_Provider') return 'Xưởng nghề'
  if (role === 'ADMIN') return adminType === 'UBND' ? 'UBND xã' : 'Sở Du lịch'
  return role
}

export function formatLastLogin(value: string | null | undefined): string {
  const date = hanoiDate(value)
  return date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}, ${hanoiClock(value)}` : 'Chưa đăng nhập'
}

export function formatDate(value: string | null | undefined): string {
  const date = hanoiDate(value)
  return date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : ''
}

export function filterByStatusGroup<T extends { status: string }>(users: T[], group: StatusGroup | ''): T[] {
  return group ? users.filter(u => accountStatusView(u.status).group === group) : users
}

/** The switch of an account that is on turns it off; of one that is off turns it on. */
export function switchAction(status: string): 'enable' | 'disable' { return status === 'Disabled' ? 'enable' : 'disable' }
