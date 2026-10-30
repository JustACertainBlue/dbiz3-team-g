import { describe, expect, it } from 'vitest'
import { hanoiDate } from '@/lib/booking/clock'

// T002: local date in Asia/Ho_Chi_Minh for the F-SCHED-10 date filter (#31, #62).
describe('T002 | hanoiDate', () => {
  it('returns the Hanoi calendar date of an instant', () => {
    expect(hanoiDate(Date.parse('2026-10-05T09:00:00+07:00'))).toBe('2026-10-05')
    expect(hanoiDate(Date.parse('2026-10-04T17:30:00Z'))).toBe('2026-10-05') // 00:30 in Hanoi
    expect(hanoiDate(Date.parse('2026-10-05T23:59:59+07:00'))).toBe('2026-10-05')
  })
})
