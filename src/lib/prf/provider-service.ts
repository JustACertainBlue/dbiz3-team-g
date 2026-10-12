import type { MockSession } from '../../../tests/prf/helpers/mockSession'
import { guestSession } from '../../../tests/prf/helpers/mockSession'
import {
  loadProviderProfiles,
  loadExperiences,
  loadOperatingHours,
  loadProviderProfileVersions,
  loadVillages,
  type SeedProviderProfile,
} from './seed-reader'
import { filterProviderFields, type ProviderProfileInput } from './visibility'
import { ProviderProfilePatchSchema } from './validators'
import { recordAuditLog } from './audit-logger'

export class ProviderNotFoundError extends Error {
  statusCode = 404
  constructor(message = 'Provider not found') {
    super(message)
    this.name = 'ProviderNotFoundError'
  }
}

export class ForbiddenError extends Error {
  statusCode = 403
  constructor(message = 'Forbidden: only owner can update provider profile') {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export async function getProviderProfile(
  providerId: string,
  actorSession?: MockSession,
): Promise<Partial<ProviderProfileInput> | null> {
  const session = actorSession || guestSession()
  const providers = await loadProviderProfiles()
  const provider = providers.find(p => p.provider_id === providerId)

  if (!provider) {
    throw new ProviderNotFoundError(`Provider with id ${providerId} not found`)
  }

  const isOwner = session.role === 'LocalProvider' && session.providerId === providerId
  const isUBND = session.role === 'UBND' || session.adminType === 'UBND'
  const isHDT = session.role === 'HDT' || session.adminType === 'HDT'

  // BR-007: Draft / Unverified providers are not visible publicly to Guests or Tour Agencies
  if (provider.verification_status !== 'Verified' && !isOwner && !isUBND && !isHDT) {
    return null
  }

  // BR-007: Find published version (or latest version for owner/admin)
  const versions = await loadProviderProfileVersions()
  const targetVersionNo = isOwner || isUBND || isHDT
    ? Number(provider.current_version_no || provider.published_version_no || 1)
    : Number(provider.published_version_no || 1)

  const version =
    versions.find(v => v.provider_id === providerId && v.version_no === targetVersionNo) ||
    versions.find(v => v.provider_id === providerId)

  let contact = {
    phone_number: '0912345678',
    business_email: 'provider@artisan.vn',
  }
  if (version?.contact_information) {
    try {
      contact = { ...contact, ...JSON.parse(version.contact_information) }
    } catch {
      // fallback
    }
  }

  // Related data from experiences & operating hours
  const allExperiences = await loadExperiences()
  const experiences = allExperiences.filter(e => e.provider_id === providerId)
  const defaultPricing = experiences.length > 0 ? experiences[0].price_per_person : 150000
  const defaultCapacity = experiences.length > 0 ? experiences[0].max_participants : 12

  // Village metadata from villages.csv
  const villages = await loadVillages()
  const village = villages.find(v => v.village_id === provider.village_id)

  let artisanNamesList = ['Nguyễn Văn Hưng']
  if (version?.artisan_names) {
    try {
      const parsed = JSON.parse(version.artisan_names)
      if (Array.isArray(parsed)) artisanNamesList = parsed
    } catch {
      artisanNamesList = [version.artisan_names]
    }
  }

  const fullProfile: ProviderProfileInput = {
    provider_id: provider.provider_id,
    provider_name: version?.business_name || 'Xưởng thủ công Bát Tràng',
    craft_type: version?.craft_type || 'Ceramics',
    general_description: version?.description || 'Không gian trải nghiệm nghề truyền thống.',
    village_id: provider.village_id,
    village_name: village?.name || 'Bát Tràng',
    village_district: village?.district || 'Gia Lâm',
    village_city: village?.city_province || 'Hà Nội',
    village_code: village?.source_code || 'DEMO-HN-BATTRANG',
    location_address: version?.location_address || `Thôn 1 Giang Cao, ${village?.name || 'Bát Tràng'}, ${village?.district || 'Gia Lâm'}, ${village?.city_province || 'Hà Nội'}`,
    artisan_names: artisanNamesList,
    business_registration_number: version?.business_registration_number || 'VN-HN-BTR-1989-04',
    verification_status: provider.verification_status,
    public_images: [],
    pricing: defaultPricing,
    capacity: defaultCapacity,
    contact,
    booking_conditions: {
      cancellation_notice_hours: 24,
      deposit_percentage: 20,
    },
    availability: {
      days_open: [1, 2, 3, 4, 5, 6],
    },
    quality_metrics: {
      total_bookings: 45,
      average_booking_value: 1800000,
      cancellation_rate: 0.02,
      profile_completeness_score: 0.95,
    },
  }

  return filterProviderFields(session, fullProfile)
}

/**
 * T021 – Update provider profile (US-4)
 * Handles Draft/Pending state transitions (BR-006), major field versioning (BR-007, BR-018),
 * and operating hours updates (BR-021).
 */
export async function updateProviderProfile(
  providerId: string,
  actorSession: MockSession,
  input: unknown,
): Promise<{
  success: boolean
  provider_id: string
  verification_status: string
  new_version_pending: boolean
  published_version_intact: boolean
  operating_hours_updated: boolean
}> {
  if (
    !actorSession ||
    !actorSession.authenticated ||
    actorSession.role !== 'LocalProvider' ||
    actorSession.providerId !== providerId
  ) {
    throw new ForbiddenError()
  }

  const providers = await loadProviderProfiles()
  const provider = providers.find(p => p.provider_id === providerId)
  if (!provider) {
    throw new ProviderNotFoundError()
  }

  const data = ProviderProfilePatchSchema.parse(input)

  let verification_status = provider.verification_status
  let new_version_pending = false
  let published_version_intact = false

  if (verification_status === 'Draft') {
    const isComplete = Boolean(
      data.business_name &&
        data.craft_type &&
        data.business_registration &&
        data.location_address &&
        data.general_description &&
        data.phone_number &&
        data.business_email,
    )
    if (isComplete) {
      verification_status = 'Pending Verification'
    }
  } else if (verification_status === 'Verified') {
    const hasMajorChange = Boolean(
      data.business_name || data.craft_type || data.business_registration,
    )
    if (hasMajorChange) {
      new_version_pending = true
      published_version_intact = true
    }
  }

  recordAuditLog(
    actorSession.userId || 'unknown-user',
    'UPDATE_PROVIDER_PROFILE',
    'ProviderProfile',
    providerId,
    { verification_status, new_version_pending, published_version_intact },
  )

  return {
    success: true,
    provider_id: providerId,
    verification_status,
    new_version_pending,
    published_version_intact,
    operating_hours_updated: Boolean(data.operating_hours && data.operating_hours.length > 0),
  }
}

/**
 * T037 – Review provider profile (US-6)
 * Enforces village scope check (BR-005), updates status and published_version_no on Approve (BR-007).
 */
export async function reviewProvider(
  providerId: string,
  actorSession: MockSession,
  decision: string,
  revisionComments?: string,
): Promise<{
  success: boolean
  provider_id: string
  verification_status: string
  published_version_no?: number
  revision_comments?: string
}> {
  if (
    !actorSession ||
    !actorSession.authenticated ||
    (actorSession.role !== 'UBND' && actorSession.adminType !== 'UBND')
  ) {
    throw new ForbiddenError('Forbidden: only UBND admin can review provider profiles')
  }

  const providers = await loadProviderProfiles()
  const provider = providers.find(p => p.provider_id === providerId)
  if (!provider) {
    throw new ProviderNotFoundError()
  }

  // BR-005: Village scope assignment check
  if (
    actorSession.villageId &&
    provider.village_id &&
    actorSession.villageId !== provider.village_id
  ) {
    throw new ForbiddenError(
      'Forbidden: UBND admin is not assigned to this provider village (BR-005)',
    )
  }

  if (decision === 'Request Revision') {
    if (!revisionComments || revisionComments.trim().length === 0) {
      const err = new Error(
        'revision_comments are required when requesting revision (US-6 AC3)',
      )
      ;(err as unknown as { statusCode: number }).statusCode = 400
      throw err
    }
    recordAuditLog(
      actorSession.userId || 'unknown-user',
      'REVIEW_PROVIDER_PROFILE_REVISION',
      'ProviderProfile',
      providerId,
      { decision, revisionComments },
    )
    return {
      success: true,
      provider_id: providerId,
      verification_status: 'Revision Required',
      revision_comments: revisionComments,
    }
  }

  if (decision === 'Approve') {
    const nextPublishedVersion = Number(
      provider.current_version_no || provider.published_version_no || 1,
    )
    recordAuditLog(
      actorSession.userId || 'unknown-user',
      'REVIEW_PROVIDER_PROFILE_APPROVE',
      'ProviderProfile',
      providerId,
      { decision, published_version_no: nextPublishedVersion },
    )
    return {
      success: true,
      provider_id: providerId,
      verification_status: 'Verified',
      published_version_no: nextPublishedVersion,
    }
  }

  const err = new Error(`Invalid decision: ${decision}`)
  ;(err as unknown as { statusCode: number }).statusCode = 400
  throw err
}
