/**
 * Human review 2026-11-19, second round, screen 24:
 * - "Giờ nhận đoàn" lists open days only, consecutive days grouped ("Thứ 2 – Thứ 6, 08:00–17:00"); no closed days.
 * - "Lịch trống": each state (còn trống / có đoàn giữ chỗ / đã có đoàn / xưởng nghỉ) has its own label and sentence; a
 *   closed day says "Xưởng nghỉ ngày này. Bạn có thể chọn ngày khác." and never "Đã có đoàn giữ chỗ".
 * - The preselected day is the search date when it is free, else the nearest free day from today.
 */
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { DAY_STATUS, defaultCalendarDay, monthCalendar, openingHoursText } from '@/lib/explore/v3-provider'
import MonthCalendar from '@/app/explore/providers/[id]/MonthCalendar'
import { seed as baseSeed } from './v3-village-fixtures'

;(globalThis as { React?: typeof React }).React = React
const NOW = new Date('2026-11-18T03:00:00.000Z') // Wednesday 18/11 in Hanoi
function seed() {
  const data = baseSeed()
  data.bookings = [
    { booking_id: 'b1', provider_id: 'p1', experience_id: 'e1', agency_id: 'ag', status: 'On hold', start_at: '2026-11-25T01:00:00.000Z', end_at: '2026-11-25T10:00:00.000Z', group_size: '10' },
    { booking_id: 'b2', provider_id: 'p1', experience_id: 'e1', agency_id: 'ag', status: 'Booked', start_at: '2026-11-26T01:00:00.000Z', end_at: '2026-11-26T10:00:00.000Z', group_size: '8' },
  ]
  return data
}
const hours = (list: Array<[number, string, string]>) => list.map(([weekday, start, end]) => ({ provider_id: 'p', weekday: String(weekday), local_start: `${start}:00`, local_end: `${end}:00` }))

describe('openingHoursText', () => {
  it('lists open days only and groups consecutive days with the same hours', () => {
    expect(openingHoursText(hours([[1, '08:00', '17:00']]))).toBe('Thứ 2, 08:00–17:00')
    expect(openingHoursText(hours([1, 2, 3, 4, 5].map(d => [d, '08:00', '17:00'])))).toBe('Thứ 2 – Thứ 6, 08:00–17:00')
    expect(openingHoursText(hours([[1, '08:00', '17:00'], [3, '08:00', '17:00'], [4, '08:00', '17:00'], [6, '08:00', '17:00']]))).toBe('Thứ 2, Thứ 4 – Thứ 5, Thứ 7, 08:00–17:00')
    expect(openingHoursText(hours([[1, '08:00', '17:00'], [2, '08:00', '17:00'], [6, '08:00', '12:00'], [7, '08:00', '12:00']]))).toBe('Thứ 2 – Thứ 3, 08:00–17:00; Thứ 7 – Chủ nhật, 08:00–12:00')
    expect(openingHoursText(hours([[1, '08:00', '11:30'], [1, '13:30', '17:00'], [2, '08:00', '11:30'], [2, '13:30', '17:00']]))).toBe('Thứ 2 – Thứ 3, 08:00–11:30 và 13:30–17:00')
    expect(openingHoursText([])).toBe('')
    expect(openingHoursText(hours([[1, '08:00', '17:00']]))).not.toMatch(/Nghỉ/)
  })
})

describe('calendar day states', () => {
  it('has its own label and sentence for each state', () => {
    expect(DAY_STATUS.free).toEqual({ label: 'Còn trống', note: 'Xưởng còn nhận một đoàn trong ngày này.' })
    expect(DAY_STATUS.hold).toEqual({ label: 'Có đoàn giữ chỗ', note: 'Một đoàn đang giữ chỗ ngày này. Bạn có thể chọn ngày khác.' })
    expect(DAY_STATUS.busy).toEqual({ label: 'Đã có đoàn', note: 'Xưởng đã nhận đoàn ngày này. Bạn có thể chọn ngày khác.' })
    expect(DAY_STATUS.off).toEqual({ label: 'Xưởng nghỉ', note: 'Xưởng nghỉ ngày này. Bạn có thể chọn ngày khác.' })
    expect(new Set(Object.values(DAY_STATUS).map(item => item.note)).size).toBe(Object.keys(DAY_STATUS).length)
  })
  const month = monthCalendar(seed(), 'p1', '2026-11', NOW)
  const panel = (initial: string) => {
    const html = renderToStaticMarkup(React.createElement(MonthCalendar, { month, basePath: '/explore/providers/p1', isAgency: false, initial }))
    return (html.match(/<aside[\s\S]*<\/aside>/)?.[0] ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  it.each([
    ['2026-11-24', 'free', 'Còn trống · 08:00 – 17:00 Xưởng còn nhận một đoàn trong ngày này.'],
    ['2026-11-25', 'hold', 'Có đoàn giữ chỗ Một đoàn đang giữ chỗ ngày này. Bạn có thể chọn ngày khác.'],
    ['2026-11-26', 'busy', 'Đã có đoàn Xưởng đã nhận đoàn ngày này. Bạn có thể chọn ngày khác.'],
    ['2026-11-28', 'off', 'Xưởng nghỉ Xưởng nghỉ ngày này. Bạn có thể chọn ngày khác.'],
  ])('panel for %s (%s)', (date, state, text) => {
    expect(month.days.find(day => day.date === date)!.state).toBe(state)
    expect(panel(date)).toContain(text)
  })
  it('never says "Đã có đoàn giữ chỗ" for a closed day, and closed or booked days can be clicked', () => {
    expect(panel('2026-11-28')).not.toContain('Đã có đoàn giữ chỗ')
    const html = renderToStaticMarkup(React.createElement(MonthCalendar, { month, basePath: '/explore/providers/p1', isAgency: false, initial: '2026-11-24' }))
    expect(html).toMatch(/<button type="button" class="v3p-mc m-off"(?![^>]*disabled)[^>]*aria-label="28\/11 Xưởng nghỉ"/)
    expect(html).toMatch(/<button type="button" class="v3p-mc m-past" disabled=""/)
  })
})

describe('defaultCalendarDay', () => {
  it('is the search date when it is free, else the nearest free day from today', () => {
    expect(defaultCalendarDay(seed(), 'p1', '2026-11-24', NOW)).toBe('2026-11-24')
    expect(defaultCalendarDay(seed(), 'p1', '2026-11-28', NOW)).toBe('2026-11-18')
    expect(defaultCalendarDay(seed(), 'p1', '2026-11-25', NOW)).toBe('2026-11-18')
    expect(defaultCalendarDay(seed(), 'p1', '', NOW)).toBe('2026-11-18')
    expect(defaultCalendarDay(seed(), 'p1', '', new Date('2026-11-27T20:00:00.000Z'))).toBe('2026-11-30')
    expect(defaultCalendarDay(seed(), 'p1', '', new Date('2026-11-29T03:00:00.000Z'))).toBe('2026-11-30')
    expect(defaultCalendarDay(seed(), 'p4', '', NOW)).toBe('')
  })
})
