// Tabs and chips of screen 05 (agency booking history, mockup 19/11). Client-safe.
export type AgencyTab = 'upcoming' | 'pending' | 'done' | 'cancel' | 'all'
export const AGENCY_TABS: { id: AgencyTab; label: string; statuses?: string[] }[] = [
  { id: 'upcoming', label: 'Sắp tới', statuses: ['On hold', 'Booked'] },
  { id: 'pending', label: 'Chờ thanh toán', statuses: ['On hold'] },
  { id: 'done', label: 'Đã hoàn thành', statuses: ['Completed'] },
  { id: 'cancel', label: 'Đã huỷ', statuses: ['Cancelled'] }, // decision 5; not in the mockup
  { id: 'all', label: 'Tất cả' },
]
export const parseAgencyTab = (value: string | undefined): AgencyTab => AGENCY_TABS.find(tab => tab.id === value)?.id ?? 'upcoming'
export const agencyTabCount = (id: AgencyTab, rows: readonly { status: string }[]): number => {
  const tab = AGENCY_TABS.find(item => item.id === id)!
  return tab.statuses ? rows.filter(row => tab.statuses!.includes(row.status)).length : rows.length
}
export function agencyRowChips(status: string): { status: string; pay: string; payNow: boolean } {
  switch (status) {
    case 'On hold': return { status: 'Đang giữ chỗ', pay: 'Chờ thanh toán', payNow: true }
    case 'Booked': return { status: 'Tour sắp tới', pay: 'Đã thanh toán', payNow: false }
    case 'Completed': return { status: 'Hoàn thành tour', pay: '', payNow: false }
    default: return { status: 'Đã huỷ', pay: '', payNow: false }
  }
}
