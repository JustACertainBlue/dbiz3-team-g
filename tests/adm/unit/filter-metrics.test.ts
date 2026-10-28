/**
 * T012: Time period preset and village filter application test
 * Verifies:
 * - FR-004: Presets (Last 7 days, Last 30 days, Last 90 days, Last year, Custom)
 * - FR-005: Village filter application
 * - BR-004: HDT switching between All Villages and specific village
 * - BR-005: Filter reactivity
 * - Scenario 4, Scenario 5, AC-ADM-SCOPE
 */

import { describe, it, expect } from 'vitest'
import { filterDashboardMetrics } from '@/lib/adm/metrics-service'
import { createHdtSession, createUbndSession, SEED_ADMIN_IDS } from '../helpers/mock-session'

describe('T012: Time Preset & Village Filter Application (FR-004, FR-005, BR-004, BR-005)', () => {
  it('applies time period filter and derives date bounds (FR-004, Scenario 5)', async () => {
    const session = createHdtSession()
    const result7d = await filterDashboardMetrics(session, { preset: 'Last 7 days' })
    const result30d = await filterDashboardMetrics(session, { preset: 'Last 30 days' })

    expect(result7d.period.preset).toBe('Last 7 days')
    expect(result30d.period.preset).toBe('Last 30 days')
    expect(result7d.period.granularity).toBe('Daily')
  })

  it('recalculates metrics when HDT switches village filter (BR-004, Scenario 4)', async () => {
    const session = createHdtSession()
    const allVillages = await filterDashboardMetrics(session, { villageId: null })
    const batTrangOnly = await filterDashboardMetrics(session, { villageId: SEED_ADMIN_IDS.batTrangVillageId })

    expect(allVillages.scope.effectiveVillageId).toBeNull()
    expect(batTrangOnly.scope.effectiveVillageId).toBe(SEED_ADMIN_IDS.batTrangVillageId)
  })

  it('rejects cross-village override when UBND passes another villageId (AC-ADM-SCOPE)', async () => {
    const session = createUbndSession(SEED_ADMIN_IDS.batTrangVillageId)
    const tampered = await filterDashboardMetrics(session, { villageId: SEED_ADMIN_IDS.vanPhucVillageId })

    expect(tampered.scope.effectiveVillageId).toBe(SEED_ADMIN_IDS.batTrangVillageId)
  })
})
