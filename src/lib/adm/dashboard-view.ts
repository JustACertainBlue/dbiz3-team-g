// ADM079 view helpers for design wave 4 screen 5 (Figma "Màn 5"). Content stays inside spec-ADM:
// FR-003 / SR-004 four cards, FR-009 (1) status breakdown with counts + percentages as a stacked bar,
// FR-009 (2) booking trend as a line with BR-019 granularity, SR-003 HDT platform-wide / UBND own village.
import { hanoiDate } from '@/lib/time/hanoi-time'
import type { BookingStatus, BookingStatusItem, BookingTrendItem, MetricCard, TrendGranularity } from './types'

/** Village scope → that village; no village (HDT, all villages) → the whole city. */
export const dashboardTitle = (villageName: string | null) => villageName ? `Dashboard làng ${villageName}` : 'Dashboard toàn thành phố'

const METRIC_LABELS: Record<MetricCard['label'], string> = {
  'Total Agencies': 'Tổng số Agency',
  'Total Providers': 'Tổng số Provider',
  'Total Bookings': 'Tổng số đặt chỗ',
  'Active Collaborations': 'Cặp hợp tác đang hoạt động',
}
export const metricLabel = (label: string) => METRIC_LABELS[label as MetricCard['label']] ?? label

const LIFECYCLE: BookingStatus[] = ['On hold', 'Booked', 'Completed', 'Cancelled']

/** Every booking status in lifecycle order, with its count, the server percentage and its share of the bar. */
export function statusBreakdown(data: BookingStatusItem[]) {
  const total = data.reduce((sum, item) => sum + item.count, 0)
  const rows = LIFECYCLE.map(status => {
    const item = data.find(entry => entry.status === status)
    const count = item?.count ?? 0
    return { status, count, pct: item?.pct ?? 0, share: total > 0 ? (count / total) * 100 : 0 }
  })
  return { total, rows }
}

const GRANULARITY_WORD: Record<TrendGranularity, string> = { Daily: 'ngày', Weekly: 'tuần', Monthly: 'tháng' }
export const trendTitle = (granularity: TrendGranularity) => `Xu hướng đặt chỗ theo ${GRANULARITY_WORD[granularity]}`

const periodDate = (value: string) => value.length > 10 ? hanoiDate(value) : value
const periodLabel = (value: string, granularity: TrendGranularity) => {
  const date = periodDate(value)
  return granularity === 'Monthly' ? `T${Number(date.slice(5, 7))}` : `${date.slice(8, 10)}/${date.slice(5, 7)}`
}

/** SVG line for the trend chart: x spread evenly, y from the baseline (0) up to the highest count. */
export function trendLine(series: BookingTrendItem[], granularity: TrendGranularity, box: { width: number; height: number; pad: number }) {
  const max = Math.max(0, ...series.map(item => item.count))
  const innerWidth = box.width - 2 * box.pad
  const innerHeight = box.height - 2 * box.pad
  const points = series.map((item, index) => ({
    x: series.length === 1 ? box.width / 2 : box.pad + (index * innerWidth) / (series.length - 1),
    y: max === 0 ? box.height - box.pad : box.height - box.pad - (item.count / max) * innerHeight,
    count: item.count,
    label: periodLabel(item.periodStart, granularity),
  }))
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x} ${point.y}`).join(' ')
  return { path, points }
}
