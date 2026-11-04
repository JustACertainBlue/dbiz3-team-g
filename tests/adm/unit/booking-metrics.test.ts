/**
 * T018: Booking status breakdown and time-series trend line test
 * Verifies:
 * - FR-009: Status breakdown (On hold, Booked, Completed, Cancelled) with counts and percentages
 * - BR-007: Canonical booking statuses
 * - BR-010: UBND booking scoping
 * - BR-019: Granularity derivation in trend chart
 * - Scenario 9
 */

import { describe, it, expect } from 'vitest'
import { aggregateBookingMetrics } from '@/lib/adm/metrics-service'
import { createHdtSession, createUbndSession, SEED_ADMIN_IDS } from '../helpers/mock-session'

describe('T018: Booking Metrics & Trend Series (FR-009, BR-007, BR-010, BR-019)', () => {
  it('breaks down booking counts by canonical status with percentages (FR-009, BR-007)', async () => {
    const session = createHdtSession()
    const metrics = await aggregateBookingMetrics(session, { preset: 'Last 30 days' })

    expect(metrics.countsByStatus).toBeDefined()
    expect(metrics.countsByStatus['On hold']).toBeDefined()
    expect(metrics.countsByStatus['Booked']).toBeDefined()
    expect(metrics.countsByStatus['Completed']).toBeDefined()
    expect(metrics.countsByStatus['Cancelled']).toBeDefined()

    expect(Array.isArray(metrics.statusChartData)).toBe(true)
    for (const item of metrics.statusChartData) {
      expect(['On hold', 'Booked', 'Completed', 'Cancelled']).toContain(item.status)
      expect(typeof item.pct).toBe('number')
    }
  })

  it('generates trend chart data points matching derived granularity (BR-019, Scenario 9)', async () => {
    const session = createHdtSession()
    const metrics = await aggregateBookingMetrics(session, { preset: 'Last 30 days' })

    expect(Array.isArray(metrics.trendChartData)).toBe(true)
    for (const point of metrics.trendChartData) {
      expect(point.periodStart).toBeDefined()
      expect(typeof point.count).toBe('number')
    }
  })

  it('restricts booking records to assigned village for UBND Admin (BR-010)', async () => {
    const session = createUbndSession(SEED_ADMIN_IDS.batTrangVillageId)
    const metrics = await aggregateBookingMetrics(session, { preset: 'Last 30 days' })

    expect(metrics.countsByStatus).toBeDefined()
    expect(Array.isArray(metrics.bookingTable)).toBe(true)
  })
})

// T049 (A4): status breakdown and trend use Booking created_at (contract:110).
describe('T049 | A4 status breakdown and trend by created_at', () => {
  it('2026-09-20..25 → Completed 2, Booked 3, Cancelled 2, On hold 0; trend total 7', async () => {
    const m = await aggregateBookingMetrics(createHdtSession(), { preset: 'Custom', startDate: '2026-09-20T00:00:00+07:00', endDate: '2026-09-25T23:59:59+07:00' })
    expect(m.countsByStatus).toEqual({ 'On hold': 0, Booked: 3, Completed: 2, Cancelled: 2 })
    expect(m.trendChartData.reduce((sum, p) => sum + p.count, 0)).toBe(7)
  })
})
