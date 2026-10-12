import type { MockSession } from '../../../tests/prf/helpers/mockSession'

export interface AgencyLocation {
  street?: string
  ward?: string
  district?: string
  city_province?: string
  [key: string]: unknown
}

export interface AgencyContact {
  contact_person_name?: string
  phone_number?: string
  business_email?: string
  [key: string]: unknown
}

export interface AgencyProfileInput {
  agency_id: string
  agency_name: string
  company_type: string
  location?: AgencyLocation
  team_size?: number
  contact?: AgencyContact
  tax_id?: string
  tour_types?: string[]
  description?: string
  images?: unknown[]
  account_status?: string
  [key: string]: unknown
}

export interface ProviderProfileInput {
  provider_id: string
  provider_name: string
  craft_type: string
  general_description: string
  public_images?: unknown[]
  contact?: {
    phone_number?: string
    business_email?: string
    [key: string]: unknown
  }
  pricing?: number
  capacity?: number
  availability?: unknown
  booking_conditions?: unknown
  verification_status?: string
  village_id?: string
  quality_metrics?: {
    total_bookings?: number
    average_booking_value?: number
    cancellation_rate?: number
    profile_completeness_score?: number
    [key: string]: unknown
  }
  [key: string]: unknown
}

/**
 * Filter agency fields based on actor role and ownership per BR-004.
 */
export function filterAgencyFields(
  actor: MockSession,
  profile: AgencyProfileInput,
): Partial<AgencyProfileInput> {
  const isHDT = actor.role === 'HDT' || actor.adminType === 'HDT'
  const isOwner = actor.role === 'TourAgency' && actor.agencyId === profile.agency_id

  if (isHDT || isOwner) {
    return { ...profile }
  }

  // Base public fields
  const base: Partial<AgencyProfileInput> = {
    agency_name: profile.agency_name,
    company_type: profile.company_type,
    location: profile.location,
    team_size: profile.team_size,
    description: profile.description,
    images: profile.images,
  }

  // Local Provider, UBND, or other Tour Agency have collaboration access (contact)
  const isCollaborator =
    actor.role === 'LocalProvider' ||
    actor.role === 'UBND' ||
    actor.adminType === 'UBND' ||
    actor.role === 'TourAgency'

  if (isCollaborator) {
    base.contact = profile.contact
  }

  return base
}

/**
 * Filter provider fields based on actor role and ownership per BR-004.
 */
export function filterProviderFields(
  actor: MockSession,
  profile: ProviderProfileInput,
): Partial<ProviderProfileInput> {
  const isHDT = actor.role === 'HDT' || actor.adminType === 'HDT'
  const isOwner = actor.role === 'LocalProvider' && actor.providerId === profile.provider_id
  const isUBND = actor.role === 'UBND' || actor.adminType === 'UBND'
  const isAgency = actor.role === 'TourAgency'

  // HDT gets full monitoring access including quality_metrics
  if (isHDT) {
    return { ...profile }
  }

  // Base public fields for Guest & all actors (F-PROFILE-03 / PRF127)
  const base: Partial<ProviderProfileInput> = {
    provider_id: profile.provider_id,
    provider_name: profile.provider_name,
    craft_type: profile.craft_type,
    general_description: profile.general_description,
    public_images: profile.public_images,
    village_id: profile.village_id,
    village_name: profile.village_name,
    village_district: profile.village_district,
    village_city: profile.village_city,
    location_address: profile.location_address,
    artisan_names: profile.artisan_names,
  }

  // Tour Agency collaboration detail
  if (isAgency) {
    base.pricing = profile.pricing
    base.capacity = profile.capacity
    base.contact = profile.contact
    base.availability = profile.availability
    base.booking_conditions = profile.booking_conditions
    base.verification_status = profile.verification_status
    return base
  }

  // Own Provider full detail (except quality_metrics)
  if (isOwner) {
    const { quality_metrics, ...ownerFields } = profile
    return { ...ownerFields }
  }

  // UBND full verification info (except quality_metrics)
  if (isUBND) {
    const { quality_metrics, ...ubndFields } = profile
    return { ...ubndFields }
  }

  return base
}
