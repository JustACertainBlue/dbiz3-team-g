/**
 * T015: Provider status matrix by village and activity distribution test
 * Verifies:
 * - FR-008: Account status (Active, Disabled) & verification status by village
 * - BR-009: UBND Provider metrics limited to assigned village
 * - BR-016: Active Provider definition (>= 1 Quote Request received, Chat, or Booking)
 * - Scenario 8
 */

import { describe, it, expect } from 'vitest'
import { aggregateProviderMetrics } from '@/lib/adm/metrics-service'
import { createHdtSession, createUbndSession, SEED_ADMIN_IDS } from '../helpers/mock-session'

describe('T015: Provider Metrics & Verification Matrix (FR-008, BR-009, BR-016)', () => {
  it('breaks down providers by village, account status, and verification status (FR-008)', async () => {
    const session = createHdtSession()
    const metrics = await aggregateProviderMetrics(session, { preset: 'Last 30 days' })

    expect(Array.isArray(metrics.countsByVillageAndStatus)).toBe(true)
    for (const v of metrics.countsByVillageAndStatus) {
      expect(v.villageId).toBeDefined()
      expect(v.villageName).toBeDefined()
      expect(v.accountStatus).toBeDefined()
      expect(v.verificationStatus).toBeDefined()
    }
  })

  it('reports provider activity distribution by craft type and activity type (FR-008)', async () => {
    const session = createHdtSession()
    const metrics = await aggregateProviderMetrics(session, { preset: 'Last 30 days' })

    expect(Array.isArray(metrics.activityDistribution)).toBe(true)
    for (const item of metrics.activityDistribution) {
      expect(item.craftType).toBeDefined()
      expect(['Quote Request', 'Chat', 'Booking']).toContain(item.activityType)
      expect(typeof item.count).toBe('number')
    }
  })

  it('restricts providers to assigned village for UBND Admin (BR-009, Scenario 8)', async () => {
    const batTrangVillage = SEED_ADMIN_IDS.batTrangVillageId
    const session = createUbndSession(batTrangVillage)
    const metrics = await aggregateProviderMetrics(session, { preset: 'Last 30 days' })

    expect(metrics.countsByVillageAndStatus.length).toBeLessThanOrEqual(1)
    if (metrics.countsByVillageAndStatus.length > 0) {
      expect(metrics.countsByVillageAndStatus[0].villageId).toBe(batTrangVillage)
    }
  })
})

// T062 (A13) + T064 (A14): no invented numbers; UBND Quote Requests scoped by the Experience's Provider.
describe('T062/T064 | A13 + A14 provider metrics', () => {
  const P1 = { preset: 'Custom' as const, startDate: '2026-09-20T00:00:00+07:00', endDate: '2026-09-25T23:59:59+07:00' }

  it('A13: UBND Hạ Thái → 0 active Providers and no placeholder activity rows', async () => {
    const m = await aggregateProviderMetrics(createUbndSession(SEED_ADMIN_IDS.haThaiVillageId), P1)
    expect(m.activeProviderCount).toBe(0)
    expect(m.activityDistribution.filter(a => a.count > 0)).toEqual([])
    expect(m.activityDistribution.some(a => a.craftType === 'Ceramics')).toBe(false)
  })

  it('A13: HDT in an empty period → 0 active Providers (no fallback to the Provider total)', async () => {
    const m = await aggregateProviderMetrics(createHdtSession(), { preset: 'Custom', startDate: '2026-08-01T00:00:00+07:00', endDate: '2026-08-10T23:59:59+07:00' })
    expect(m.activeProviderCount).toBe(0)
  })

  it('A14: UBND Bát Tràng Quote Requests = 2, under craft type Ceramics (not General Craft)', async () => {
    const m = await aggregateProviderMetrics(createUbndSession(SEED_ADMIN_IDS.batTrangVillageId), P1)
    const quotes = m.activityDistribution.filter(a => a.activityType === 'Quote Request')
    expect(quotes).toEqual([{ craftType: 'Ceramics', activityType: 'Quote Request', count: 2 }])
  })
})
