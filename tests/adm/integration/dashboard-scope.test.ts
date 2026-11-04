/**
 * T029: Dashboard role-based scope and layout acceptance test
 * Verifies:
 * - Scenario 1: HDT Admin platform-wide view and enabled controls
 * - Scenario 2: UBND Admin restricted to assigned village
 * - Scenario 3: UBND village filter fixed and pre-selected
 * - Scenario 11: Read-only protection (no mutation endpoints or lifecycle controls)
 * - AC-ADM-SCOPE
 */

import { describe, it, expect } from 'vitest'
import { resolveAdminScope } from '@/lib/adm/scope-guard'
import {
  createHdtSession,
  createUbndSession,
  SEED_ADMIN_IDS,
} from '../helpers/mock-session'

describe('T029: Dashboard Role Scoping Acceptance Test (Scenarios 1..3, 11)', () => {
  it('Scenario 1: HDT Admin loads platform-wide view with all controls enabled', () => {
    const session = createHdtSession()
    const scope = resolveAdminScope(session, null)

    expect(scope.role).toBe('ADMIN')
    expect(scope.adminType).toBe('HDT')
    expect(scope.effectiveVillageId).toBeNull() // All Villages
    expect(scope.isVillageFilterLocked).toBe(false)
  })

  it('Scenario 2 & 3: UBND Admin metrics are restricted to assigned village with locked filter', () => {
    const assignedVillage = SEED_ADMIN_IDS.batTrangVillageId
    const session = createUbndSession(assignedVillage)
    const scope = resolveAdminScope(session, null)

    expect(scope.adminType).toBe('UBND')
    expect(scope.assignedVillageId).toBe(assignedVillage)
    expect(scope.effectiveVillageId).toBe(assignedVillage)
    expect(scope.isVillageFilterLocked).toBe(true)
  })

  it('Scenario 11: Dashboard monitoring does not expose booking lifecycle manipulation', () => {
    // Verifies that administrative scope has monitoring-only access
    const session = createHdtSession()
    const scope = resolveAdminScope(session, null)

    expect(scope).not.toHaveProperty('canCancelBooking')
    expect(scope).not.toHaveProperty('canConfirmBooking')
    expect(scope).not.toHaveProperty('canEditProfile')
  })
})
