import { describe, expect, it } from 'vitest'
import { scheduleModel, shiftMonth } from '@/lib/booking/agency-schedule'

// Screen 27 (mockup LichDaiLy): summary chips, month grid with 3 trip states, month list. Cancelled bookings are not shown.
const row = (booking_id: string, start: string, status: string, extra: Record<string, unknown> = {}) => ({
  booking_id, status, start_at: `${start}+07:00`, end_at: `${start.slice(0, 11)}${String(Number(start.slice(11, 13)) + 1).padStart(2, '0')}${start.slice(13)}+07:00`,
  experience_name: 'Nặn gốm', provider_name: 'Xưởng A', group_size: 10, ...extra,
})
const rows = [
  row('h1', '2026-11-24T09:00:00', 'On hold'), row('b1', '2026-12-03T09:00:00', 'Booked'), row('b2', '2026-11-24T14:00:00', 'Booked'),
  row('d1', '2026-10-28T08:00:00', 'Completed'), row('c1', '2026-11-25T09:00:00', 'Cancelled'),
]

describe('scheduleModel', () => {
  const model = scheduleModel(rows as never, '2026-11', '2026-11-17')
  it('summary: upcoming = On hold + Booked from today on; pending = On hold', () => {
    expect(model.summary).toEqual({ upcoming: 3, pending: 1 })
  })
  it('November 2026 starts on a Sunday: 6 blanks (Monday first), 30 days, title Tháng 11/2026', () => {
    expect(model.title).toBe('Tháng 11/2026'); expect(model.leading).toBe(6); expect(model.days).toHaveLength(30)
  })
  it('day states: hold beats booked on the same day; past days are past; empty days are none; cancelled is hidden', () => {
    const state = (day: number) => model.days[day - 1].state
    expect(state(24)).toBe('hold'); expect(state(16)).toBe('past'); expect(state(18)).toBe('none'); expect(state(25)).toBe('none')
    expect(model.days[23].bookingId).toBe('h1')
  })
  it('events of the month: sorted by start, no cancelled, with weekday and time range', () => {
    expect(model.events.map(event => event.bookingId)).toEqual(['h1', 'b2'])
    expect(model.events[0]).toMatchObject({ weekday: 'Thứ Ba', day: '24', time: '09:00 – 10:00', state: 'hold' })
  })
  it('a past completed trip shows as done in its own month', () => {
    const october = scheduleModel(rows as never, '2026-10', '2026-11-17')
    expect(october.days[27].state).toBe('done')
  })
  it('shiftMonth crosses the year', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01'); expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })
})
