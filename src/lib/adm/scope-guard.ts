/**
 * Server-side Administrative Scope Guard
 * Enforces BR-001, BR-002, BR-003, BR-004, AC-ADM-SCOPE.
 */

import { AdminScope } from './types'

export interface SessionLike {
  role?: string
  adminType?: string | null
  villageId?: string | null
  userId?: string | null
  authenticated?: boolean
}

/**
 * Resolves the effective administrative scope for the current actor.
 * - HDT Admins have platform-wide access and can filter by any village or All Villages.
 * - UBND Admins are strictly locked to their assigned village; requested village filters are forced to the assigned village.
 * - Non-admin or unauthenticated requests are rejected.
 */
export function resolveAdminScope(
  session: SessionLike | null | undefined,
  requestedVillageId: string | null = null
): AdminScope {
  if (!session || !session.authenticated || !['ADMIN', 'HDT', 'UBND'].includes(session.role ?? '')) {
    throw new Error('Forbidden: Administrator privileges required.')
  }

  const adminType = session.adminType || (session.role === 'HDT' ? 'HDT' : session.role === 'UBND' ? 'UBND' : null)

  if (adminType === 'HDT') {
    return {
      role: 'ADMIN',
      adminType: 'HDT',
      assignedVillageId: null,
      effectiveVillageId: requestedVillageId || null,
      isVillageFilterLocked: false,
    }
  }

  if (adminType === 'UBND') {
    const assignedVillage = session.villageId || null
    if (!assignedVillage) {
      throw new Error('Forbidden: UBND Admin requires an assigned village.')
    }

    // BR-002, BR-003, AC-ADM-SCOPE: Ignore any requested village and force assigned village
    return {
      role: 'ADMIN',
      adminType: 'UBND',
      assignedVillageId: assignedVillage,
      effectiveVillageId: assignedVillage,
      isVillageFilterLocked: true,
    }
  }

  throw new Error('Forbidden: Unrecognized administrator type.')
}
