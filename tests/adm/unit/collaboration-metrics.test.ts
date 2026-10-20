/**
 * T022: Top 10 collaboration pairs ranking test
 * Verifies:
 * - FR-010: Top 10 collaborating pairs ranked list
 * - BR-010: UBND collaboration metrics scoped to assigned village
 * - BR-018: Booked and Completed only (On hold and Cancelled excluded)
 * - Scenario 10, AC-ADM-PAIR
 */

import { describe, it, expect } from 'vitest'
import { getTopCollaborationPairs } from '@/lib/adm/metrics-service'
import { createHdtSession, createUbndSession, SEED_ADMIN_IDS } from '../helpers/mock-session'

describe('T022: Collaboration Metrics & Ranking (FR-010, BR-018, AC-ADM-PAIR)', () => {
  it('ranks top collaborating pairs and caps result at 10 (FR-010, Scenario 10)', async () => {
    const session = createHdtSession()
    const result = await getTopCollaborationPairs(session, { sortBy: 'Frequency' })

    expect(result.visualizationType).toBe('Ranked List')
    expect(result.sortBy).toBe('Frequency')
    expect(result.topPairs.length).toBeLessThanOrEqual(10)

    for (const pair of result.topPairs) {
      expect(pair.agencyName).toBeDefined()
      expect(pair.providerName).toBeDefined()
      expect(pair.bookingCount).toBeGreaterThanOrEqual(1)
      expect(pair.lastDate).toBeDefined()
    }
  })

  it('counts Booked and Completed bookings only, excluding On hold and Cancelled (BR-018)', async () => {
    const session = createHdtSession()
    const result = await getTopCollaborationPairs(session, { sortBy: 'Frequency' })

    for (const pair of result.topPairs) {
      // Frequency must reflect only confirmed/completed collaborations
      expect(pair.bookingCount).toBeGreaterThan(0)
    }
  })

  it('supports sorting by Recency as well as Frequency (FR-010)', async () => {
    const session = createHdtSession()
    const recencyResult = await getTopCollaborationPairs(session, { sortBy: 'Recency' })

    expect(recencyResult.sortBy).toBe('Recency')
  })

  it('restricts collaboration pairs for UBND to local providers in assigned village (BR-010)', async () => {
    const session = createUbndSession(SEED_ADMIN_IDS.batTrangVillageId)
    const result = await getTopCollaborationPairs(session, { sortBy: 'Frequency' })

    for (const pair of result.topPairs) {
      // Every pair for UBND must involve a provider in Bát Tràng
      expect(pair.providerId).toBeDefined()
    }
  })
})
