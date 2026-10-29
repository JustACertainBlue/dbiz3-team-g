import { describe, expect, it } from 'vitest'
import { fitsOperatingHours, isoWeekdayInHanoi } from '@/lib/booking/operating-hours'

// T010: Clarifications #28, #29, #31 and AC-BKG-HOURS.
// Provider 50f2c8fc (seed) works weekday 1, 08:00–17:00.
const mondayHours = [{ weekday: '1', local_start: '08:00:00', local_end: '17:00:00' }]

describe('T010 | operating-hours fit', () => {
  it('#28: weekday is ISO 8601 (1 = Monday … 7 = Sunday)', () => {
    expect(isoWeekdayInHanoi('2026-10-12T09:00:00+07:00')).toBe(1)
    expect(isoWeekdayInHanoi('2026-10-11T09:00:00+07:00')).toBe(7)
  })

  it('#31: weekday and local time are read in Asia/Ho_Chi_Minh', () => {
    // Sunday 18:00 UTC is Monday 01:00 in Hanoi
    expect(isoWeekdayInHanoi('2026-10-11T18:00:00Z')).toBe(1)
    // Monday 02:00–03:00 UTC is Monday 09:00–10:00 in Hanoi
    expect(fitsOperatingHours(mondayHours, '2026-10-12T02:00:00Z', '2026-10-12T03:00:00Z')).toBe(true)
  })

  it('#29: the whole [start_at, end_at) must fit inside one window', () => {
    expect(fitsOperatingHours(mondayHours, '2026-10-12T08:00:00+07:00', '2026-10-12T17:00:00+07:00')).toBe(true)
    expect(fitsOperatingHours(mondayHours, '2026-10-12T16:30:00+07:00', '2026-10-12T17:30:00+07:00')).toBe(false)
    expect(fitsOperatingHours(mondayHours, '2026-10-12T07:30:00+07:00', '2026-10-12T08:30:00+07:00')).toBe(false)
  })

  it('#28/#29: a time inside the window on another weekday does not fit', () => {
    expect(fitsOperatingHours(mondayHours, '2026-10-13T09:00:00+07:00', '2026-10-13T10:00:00+07:00')).toBe(false)
  })

  it('AC-BKG-HOURS: a Provider with no operating hours has no available period', () => {
    expect(fitsOperatingHours([], '2026-10-12T09:00:00+07:00', '2026-10-12T10:00:00+07:00')).toBe(false)
  })

  it('an interval that crosses midnight never fits', () => {
    const lateMonday = [{ weekday: '1', local_start: '08:00:00', local_end: '23:59:00' }]
    expect(fitsOperatingHours(lateMonday, '2026-10-12T23:30:00+07:00', '2026-10-13T00:30:00+07:00')).toBe(false)
  })
})
