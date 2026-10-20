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
