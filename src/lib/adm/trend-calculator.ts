/**
 * Trend Calculator and Date Range Derivation
 * Enforces FR-003, BR-011, BR-019.
 */

import { TrendDirection, TrendGranularity, TimePreset } from './types'

/**
 * Derives trend granularity based on calendar day difference (BR-019).
 * - 1 to 31 days: Daily
 * - 32 to 180 days: Weekly
 * - > 180 days: Monthly
 */
export function deriveGranularity(
  startDate: Date | string,
  endDate: Date | string
): TrendGranularity {
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  const diffDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)))

  if (diffDays <= 31) {
    return 'Daily'
  }
  if (diffDays <= 180) {
    return 'Weekly'
  }
  return 'Monthly'
}

/**
 * Calculates the comparable previous period of identical calendar day length (FR-003).
 */
export function calculatePreviousPeriod(
  startDate: Date | string,
  endDate: Date | string
): { prevStartDate: Date; prevEndDate: Date } {
  const start = new Date(startDate)
  const end = new Date(endDate)
  const durationMs = end.getTime() - start.getTime()

  const prevEndDate = new Date(start.getTime() - 1)
  const prevStartDate = new Date(prevEndDate.getTime() - durationMs)

  return { prevStartDate, prevEndDate }
}

/**
 * Computes trend percentage and direction against a comparable previous period (BR-011, SC-009).
 */
export function calculateTrendPercentage(
  currentValue: number,
  previousValue: number | null
): { trendPct: number | null; trendDirection: TrendDirection } {
  if (previousValue == null) {
    return { trendPct: null, trendDirection: null }
  }

  if (previousValue === 0) {
    if (currentValue === 0) {
      return { trendPct: 0.0, trendDirection: 'Flat' }
    }
    return { trendPct: 100.0, trendDirection: 'Up' }
  }

  const change = currentValue - previousValue
  const rawPct = (change / previousValue) * 100
  const trendPct = Math.round(rawPct * 10) / 10

  let trendDirection: TrendDirection = 'Flat'
  if (trendPct > 0) trendDirection = 'Up'
  else if (trendPct < 0) trendDirection = 'Down'

  return { trendPct, trendDirection }
}

/**
 * Resolves date range bounds from preset or custom parameters (FR-004).
 */
export function resolveDateRange(
  preset: TimePreset = 'Last 30 days',
  customStart?: string,
  customEnd?: string
): { startDate: Date; endDate: Date; granularity: TrendGranularity } {
  const now = new Date()
  const end = new Date(now)
  let start = new Date(now)

  switch (preset) {
    case 'Last 7 days':
      start.setDate(end.getDate() - 7)
      break
    case 'Last 30 days':
      start.setDate(end.getDate() - 30)
      break
    case 'Last 90 days':
      start.setDate(end.getDate() - 90)
      break
    case 'Last year':
      start.setFullYear(end.getFullYear() - 1)
      break
    case 'Custom':
      if (customStart && customEnd) {
        start = new Date(customStart)
        end.setTime(new Date(customEnd).getTime())
      } else {
        start.setDate(end.getDate() - 30)
      }
      break
    default:
      start.setDate(end.getDate() - 30)
  }

  const granularity = deriveGranularity(start, end)
  return { startDate: start, endDate: end, granularity }
}
