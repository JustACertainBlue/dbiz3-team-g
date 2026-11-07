import { describe, expect, it } from 'vitest'
import { hanoiClock, hanoiDate, hanoiDateTime, hanoiInputValue } from '@/lib/time/hanoi-time'

// Issue #87, spec-BKG #31: one shared formatter in Asia/Ho_Chi_Minh for UTC strings ("…Z", as PostgreSQL
// timestamptz arrives through the application store), Date values (pg driver) and "+07:00" strings (seed).
describe('#87 spec-BKG #31 | hanoi-time formatter', () => {
  const forms = ['2026-11-23T02:00:00.000Z', new Date('2026-11-23T02:00:00.000Z'), '2026-11-23T09:00:00+07:00', '2026-11-23T09:00:00.000+07:00']

  it.each(forms.map(value => [value]))('formats %s as 2026-11-23 09:00', value => {
    expect(hanoiDate(value)).toBe('2026-11-23')
    expect(hanoiClock(value)).toBe('09:00')
    expect(hanoiDateTime(value)).toBe('2026-11-23 09:00')
    expect(hanoiInputValue(value)).toBe('2026-11-23T09:00')
  })

  it('derives the Hanoi date across UTC midnight (boundary: 16:59:59Z, 17:00:00Z)', () => {
    expect(hanoiDateTime('2026-11-22T16:59:59.000Z')).toBe('2026-11-22 23:59')
    expect(hanoiDateTime('2026-11-22T17:00:00.000Z')).toBe('2026-11-23 00:00')
  })

  it('shows midnight as 00:00, never 24:00', () => {
    expect(hanoiClock('2026-11-22T17:00:00Z')).toBe('00:00')
  })

  it('returns an empty string for an empty or invalid value instead of throwing', () => {
    expect(hanoiDateTime('')).toBe('')
    expect(hanoiDateTime(undefined)).toBe('')
    expect(hanoiDate('not a date')).toBe('')
  })
})
