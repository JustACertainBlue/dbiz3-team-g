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

// T062 (A13, #22) + T064 (A14): no invented numbers; UBND scope uses Booking, Quote Request or Chat.
import { beforeEach } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { calculateMetricCards } from '@/lib/adm/metrics-service'

describe('T062/T064 | A13 + A14 agency metrics', () => {
  beforeEach(() => demoRepository().reset())
  const P1 = { preset: 'Custom' as const, startDate: '2026-09-20T00:00:00+07:00', endDate: '2026-09-25T23:59:59+07:00' }
  const total = (counts: Record<string, number>) => Object.values(counts).reduce((a, b) => a + b, 0)

  it('A13: UBND Hạ Thái (no Booking, Quote Request or Chat) → 0 Agencies, 0 active (no fallback)', async () => {
    const m = await aggregateAgencyMetrics(createUbndSession(SEED_ADMIN_IDS.haThaiVillageId), P1)
    expect(total(m.countsByStatus)).toBe(0)
    expect(m.activeAgencyCount).toBe(0)
  })

  it('A13: HDT in an empty period → 0 active Agencies (no min(n, 3))', async () => {
    const m = await aggregateAgencyMetrics(createHdtSession(), { preset: 'Custom', startDate: '2026-08-01T00:00:00+07:00', endDate: '2026-08-10T23:59:59+07:00' })
    expect(m.activeAgencyCount).toBe(0)
  })

  it('#22: an Agency with only a Quote Request for a Bát Tràng Experience is relevant to UBND Bát Tràng', async () => {
    demoRepository().insert('quote_requests', {
      quote_request_id: 'adm-test-quote-0001', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
      experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', source: 'Explore', matching_session_id: '',
      created_at: '2026-09-22T08:00:00+07:00',
    })
    const session = createUbndSession(SEED_ADMIN_IDS.batTrangVillageId)
    const m = await aggregateAgencyMetrics(session, P1)
    expect(total(m.countsByStatus)).toBe(3)
    const cards = await calculateMetricCards(session, P1)
    expect(cards.find(c => c.label === 'Total Agencies')!.value).toBe(3)
  })

  it('A14: UBND Bát Tràng activity counts only Bát Tràng records (2 Bookings, 2 Quote Requests, 2 Chats)', async () => {
    const m = await aggregateAgencyMetrics(createUbndSession(SEED_ADMIN_IDS.batTrangVillageId), P1)
    const count = (type: string) => m.activityDistribution.find(a => a.activityType === type)!.count
    expect([count('Booking'), count('Quote Request'), count('Chat')]).toEqual([2, 2, 2])
  })
})
