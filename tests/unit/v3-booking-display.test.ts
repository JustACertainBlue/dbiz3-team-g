import { describe, expect, it } from 'vitest'
import { adjustmentLine, bookingCode, slotPeriod, slotRange } from '@/lib/booking/display'

describe('booking display helpers (UI v3 decisions #8, #9)', () => {
  it('code is HAB- + first 6 characters of the id, upper case', () => {
    expect(bookingCode('4bf17b30-9819-5c47-b745-06be7171087b')).toBe('HAB-4BF17B')
    expect(bookingCode('abcdef12-0000-0000-0000-000000000000')).toBe('HAB-ABCDEF')
  })
  it('range is HH:mm–HH:mm in Hanoi time, whatever the stored offset', () => {
    expect(slotRange('2026-11-24T08:30:00+07:00', '2026-11-24T09:30:00+07:00')).toBe('08:30–09:30')
    expect(slotRange('2026-11-24T01:30:00Z', '2026-11-24T02:30:00Z')).toBe('08:30–09:30')
  })
  it('period comes from the start hour: <12 sáng, <17 chiều, else tối', () => {
    expect(slotPeriod('2026-11-24T08:30:00+07:00')).toBe('Ca sáng')
    expect(slotPeriod('2026-11-24T11:59:00+07:00')).toBe('Ca sáng')
    expect(slotPeriod('2026-11-24T12:00:00+07:00')).toBe('Ca chiều')
    expect(slotPeriod('2026-11-24T16:59:00+07:00')).toBe('Ca chiều')
    expect(slotPeriod('2026-11-24T17:00:00+07:00')).toBe('Ca tối')
  })
  it('adjustment line: sign, thousands dots, empty when 0', () => {
    expect(adjustmentLine(75000)).toBe('Điều chỉnh theo thoả thuận: +75.000 ₫')
    expect(adjustmentLine(-25000)).toBe('Điều chỉnh theo thoả thuận: −25.000 ₫')
    expect(adjustmentLine(0)).toBe('')
  })
})
