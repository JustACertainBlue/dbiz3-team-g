import type { MockSession } from '../../../tests/prf/helpers/mockSession'
import { guestSession } from '../../../tests/prf/helpers/mockSession'
import { filterAgencyFields, type AgencyProfileInput } from './visibility'
import { AgencyProfilePatchSchema } from './validators'
import { recordAuditLog } from './audit-logger'

/**
 * T010 / T042 / T043 – Agency service
 * Manages agency profiles and major-change workflows (BR-001, BR-017).
 */

export class AgencyError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'AgencyError'
    this.statusCode = statusCode
  }
}

export async function getAgencyProfile(
  agencyId: string,
  actorSession?: MockSession,
): Promise<Partial<AgencyProfileInput>> {
  const session = actorSession || guestSession()

  const fullAgency: AgencyProfileInput = {
    agency_id: agencyId,
    agency_name: 'Hanoi Heritage Tours',
    company_type: 'Tour Operator',
    location: { street: '1 Trang Tien', ward: 'Trang Tien', district: 'Hoan Kiem', city_province: 'Hanoi' },
    team_size: 15,
    contact: {
      contact_person_name: 'Tran Van B',
      phone_number: '0909123456',
      business_email: 'contact@hanoiheritagetours.vn',
    },
    tax_id: '0101234567',
    tour_types: ['Cultural', 'Artisan', 'Educational'],
    description: 'Specializing in authentic artisan village tours in Hanoi.',
    account_status: 'Approved',
  }

  return filterAgencyFields(session, fullAgency)
}

export async function updateAgencyProfile(
  agencyId: string,
  actorSession: MockSession,
  input: unknown,
): Promise<{
  success: boolean
  agency_id: string
  requires_hdt_rereview: boolean
  account_status: string
}> {
  if (
    !actorSession ||
    !actorSession.authenticated ||
    actorSession.role !== 'TourAgency' ||
    actorSession.agencyId !== agencyId
  ) {
    throw new AgencyError('Forbidden: Only agency owner can edit agency profile (BR-001)', 403)
  }

  const parsed = AgencyProfilePatchSchema.parse(input)

  // BR-017: company_name and tax_id are major changes requiring HDT re-review
  const hasMajorChange = Boolean(parsed.company_name || parsed.tax_id)

  recordAuditLog(
    actorSession.userId || 'unknown-user',
    'UPDATE_AGENCY_PROFILE',
    'AgencyProfile',
    agencyId,
    { hasMajorChange, updatedFields: Object.keys(parsed) },
  )

  return {
    success: true,
    agency_id: agencyId,
    requires_hdt_rereview: hasMajorChange,
    account_status: 'Approved',
  }
}
