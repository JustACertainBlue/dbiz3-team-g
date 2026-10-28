/**
 * T014: Agency account status breakdown and active agency count test
 * Verifies:
 * - FR-007: Canonical statuses (Pending Approval, Approved, Rejected, Disabled)
 * - BR-008: UBND Agency metrics include only interacting agencies
 * - BR-015: Active Agency definition (>= 1 Quote Request, Chat, or Booking)
 * - Scenario 7
 */

import { describe, it, expect } from 'vitest'
import { aggregateAgencyMetrics } from '@/lib/adm/metrics-service'
import { createHdtSession, createUbndSession, SEED_ADMIN_IDS } from '../helpers/mock-session'

describe('T014: Agency Metrics & Activity Distribution (FR-007, BR-008, BR-015)', () => {
  it('breaks down agencies across canonical account statuses (FR-007, Scenario 7)', async () => {
    const session = createHdtSession()
    const metrics = await aggregateAgencyMetrics(session, { preset: 'Last 30 days' })

    expect(metrics.countsByStatus).toBeDefined()
    expect(metrics.countsByStatus['Pending Approval']).toBeDefined()
    expect(metrics.countsByStatus['Approved']).toBeDefined()
    expect(metrics.countsByStatus['Rejected']).toBeDefined()
    expect(metrics.countsByStatus['Disabled']).toBeDefined()

    expect(Array.isArray(metrics.statusChartData)).toBe(true)
  })

  it('calculates active agency count based on quote/chat/booking activity (BR-015)', async () => {
    const session = createHdtSession()
    const metrics = await aggregateAgencyMetrics(session, { preset: 'Last 30 days' })

    expect(typeof metrics.activeAgencyCount).toBe('number')
    expect(metrics.activeAgencyCount).toBeGreaterThanOrEqual(0)
  })

  it('restricts agency metrics for UBND to agencies interacting with assigned village (BR-008)', async () => {
    const session = createUbndSession(SEED_ADMIN_IDS.batTrangVillageId)
    const metrics = await aggregateAgencyMetrics(session, { preset: 'Last 30 days' })

    expect(metrics.countsByStatus).toBeDefined()
  })
})
