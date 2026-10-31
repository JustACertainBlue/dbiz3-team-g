import { describe, expect, it } from 'vitest'
import { addDays, isQueryDate } from '@/lib/booking/clock'

// T002: date helpers for the schedule ranges (#62, #71).
describe('T002 | addDays / isQueryDate', () => {
  it('adds calendar days to a YYYY-MM-DD date', () => {
    expect(addDays('2026-10-01', 29)).toBe('2026-10-30')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('accepts only real YYYY-MM-DD dates', () => {
    expect(isQueryDate('2026-10-05')).toBe(true)
    for (const value of ['2026-13-01', '2026-02-30', '05/10/2026', '', undefined, 20261005]) {
      expect(isQueryDate(value)).toBe(false)
    }
  })
})
