import { describe, expect, it } from 'vitest'
import { resolveDateRange } from '@/lib/adm/trend-calculator'

// Issue #93. spec-ADM FR-004 Custom period: start_date and end_date (Date, `YYYY-MM-DD` from ADM079's date
// inputs) are calendar days in Asia/Ho_Chi_Minh (consistency-contract.md:58), and both days are included:
// from 00:00:00.000 of start_date to 23:59:59.999 of end_date, Hanoi time (UTC+7, no daylight saving).
const range = (start: string, end: string) => resolveDateRange('Custom', start, end)

describe('#93 spec-ADM FR-004 | Custom period is whole Hanoi days', () => {
  it('normal: 2026-11-01 → 2026-11-07 runs from 00:00 Hanoi on the 1st to the end of the 7th, Hanoi time', () => {
    const { startDate, endDate } = range('2026-11-01', '2026-11-07')
    expect(startDate.toISOString()).toBe('2026-10-31T17:00:00.000Z')
    expect(endDate.toISOString()).toBe('2026-11-07T16:59:59.999Z')
  })

  it('boundary: 00:00:00.000 Hanoi on start_date is inside, 1 ms before is outside', () => {
    const { startDate } = range('2026-11-07', '2026-11-07')
    expect(Date.parse('2026-11-07T00:00:00.000+07:00') >= startDate.getTime()).toBe(true)
    expect(Date.parse('2026-11-06T23:59:59.999+07:00') >= startDate.getTime()).toBe(false)
  })

  it('boundary: 23:59:59.999 Hanoi on end_date is inside, the next Hanoi midnight is outside; a one-day period is one whole day', () => {
    const { startDate, endDate } = range('2026-11-07', '2026-11-07')
    expect(Date.parse('2026-11-07T23:59:59.999+07:00') <= endDate.getTime()).toBe(true)
    expect(Date.parse('2026-11-08T00:00:00.000+07:00') <= endDate.getTime()).toBe(false)
    expect(endDate.getTime() - startDate.getTime()).toBe(86_400_000 - 1)
  })

  it('a full timestamp with an offset is kept as given (existing callers and tests)', () => {
    const { startDate, endDate } = range('2026-09-20T00:00:00+07:00', '2026-09-25T23:59:59+07:00')
    expect(startDate.toISOString()).toBe('2026-09-19T17:00:00.000Z')
    expect(endDate.toISOString()).toBe('2026-09-25T16:59:59.000Z')
  })
})
