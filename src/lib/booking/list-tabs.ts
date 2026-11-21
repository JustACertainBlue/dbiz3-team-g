// Tabs of the booking lists (34 provider, 05 agency; mockup 19/11): one definition so both screens and the tests agree.
export type ListTab = 'all' | 'todo' | 'hold' | 'booked' | 'done' | 'cancel'
export const LIST_TABS: { id: ListTab; label: string; status?: string; todo?: boolean }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'todo', label: 'Cần xử lý', status: 'On hold', todo: true },
  { id: 'hold', label: 'Đang giữ chỗ', status: 'On hold' },
  { id: 'booked', label: 'Đã thanh toán', status: 'Booked' },
  { id: 'done', label: 'Hoàn thành tour', status: 'Completed' },
  { id: 'cancel', label: 'Đã huỷ', status: 'Cancelled' },
]
export const parseTab = (value: string | undefined): ListTab => (LIST_TABS.find(tab => tab.id === value)?.id ?? 'all')
export const BOOKING_PILL: Record<string, { label: string; cls: string }> = {
  'On hold': { label: 'Đang giữ chỗ', cls: 'hold' }, Booked: { label: 'Tour sắp tới', cls: 'booked' },
  Completed: { label: 'Hoàn thành tour', cls: 'done' }, Cancelled: { label: 'Đã huỷ', cls: 'cancel' },
}
export const PAY_LABEL: Record<string, string> = { 'On hold': 'Chờ thanh toán', Booked: 'Đã thanh toán', Completed: 'Đã thanh toán', Cancelled: 'Chưa thanh toán' }
/** Count shown in a tab label, from the four status counts (ignoring any status filter). */
export function tabCount(id: ListTab, counts: Record<string, number>): number {
  const tab = LIST_TABS.find(item => item.id === id)!
  return tab.status ? counts[tab.status] ?? 0 : Object.values(counts).reduce((sum, value) => sum + value, 0)
}
