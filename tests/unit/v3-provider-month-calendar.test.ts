// Screens 29 and 30: month calendar days of one provider, from operating hours and On hold / Booked bookings.
import { describe, expect, it } from 'vitest'
import { monthDays, providerStats } from '@/lib/provider/month-calendar'

const hours = [1, 2, 3, 4, 5].map(weekday => ({ provider_id: 'p1', weekday: String(weekday), local_start: '08:00', local_end: '17:00' }))
const booking = (id: string, start: string, status: string, group = '10', exp = 'e1') => ({ booking_id: id, provider_id: 'p1', experience_id: exp, status, start_at: `${start}+07:00`, end_at: `${start.slice(0, 11)}10:00:00+07:00`, group_size: group })
const experiences = [{ experience_id: 'e1', name: 'Nặn gốm thủ công' }]

describe('monthDays', () => {
  const days = (bookings: ReturnType<typeof booking>[], today = '2026-11-16') => Object.fromEntries(monthDays({ hours, bookings, experiences }, '2026-11-01', '2026-11-30', today).map(d => [d.date, d]))
  it('is free on an operating weekday, closed on a day without hours', () => {
    const d = days([])
    expect(d['2026-11-17'].state).toBe('free')   // Tuesday
    expect(d['2026-11-21'].state).toBe('closed') // Saturday
  })
  it('marks past days', () => { expect(days([])['2026-11-10'].past).toBe(true); expect(days([])['2026-11-16'].past).toBe(false) })
  it('On hold → hold, Booked → booked (Booked wins), with the guest count and experience name', () => {
    const d = days([booking('b1', '2026-11-24T09:00:00', 'Booked'), booking('b2', '2026-11-25T09:00:00', 'On hold', '8'), booking('b3', '2026-11-26T09:00:00', 'On hold'), booking('b4', '2026-11-26T11:00:00', 'Booked', '3')])
    expect(d['2026-11-24']).toMatchObject({ state: 'booked', guests: 10, label: 'Nặn gốm thủ công', bookingId: 'b1' })
    expect(d['2026-11-25']).toMatchObject({ state: 'hold', guests: 8 })
    expect(d['2026-11-26'].state).toBe('booked'); expect(d['2026-11-26'].guests).toBe(13)
  })
  it('ignores Cancelled and Completed bookings and bookings of other months', () => {
    const d = days([booking('b1', '2026-11-24T09:00:00', 'Cancelled'), booking('b2', '2026-11-25T09:00:00', 'Completed'), booking('b3', '2026-12-01T09:00:00', 'Booked')])
    expect(d['2026-11-24'].state).toBe('free'); expect(d['2026-11-25'].state).toBe('free'); expect(Object.keys(d)).toHaveLength(30)
  })
  it('a booking on a closed day still shows', () => {
    expect(days([booking('b1', '2026-11-21T09:00:00', 'Booked')])['2026-11-21'].state).toBe('booked')
  })
})

describe('providerStats', () => {
  it('counts groups and guests of On hold / Booked in the next 30 days, and active experiences', () => {
    const now = Date.parse('2026-11-16T00:00:00+07:00')
    const stats = providerStats({ bookings: [booking('a', '2026-11-20T09:00:00', 'Booked', '10'), booking('b', '2026-12-10T09:00:00', 'On hold', '5'), booking('c', '2026-12-30T09:00:00', 'Booked', '9'), booking('d', '2026-11-18T09:00:00', 'Cancelled', '4')],
      experiences: [{ experience_id: 'e1', provider_id: 'p1', archived_at: '' }, { experience_id: 'e2', provider_id: 'p1', archived_at: '2026-10-01' }, { experience_id: 'e3', provider_id: 'p2', archived_at: '' }] }, 'p1', now)
    expect(stats).toEqual({ upcomingGroups: 2, upcomingGuests: 15, activeExperiences: 1 })
  })
})

import { hoursSummary, hoursByWeekday } from '@/lib/provider/month-calendar'
describe('hoursSummary', () => {
  it('groups days with the same hours (screen 29 "Giờ mở cửa")', () => {
    expect(hoursSummary(hours)).toEqual([{ days: 'Thứ 2 – Thứ 6', text: '08:00 – 17:00' }, { days: 'Thứ 7, Chủ nhật', text: 'Nghỉ' }])
  })
  it('lists several windows of one day and splits runs', () => {
    const rows = [{ weekday: '1', local_start: '08:00', local_end: '11:00' }, { weekday: '1', local_start: '13:00', local_end: '17:00' }, { weekday: '2', local_start: '08:00', local_end: '11:00' }, { weekday: '2', local_start: '13:00', local_end: '17:00' }]
    expect(hoursSummary(rows)[0]).toEqual({ days: 'Thứ 2, Thứ 3', text: '08:00 – 11:00, 13:00 – 17:00' })
    expect(hoursSummary([])).toEqual([{ days: 'Thứ 2 – Chủ nhật', text: 'Nghỉ' }])
  })
  it('hoursByWeekday has only open days', () => { expect(hoursByWeekday(hours)).toEqual({ 1: '08:00 – 17:00', 2: '08:00 – 17:00', 3: '08:00 – 17:00', 4: '08:00 – 17:00', 5: '08:00 – 17:00' }) })
})

import { monthWindow } from '@/lib/provider/month-window'
describe('monthWindow', () => {
  it('covers the previous, current and next month', () => {
    expect(monthWindow('2026-11-21')).toEqual({ from: '2026-10-01', to: '2026-12-31' })
    expect(monthWindow('2027-01-31')).toEqual({ from: '2026-12-01', to: '2027-02-28' })
  })
})
