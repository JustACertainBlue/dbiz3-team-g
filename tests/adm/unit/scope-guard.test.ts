/**
 * T006: Server-side administrative scope guard and village isolation test
 * Verifies:
 * - BR-001: HDT platform-wide scope
 * - BR-002: UBND scope limited to assigned village
 * - BR-003: UBND village filter fixed and unchangeable
 * - BR-004: HDT can select one village or All Villages
 * - AC-ADM-SCOPE: Server forces assigned village when client requests another village
 */

import { describe, it, expect } from 'vitest'
import { resolveAdminScope } from '@/lib/adm/scope-guard'
import {
  createHdtSession,
  createUbndSession,
  createUnauthorizedSession,
  createGuestSession,
  SEED_ADMIN_IDS,
} from '../helpers/mock-session'

describe('T006: Server-side Administrative Scope Guard (BR-001..BR-004, AC-ADM-SCOPE)', () => {
  describe('HDT Admin Scope (BR-001, BR-004)', () => {
    it('grants platform-wide view when no village filter is requested (BR-001)', () => {
      const session = createHdtSession()
      const scope = resolveAdminScope(session, null)

      expect(scope.role).toBe('ADMIN')
      expect(scope.adminType).toBe('HDT')
      expect(scope.assignedVillageId).toBeNull()
      expect(scope.effectiveVillageId).toBeNull() // All Villages
      expect(scope.isVillageFilterLocked).toBe(false)
    })

    it('allows HDT to select a specific village filter (BR-004)', () => {
      const session = createHdtSession()
      const requestedVillage = SEED_ADMIN_IDS.batTrangVillageId
      const scope = resolveAdminScope(session, requestedVillage)

      expect(scope.effectiveVillageId).toBe(requestedVillage)
      expect(scope.isVillageFilterLocked).toBe(false)
    })
  })

  describe('UBND Admin Scope (BR-002, BR-003, AC-ADM-SCOPE)', () => {
    it('restricts UBND to assigned village and locks filter (BR-002, BR-003)', () => {
      const assignedVillage = SEED_ADMIN_IDS.batTrangVillageId
      const session = createUbndSession(assignedVillage)
      const scope = resolveAdminScope(session, null)

      expect(scope.role).toBe('ADMIN')
      expect(scope.adminType).toBe('UBND')
      expect(scope.assignedVillageId).toBe(assignedVillage)
      expect(scope.effectiveVillageId).toBe(assignedVillage)
      expect(scope.isVillageFilterLocked).toBe(true)
    })

    it('forces assigned village when client attempts cross-village filter (AC-ADM-SCOPE)', () => {
      const assignedVillage = SEED_ADMIN_IDS.batTrangVillageId
      const tamperedVillage = SEED_ADMIN_IDS.vanPhucVillageId
      const session = createUbndSession(assignedVillage)

      // UBND attempts to query Vạn Phúc instead of Bát Tràng
      const scope = resolveAdminScope(session, tamperedVillage)

      // Server MUST force the assigned village; never permit tampered scope
      expect(scope.effectiveVillageId).toBe(assignedVillage)
      expect(scope.effectiveVillageId).not.toBe(tamperedVillage)
      expect(scope.isVillageFilterLocked).toBe(true)
    })
  })

  describe('Role-Based Access Enforcement', () => {
    it('rejects unauthenticated or non-admin sessions', () => {
      const unauthorized = createUnauthorizedSession()
      expect(() => resolveAdminScope(unauthorized, null)).toThrow(/Forbidden|Unauthorized/i)

      const guest = createGuestSession()
      expect(() => resolveAdminScope(guest, null)).toThrow(/Forbidden|Unauthorized/i)
    })
  })
})
