// One table of Vietnamese display labels for every business status (Design System v9 §2, Figma "Status Badge";
// spec-BKG #49 and screen-spec-DSH018 §8 as amended 2026-11-08). Stored and API values stay the canonical English
// enums; only what people read changes. Client-safe: no server imports.

export type StatusFamily = 'booking' | 'calendar' | 'provider' | 'agency' | 'account' | 'legal' | 'chat' | 'flag'
export type StatusIcon = 'clock' | 'circle-check' | 'check-check' | 'ban' | 'calendar' | 'lock' | 'pen' | 'shield' | 'alert' | 'layers' | 'check' | 'x' | 'bell'

export interface StatusLook {
  label: string
  icon: StatusIcon
  /** v9 token stem: --color-status-<tone>-fg / -bg (and -border when outlined). */
  tone: string
  outlined?: boolean
}

const BOOKING: Record<string, StatusLook> = {
  'On hold': { label: 'Tạm giữ', icon: 'clock', tone: 'booking-onhold' },
  Booked: { label: 'Đã đặt', icon: 'circle-check', tone: 'booking-booked', outlined: true },
  Completed: { label: 'Hoàn tất', icon: 'check-check', tone: 'booking-completed' },
  Cancelled: { label: 'Đã huỷ', icon: 'ban', tone: 'booking-cancelled' },
}

export const STATUS_LOOKS: Record<StatusFamily, Record<string, StatusLook>> = {
  booking: BOOKING,
  calendar: {
    Available: { label: 'Còn trống', icon: 'calendar', tone: 'calendar-available' },
    'On hold': { label: 'Tạm giữ', icon: 'clock', tone: 'calendar-onhold' },
    Booked: { label: 'Đã đặt', icon: 'circle-check', tone: 'calendar-booked', outlined: true },
    Unavailable: { label: 'Không khả dụng', icon: 'lock', tone: 'calendar-unavailable' },
  },
  provider: {
    Draft: { label: 'Bản nháp', icon: 'pen', tone: 'provider-draft' },
    'Pending Verification': { label: 'Chờ xác minh', icon: 'clock', tone: 'provider-pending' },
    Verified: { label: 'Đã xác minh', icon: 'shield', tone: 'provider-verified' },
    'Revision Required': { label: 'Cần chỉnh sửa', icon: 'alert', tone: 'provider-revision' },
    Superseded: { label: 'Đã thay thế', icon: 'layers', tone: 'provider-superseded' },
  },
  agency: {
    'Pending Approval': { label: 'Chờ phê duyệt', icon: 'clock', tone: 'agency-pending' },
    Approved: { label: 'Đã phê duyệt', icon: 'check', tone: 'agency-approved' },
    Rejected: { label: 'Bị từ chối', icon: 'x', tone: 'agency-rejected' },
    Disabled: { label: 'Đã vô hiệu', icon: 'lock', tone: 'agency-disabled' },
  },
  account: {
    Active: { label: 'Đang hoạt động', icon: 'check', tone: 'account-active' },
    Disabled: { label: 'Đã vô hiệu', icon: 'lock', tone: 'account-disabled' },
  },
  legal: {
    'Pending Review': { label: 'Chờ xem xét', icon: 'clock', tone: 'legal-pending' },
    Approved: { label: 'Đã duyệt', icon: 'check', tone: 'legal-approved' },
    Rejected: { label: 'Bị từ chối', icon: 'x', tone: 'legal-rejected' },
  },
  chat: {
    Active: { label: 'Đang hoạt động', icon: 'check', tone: 'chat-active' },
    Closed: { label: 'Đã đóng', icon: 'lock', tone: 'chat-closed' },
  },
  flag: {
    'Needs action': { label: 'Cần xử lý', icon: 'bell', tone: 'provider-revision' },
  },
}

/** The look of a status; an unknown value keeps its own text and a neutral tone (never invents a meaning). */
export function statusLook(family: StatusFamily, status: string | null | undefined): StatusLook {
  const value = status ?? ''
  return STATUS_LOOKS[family][value] ?? { label: value, icon: 'clock', tone: 'neutral' }
}

export function statusLabel(family: StatusFamily, status: string | null | undefined): string {
  return statusLook(family, status).label
}
