import { describe, expect, it } from 'vitest'
import { AGENCY_TABS, agencyTabCount, agencyRowChips, parseAgencyTab } from '@/lib/booking/agency-list'

// Screen 05 (mockup LichSuDatCho). Tabs: Sắp tới, Chờ thanh toán, Đã hoàn thành, Tất cả, plus Đã huỷ (decision 5:
// a cancelled booking shows in the "Đã huỷ" tab; the mockup has no such tab).
describe('agency list tabs', () => {
  const rows = ['On hold', 'On hold', 'Booked', 'Completed', 'Cancelled'].map(status => ({ status }))
  it('labels and order', () => {
    expect(AGENCY_TABS.map(t => t.label)).toEqual(['Sắp tới', 'Chờ thanh toán', 'Đã hoàn thành', 'Đã huỷ', 'Tất cả'])
  })
  it('counts: upcoming = On hold + Booked; pending = On hold; done = Completed; cancelled; all', () => {
    expect(AGENCY_TABS.map(t => agencyTabCount(t.id, rows))).toEqual([3, 2, 1, 1, 5])
  })
  it('unknown tab falls back to upcoming', () => {
    expect(parseAgencyTab('x')).toBe('upcoming'); expect(parseAgencyTab('cancel')).toBe('cancel')
  })
})
describe('row chips', () => {
  it('On hold: Tạm giữ chip + Chờ thanh toán chip + pay button', () => {
    expect(agencyRowChips('On hold')).toEqual({ status: 'Đang giữ chỗ', pay: 'Chờ thanh toán', payNow: true })
  })
  it('Booked: paid; Completed and Cancelled: no pay chip, no button', () => {
    expect(agencyRowChips('Booked')).toEqual({ status: 'Tour sắp tới', pay: 'Đã thanh toán', payNow: false })
    expect(agencyRowChips('Completed')).toEqual({ status: 'Hoàn thành tour', pay: '', payNow: false })
    expect(agencyRowChips('Cancelled')).toEqual({ status: 'Đã huỷ', pay: '', payNow: false })
  })
})
