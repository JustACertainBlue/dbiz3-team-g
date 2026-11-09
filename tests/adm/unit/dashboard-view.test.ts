// ADM079 design wave 4 screen 5 (Figma "Màn 5"): pure view helpers. Content stays inside spec-ADM:
// FR-003 / SR-004 four cards, FR-009 status breakdown (counts + percentages, stacked bar/donut) and
// trend line with BR-019 granularity, SR-003 HDT platform-wide / UBND own village.
import { describe, expect, it } from 'vitest'
import { dashboardTitle, metricLabel, statusBreakdown, trendLine, trendTitle } from '@/lib/adm/dashboard-view'

describe('dashboardTitle (SR-003 scope)', () => {
  it('names the village when the scope is one village (UBND, or HDT with a village filter)', () => {
    expect(dashboardTitle('Bát Tràng')).toBe('Dashboard làng Bát Tràng')
  })
  it('is city-wide when no village is selected (HDT)', () => {
    expect(dashboardTitle(null)).toBe('Dashboard toàn thành phố')
  })
})

describe('metricLabel (FR-003: exactly the four card labels)', () => {
  it('translates each spec label and nothing else', () => {
    expect(metricLabel('Total Agencies')).toBe('Tổng số Agency')
    expect(metricLabel('Total Providers')).toBe('Tổng số Provider')
    expect(metricLabel('Total Bookings')).toBe('Tổng số đặt chỗ')
    expect(metricLabel('Active Collaborations')).toBe('Cặp hợp tác đang hoạt động')
  })
})

describe('statusBreakdown (FR-009 (1))', () => {
  const data = [
    { status: 'Completed' as const, count: 16, pct: 38.1 },
    { status: 'Booked' as const, count: 14, pct: 33.3 },
    { status: 'Cancelled' as const, count: 5, pct: 11.9 },
    { status: 'On hold' as const, count: 7, pct: 16.7 },
  ]
  it('orders the lifecycle On hold → Booked → Completed → Cancelled and keeps counts and percentages', () => {
    const result = statusBreakdown(data)
    expect(result.rows.map(row => row.status)).toEqual(['On hold', 'Booked', 'Completed', 'Cancelled'])
    expect(result.rows.map(row => [row.count, row.pct])).toEqual([[7, 16.7], [14, 33.3], [16, 38.1], [5, 11.9]])
    expect(result.total).toBe(42)
  })
  it('gives each stacked segment its share of the total width', () => {
    const widths = statusBreakdown(data).rows.map(row => row.share)
    expect(widths.reduce((sum, value) => sum + value, 0)).toBeCloseTo(100, 5)
    expect(widths[2]).toBeCloseTo((16 / 42) * 100, 5)
  })
  it('lists all four statuses with zero when a status is missing, and no NaN when there are no bookings', () => {
    const result = statusBreakdown([])
    expect(result.rows.map(row => [row.status, row.count, row.share])).toEqual([['On hold', 0, 0], ['Booked', 0, 0], ['Completed', 0, 0], ['Cancelled', 0, 0]])
    expect(result.total).toBe(0)
  })
})

describe('trend (FR-009 (2), BR-019)', () => {
  it('titles the line by granularity', () => {
    expect(trendTitle('Daily')).toBe('Xu hướng đặt chỗ theo ngày')
    expect(trendTitle('Weekly')).toBe('Xu hướng đặt chỗ theo tuần')
    expect(trendTitle('Monthly')).toBe('Xu hướng đặt chỗ theo tháng')
  })
  it('draws one point per period, highest count at the top, in order', () => {
    const line = trendLine([
      { periodStart: '2026-10-01', count: 2 },
      { periodStart: '2026-10-02', count: 6 },
      { periodStart: '2026-10-03', count: 0 },
    ], 'Daily', { width: 300, height: 100, pad: 10 })
    expect(line.points.map(point => point.x)).toEqual([10, 150, 290])
    expect(line.points.map(point => point.y)).toEqual([100 - 10 - (2 / 6) * 80, 10, 90])
    expect(line.path.startsWith('M10 ')).toBe(true)
    expect(line.points.map(point => point.label)).toEqual(['01/10', '02/10', '03/10'])
  })
  it('labels months as "T<month>" for Monthly granularity', () => {
    const line = trendLine([{ periodStart: '2026-05-01', count: 1 }, { periodStart: '2026-06-01', count: 1 }], 'Monthly', { width: 200, height: 100, pad: 10 })
    expect(line.points.map(point => point.label)).toEqual(['T5', 'T6'])
  })
  it('centres a single point and keeps a flat zero line on the baseline', () => {
    expect(trendLine([{ periodStart: '2026-10-01', count: 3 }], 'Daily', { width: 200, height: 100, pad: 10 }).points[0].x).toBe(100)
    expect(trendLine([{ periodStart: '2026-10-01', count: 0 }, { periodStart: '2026-10-02', count: 0 }], 'Daily', { width: 200, height: 100, pad: 10 }).points.map(point => point.y)).toEqual([90, 90])
  })
})
