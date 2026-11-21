import { describe, expect, it } from 'vitest'
import { LIST_TABS, parseTab, tabCount } from '@/lib/booking/list-tabs'

// Tabs of 34 and 05 (mockup 19/11).
describe('list tabs', () => {
  const counts = { 'On hold': 2, Booked: 3, Completed: 1, Cancelled: 4 }
  it('counts: all is the total; Cần xử lý and Đang giữ chỗ are both On hold', () => {
    expect(LIST_TABS.map(tab => tabCount(tab.id, counts))).toEqual([10, 2, 2, 3, 1, 4])
  })
  it('labels are the mockup wording, in order', () => {
    expect(LIST_TABS.map(tab => tab.label)).toEqual(['Tất cả', 'Cần xử lý', 'Đang giữ chỗ', 'Đã thanh toán', 'Hoàn thành tour', 'Đã huỷ'])
  })
  it('an unknown tab falls back to all', () => {
    expect(parseTab('nope')).toBe('all'); expect(parseTab(undefined)).toBe('all'); expect(parseTab('todo')).toBe('todo')
  })
})
