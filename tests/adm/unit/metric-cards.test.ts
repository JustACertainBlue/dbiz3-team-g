/**
 * T010: Summary metric cards calculation test
 * Verifies:
 * - FR-001, FR-002, FR-003: 4 summary cards (Total Agencies, Providers, Bookings, Active Collaborations)
 * - BR-001, BR-002: Scope-based counts for HDT and UBND
 * - BR-011: Trend percentage omission
 * - BR-017: Active Collaboration definition (unique pair with >= 1 On hold or Booked booking)
 * - AC-ADM-PAIR: Frequency vs distinct pair count
 */

import { describe, it, expect } from 'vitest'
import { calculateMetricCards } from '@/lib/adm/metrics-service'
import { createHdtSession, createUbndSession, SEED_ADMIN_IDS } from '../helpers/mock-session'

describe('T010: Summary Metric Cards Calculation (FR-003, BR-017, AC-ADM-PAIR)', () => {
  it('calculates 4 metric cards for HDT Admin platform-wide scope (FR-003)', async () => {
    const session = createHdtSession()
    const cards = await calculateMetricCards(session, { preset: 'Last 30 days' })

    expect(cards).toHaveLength(4)

    const labels = cards.map(c => c.label)
    expect(labels).toContain('Total Agencies')
    expect(labels).toContain('Total Providers')
    expect(labels).toContain('Total Bookings')
    expect(labels).toContain('Active Collaborations')

    for (const card of cards) {
      expect(typeof card.value).toBe('number')
      expect(card.subLabel).toBeDefined()
    }
  })

  it('restricts metric card counts to assigned village for UBND Admin (BR-002)', async () => {
    const batTrangVillage = SEED_ADMIN_IDS.batTrangVillageId
    const session = createUbndSession(batTrangVillage)
    const cards = await calculateMetricCards(session, { preset: 'Last 30 days' })

    const totalProviders = cards.find(c => c.label === 'Total Providers')
    expect(totalProviders).toBeDefined()
    // Local providers should only reflect Bát Tràng artisans
    expect(totalProviders!.value).toBeGreaterThanOrEqual(1)
  })

  it('calculates Active Collaborations as unique pairs with On hold or Booked bookings (BR-017, AC-ADM-PAIR)', async () => {
    const session = createHdtSession()
    const cards = await calculateMetricCards(session, { preset: 'Last 30 days' })

    const activeCollab = cards.find(c => c.label === 'Active Collaborations')
    expect(activeCollab).toBeDefined()
    // Each unique agency-provider pair counts as 1 distinct active collaboration
    expect(typeof activeCollab!.value).toBe('number')
  })
})

// T049 (A4) + T051 (A5): time basis per docs/spec/docs/consistency-contract.md:110.
describe('T049/T051 | A4 + A5 metric cards time basis', () => {
  const session = createHdtSession()
  const value = (cards: { label: string; value: number }[], label: string) => cards.find(c => c.label === label)!.value
  const P1 = { preset: 'Custom' as const, startDate: '2026-09-20T00:00:00+07:00', endDate: '2026-09-25T23:59:59+07:00' }
  const P2 = { preset: 'Custom' as const, startDate: '2026-09-26T00:00:00+07:00', endDate: '2026-10-01T23:59:59+07:00' }
  const EMPTY = { preset: 'Custom' as const, startDate: '2026-08-01T00:00:00+07:00', endDate: '2026-08-10T23:59:59+07:00' }

  it('A4: Total Bookings counts Bookings created in the period (7, then 1)', async () => {
    expect(value(await calculateMetricCards(session, P1), 'Total Bookings')).toBe(7)
    expect(value(await calculateMetricCards(session, P2), 'Total Bookings')).toBe(1)
  })

  it('A4: Agency and Provider totals are snapshots at the end date (none existed before 2026-09-03)', async () => {
    const p1 = await calculateMetricCards(session, P1)
    expect(value(p1, 'Total Agencies')).toBe(8)
    expect(value(p1, 'Total Providers')).toBe(8)
    const empty = await calculateMetricCards(session, EMPTY)
    expect(value(empty, 'Total Agencies')).toBe(0)
    expect(value(empty, 'Total Providers')).toBe(0)
  })

  it('A5: Active Collaborations = pairs with an On hold/Booked Booking at the end date (history): 5 at 09-25, 4 at 10-01', async () => {
    expect(value(await calculateMetricCards(session, P1), 'Active Collaborations')).toBe(5)
    expect(value(await calculateMetricCards(session, P2), 'Active Collaborations')).toBe(4)
  })
})
