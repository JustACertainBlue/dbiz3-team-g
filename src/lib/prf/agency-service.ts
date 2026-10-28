import type { ActorSession } from '@/lib/auth/demo-session'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
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
  actorSession?: ActorSession,
): Promise<Partial<AgencyProfileInput>> {
  const session = actorSession || DEMO_IDENTITIES.guest
  const repository = demoRepository()
  const agency = repository.find('agency_profiles', row => row.agency_id === agencyId)
  if (!agency) throw new AgencyError('Agency profile not found', 404)
  const account = repository.find('user_accounts', row => row.user_id === agency.user_id)

  const parseObject = <T>(value: string, fallback: T): T => {
    try { return value ? JSON.parse(value) as T : fallback } catch { return fallback }
  }

  const fullAgency: AgencyProfileInput = {
    agency_id: agency.agency_id,
    agency_name: agency.company_name,
    company_type: agency.company_type,
    location: parseObject(agency.location, {}),
    team_size: Number(agency.team_size || 0),
    contact: parseObject(agency.contact_info, {}),
    tax_id: agency.tax_id,
    tour_types: parseObject(agency.tour_types, []),
    description: agency.description,
    account_status: account?.account_status || 'Unknown',
  }

  return filterAgencyFields(session, fullAgency)
}

export async function updateAgencyProfile(
  agencyId: string,
  actorSession: ActorSession,
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

  const repository = demoRepository()
  const existing = repository.find('agency_profiles', row => row.agency_id === agencyId)
  if (!existing) throw new AgencyError('Agency profile not found', 404)
  const raw = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const location = raw.location && typeof raw.location === 'object' ? raw.location as Record<string, unknown> : {}
  const contact = raw.contact_info && typeof raw.contact_info === 'object' ? raw.contact_info as Record<string, unknown> : {}
  const parsed = AgencyProfilePatchSchema.parse({ ...raw, ...location, ...contact })

  // BR-017: company_name and tax_id are major changes requiring HDT re-review
  const hasMajorChange = Boolean(
    (parsed.company_name && parsed.company_name !== existing.company_name) ||
    (parsed.tax_id && parsed.tax_id !== existing.tax_id),
  )

  const parseRecord = (value: string): Record<string, unknown> => {
    try { return value ? JSON.parse(value) as Record<string, unknown> : {} } catch { return {} }
  }
  const currentLocation = parseRecord(existing.location)
  const currentContact = parseRecord(existing.contact_info)
  const nextLocation = { ...currentLocation }
  const nextContact = { ...currentContact }
  for (const key of ['street', 'ward', 'district', 'city_province'] as const) {
    if (parsed[key] !== undefined) nextLocation[key] = parsed[key]
  }
  for (const key of ['contact_person_name', 'phone_number', 'business_email'] as const) {
    if (parsed[key] !== undefined) nextContact[key] = parsed[key]
  }
  const changes: Record<string, string> = { updated_at: new Date().toISOString() }
  if (parsed.company_name !== undefined) changes.company_name = parsed.company_name
  if (parsed.company_type !== undefined) changes.company_type = parsed.company_type
  if (parsed.tax_id !== undefined) changes.tax_id = parsed.tax_id
  if (parsed.description !== undefined) changes.description = parsed.description
  if (parsed.team_size !== undefined) changes.team_size = String(parsed.team_size)
  if (parsed.tour_types !== undefined) changes.tour_types = JSON.stringify(parsed.tour_types)
  if (['street', 'ward', 'district', 'city_province'].some(key => parsed[key as keyof typeof parsed] !== undefined)) {
    changes.location = JSON.stringify(nextLocation)
  }
  if (['contact_person_name', 'phone_number', 'business_email'].some(key => parsed[key as keyof typeof parsed] !== undefined)) {
    changes.contact_info = JSON.stringify(nextContact)
  }
  repository.update('agency_profiles', row => row.agency_id === agencyId, changes)

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
    account_status: repository.find('user_accounts', row => row.user_id === existing.user_id)?.account_status || 'Unknown',
  }
}
