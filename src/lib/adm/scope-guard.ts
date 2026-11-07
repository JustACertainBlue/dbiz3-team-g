/**
 * Server-side Administrative Scope Guard
 * Enforces BR-001, BR-002, BR-003, BR-004, AC-ADM-SCOPE.
 */

import { AdminScope } from './types'
import { toSessionContext, type SessionLike } from '@/lib/auth/session'

export type { SessionLike } from '@/lib/auth/session'

/**
 * Resolves the effective administrative scope for the current actor.
 * - HDT Admins have platform-wide access and can filter by any village or All Villages.
 * - UBND Admins are strictly locked to their assigned village; requested village filters are forced to the assigned village.
 * - Non-admin or unauthenticated requests are rejected.
 */
export async function resolveAdminScope(
  session: SessionLike | null | undefined,
  requestedVillageId: string | null = null
): Promise<AdminScope> {
  if (!session) {
    throw new Error('Forbidden: Administrator privileges required.')
  }

  const actor = (await toSessionContext(session))
  if (!actor.authenticated || actor.role !== 'ADMIN') {
    throw new Error('Forbidden: Administrator privileges required.')
  }

  const adminType = actor.adminType

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
    const assignedVillage = actor.assignedVillageId
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
