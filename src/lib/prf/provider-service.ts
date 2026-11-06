import { demoSessionContextFor, toSessionContext, type SessionLike } from '@/lib/auth/session'
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
import { demoRepository } from '../demo/json-repository'
import { randomUUID } from 'node:crypto'

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

function parseJsonObject(value: string | null | undefined): Record<string, unknown> {
  try {
    const parsed = value ? JSON.parse(value) : {}
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

/** spec-BKG #78 shape: the seven ISO weekdays, each with its HH:MM windows. */
function weeklyOperatingHours(providerId: string): Record<string, Array<{ local_start: string; local_end: string }>> {
  const hours: Record<string, Array<{ local_start: string; local_end: string }>> =
    Object.fromEntries(['1', '2', '3', '4', '5', '6', '7'].map(day => [day, []]))
  for (const row of demoRepository().all('provider_operating_hours').filter(item => item.provider_id === providerId)) {
    hours[String(Number(row.weekday))]?.push({ local_start: row.local_start.slice(0, 5), local_end: row.local_end.slice(0, 5) })
  }
  return hours
}

/** #32: while a revision of a published Provider is open, its review state is the version's own status. */
function reviewStatus(
  provider: { verification_status: string; published_version_no: string | null; current_version_no?: string | number | null },
  version: { version_no: number; version_status: string } | undefined,
): string {
  const revisionOpen = Boolean(provider.published_version_no) && version !== undefined
    && version.version_no !== Number(provider.published_version_no)
  return revisionOpen ? version!.version_status : provider.verification_status
}

export async function getProviderProfile(
  providerId: string,
  actorSession?: SessionLike,
): Promise<Partial<ProviderProfileInput> | null> {
  const session = actorSession ? toSessionContext(actorSession) : demoSessionContextFor('guest')
  const providers = await loadProviderProfiles()
  const provider = providers.find(p => p.provider_id === providerId)

  if (!provider) {
    throw new ProviderNotFoundError(`Provider with id ${providerId} not found`)
  }

  const isOwner = session.role === 'Local_Provider' && session.providerId === providerId
  const isUBND = session.role === 'ADMIN' && session.adminType === 'UBND'
  const isHDT = session.role === 'ADMIN' && session.adminType === 'HDT'

  // BR-007: Draft / Unverified providers are not visible publicly to Guests or Tour Agencies
  if (!provider.published_version_no && provider.verification_status !== 'Verified' && !isOwner && !isUBND && !isHDT) {
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

  let contact: Record<string, string> = {}
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
  // spec-PRF #34: lowest price and largest capacity among the non-archived Experiences; empty without one.
  const activeExperiences = experiences.filter(exp => !exp.archived_at)
  const pricing = activeExperiences.length > 0 ? Math.min(...activeExperiences.map(exp => exp.price_per_person)) : undefined
  const capacity = activeExperiences.length > 0 ? Math.max(...activeExperiences.map(exp => exp.max_participants)) : undefined

  // Village metadata from villages.csv
  const villages = await loadVillages()
  const village = villages.find(v => v.village_id === provider.village_id)

  let artisanNamesList: string[] = []
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
    provider_name: version?.business_name || 'Local Provider',
    craft_type: version?.craft_type || 'Other',
    general_description: version?.description || '',
    village_id: provider.village_id,
    village_name: village?.name || '',
    village_district: village?.district || '',
    village_city: village?.city_province || '',
    village_code: village?.source_code || '',
    location_address: version?.location_address || '',
    artisan_names: artisanNamesList,
    business_registration_number: version?.business_registration_number || '',
    // #32: the owner, UBND and HDT see the status of the revision under review; others see the
    // status of the published profile.
    verification_status: (isOwner || isUBND || isHDT) ? reviewStatus(provider, version) : provider.verification_status,
    public_images: [],
    pricing,
    capacity,
    contact,
    // FR-003 (#40): booking conditions of the shown version and the real weekly operating hours.
    booking_conditions: parseJsonObject(version?.booking_conditions),
    availability: { operating_hours: weeklyOperatingHours(providerId) },
    experiences: activeExperiences
      .map(exp => ({
        experience_id: exp.experience_id, name: exp.name, category: exp.category,
        duration_minutes: exp.duration_minutes, max_participants: exp.max_participants, price_per_person: exp.price_per_person,
      })),
    quality_metrics: {
      total_bookings: demoRepository().all('bookings').filter(row => experiences.some(exp => exp.experience_id === row.experience_id)).length,
      average_booking_value: 0,
      cancellation_rate: 0,
      profile_completeness_score: version ? 1 : 0,
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
  actorSession: SessionLike,
  input: unknown,
): Promise<{
  success: boolean
  provider_id: string
  verification_status: string
  new_version_pending: boolean
  published_version_intact: boolean
  operating_hours_updated: boolean
}> {
  const actor = toSessionContext(actorSession)
  if (
    !actor.authenticated ||
    actor.role !== 'Local_Provider' ||
    actor.providerId !== providerId
  ) {
    throw new ForbiddenError()
  }

  const providers = await loadProviderProfiles()
  const provider = providers.find(p => p.provider_id === providerId)
  if (!provider) {
    throw new ProviderNotFoundError()
  }

  const data = ProviderProfilePatchSchema.parse(input)

  const repository = demoRepository()
  const versions = await loadProviderProfileVersions()
  const currentVersion = versions.find(version => version.provider_id === providerId && version.version_no === Number(provider.current_version_no || provider.published_version_no || 1))
    || versions.find(version => version.provider_id === providerId)
  if (!currentVersion) throw new ProviderNotFoundError('Provider profile version not found')

  // BR-007 (decision Q2, 2026-11-04): once a version is published, the review state of a later
  // revision lives on provider_profile_versions.version_status; provider_profiles.verification_status
  // stays Verified so Explore, AI Matching and Booking keep using the published version.
  const publishedVersionNo = provider.published_version_no ? Number(provider.published_version_no) : null
  const revisionOpen = publishedVersionNo !== null && currentVersion.version_no !== publishedVersionNo
  // FR-004 / BR-018: a major change is a real change of a major field, not its presence in the request.
  const hasMajorChange =
    (data.business_name !== undefined && data.business_name !== currentVersion.business_name) ||
    (data.craft_type !== undefined && data.craft_type !== currentVersion.craft_type) ||
    (data.business_registration !== undefined && data.business_registration !== currentVersion.business_registration_number)

  let verification_status = provider.verification_status
  let new_version_pending = false
  let published_version_intact = false

  if (revisionOpen) {
    // A revision is already pending or requires revision: edit that revision, never add another one.
    verification_status = currentVersion.version_status
    new_version_pending = true
    published_version_intact = true
  } else if (verification_status === 'Draft') {
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
  } else if (verification_status === 'Verified' && hasMajorChange) {
    new_version_pending = true
    published_version_intact = true
  }
  const createRevision = new_version_pending && !revisionOpen

  recordAuditLog(
    actor.userId || 'unknown-user',
    'UPDATE_PROVIDER_PROFILE',
    'ProviderProfile',
    providerId,
    { verification_status, new_version_pending, published_version_intact },
  )

  const now = new Date().toISOString()
  const parseObject = (value: string) => { try { return value ? JSON.parse(value) as Record<string, unknown> : {} } catch { return {} } }
  const buildChanges = () => {
    const changes: Record<string, string> = {}
    if (data.business_name !== undefined) changes.business_name = data.business_name
    if (data.craft_type !== undefined) changes.craft_type = data.craft_type
    if (data.business_registration !== undefined) changes.business_registration_number = data.business_registration
    if (data.artisan_names !== undefined) changes.artisan_names = JSON.stringify(data.artisan_names)
    if (data.location_address !== undefined) changes.location_address = data.location_address
    if (data.general_description !== undefined) changes.description = data.general_description
    const contact = parseObject(currentVersion.contact_information)
    if (data.phone_number !== undefined) contact.phone_number = data.phone_number
    if (data.business_email !== undefined) contact.business_email = data.business_email
    if (data.phone_number !== undefined || data.business_email !== undefined) changes.contact_information = JSON.stringify(contact)
    if (data.booking_conditions !== undefined) changes.booking_conditions = JSON.stringify(data.booking_conditions)
    return changes
  }
  const versionChanges = buildChanges()
  if (createRevision) {
    const nextVersion = Math.max(...versions.filter(version => version.provider_id === providerId).map(version => version.version_no), 0) + 1
    repository.insert('provider_profile_versions', {
      provider_id: providerId, version_no: String(nextVersion), version_status: 'Pending Verification',
      business_registration_number: versionChanges.business_registration_number ?? currentVersion.business_registration_number,
      business_name: versionChanges.business_name ?? currentVersion.business_name,
      craft_type: versionChanges.craft_type ?? currentVersion.craft_type,
      artisan_names: versionChanges.artisan_names ?? currentVersion.artisan_names,
      location_address: versionChanges.location_address ?? currentVersion.location_address,
      description: versionChanges.description ?? currentVersion.description,
      contact_information: versionChanges.contact_information ?? currentVersion.contact_information,
      booking_conditions: versionChanges.booking_conditions ?? currentVersion.booking_conditions,
      submitted_at: now, published_at: '',
    })
    repository.update('provider_profiles', row => row.provider_id === providerId, {
      current_version_no: String(nextVersion), updated_at: now,
    })
    verification_status = 'Pending Verification'
  } else {
    repository.update('provider_profile_versions', row => row.provider_id === providerId && row.version_no === String(currentVersion.version_no), versionChanges)
    if (revisionOpen) {
      repository.update('provider_profiles', row => row.provider_id === providerId, { updated_at: now })
    } else {
      repository.update('provider_profiles', row => row.provider_id === providerId, { verification_status, updated_at: now })
    }
  }
  if (data.operating_hours) {
    repository.remove('provider_operating_hours', row => row.provider_id === providerId)
    data.operating_hours.filter(period => !period.is_closed).forEach(period => repository.insert('provider_operating_hours', {
      operating_hour_id: randomUUID(), provider_id: providerId, weekday: String(period.weekday),
      local_start: period.local_start, local_end: period.local_end,
    }))
  }

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
  actorSession: SessionLike,
  decision: string,
  revisionComments?: string,
): Promise<{
  success: boolean
  provider_id: string
  verification_status: string
  published_version_no?: number
  revision_comments?: string
}> {
  const actor = toSessionContext(actorSession)
  if (
    !actor.authenticated ||
    actor.role !== 'ADMIN' ||
    actor.adminType !== 'UBND'
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
    actor.assignedVillageId &&
    provider.village_id &&
    actor.assignedVillageId !== provider.village_id
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
    // spec-PRF #33: Request Revision applies only to a version in Pending Verification.
    const versions = await loadProviderProfileVersions()
    const reviewed = versions.find(v => v.provider_id === providerId && v.version_no === Number(provider.current_version_no || provider.published_version_no || 1))
    if (reviewStatus(provider, reviewed) !== 'Pending Verification') {
      const err = new Error('Request Revision applies only to a profile version in Pending Verification (spec-PRF #33)')
      ;(err as unknown as { statusCode: number }).statusCode = 409
      throw err
    }
    recordAuditLog(
      actor.userId || 'unknown-user',
      'REVIEW_PROVIDER_PROFILE_REVISION',
      'ProviderProfile',
      providerId,
      { decision, revisionComments },
    )
    const now = new Date().toISOString()
    const reviewedVersionNo = String(provider.current_version_no || provider.published_version_no || 1)
    demoRepository().insert('provider_verification_reviews', {
      review_id: randomUUID(), provider_id: providerId,
      version_no: reviewedVersionNo,
      reviewer_user_id: actor.userId || '', decision, revision_comments: revisionComments, reviewed_at: now,
    })
    if (provider.published_version_no && reviewedVersionNo !== String(provider.published_version_no)) {
      // BR-007: only the revision needs changes; the published version stays public.
      demoRepository().update('provider_profile_versions', row => row.provider_id === providerId && row.version_no === reviewedVersionNo, { version_status: 'Revision Required' })
      demoRepository().update('provider_profiles', row => row.provider_id === providerId, { updated_at: now })
    } else {
      demoRepository().update('provider_profiles', row => row.provider_id === providerId, { verification_status: 'Revision Required', updated_at: now })
    }
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
      actor.userId || 'unknown-user',
      'REVIEW_PROVIDER_PROFILE_APPROVE',
      'ProviderProfile',
      providerId,
      { decision, published_version_no: nextPublishedVersion },
    )
    const now = new Date().toISOString()
    demoRepository().insert('provider_verification_reviews', {
      review_id: randomUUID(), provider_id: providerId, version_no: String(nextPublishedVersion),
      reviewer_user_id: actor.userId || '', decision, revision_comments: '', reviewed_at: now,
    })
    const previousPublished = provider.published_version_no ? String(provider.published_version_no) : ''
    if (previousPublished && previousPublished !== String(nextPublishedVersion)) {
      // US-6 AC2 / BR-007: the approved revision replaces the previously published version.
      demoRepository().update('provider_profile_versions', row => row.provider_id === providerId && row.version_no === previousPublished, { version_status: 'Superseded' })
    }
    demoRepository().update('provider_profiles', row => row.provider_id === providerId, {
      verification_status: 'Verified', published_version_no: String(nextPublishedVersion), updated_at: now,
    })
    demoRepository().update('provider_profile_versions', row => row.provider_id === providerId && row.version_no === String(nextPublishedVersion), {
      version_status: 'Verified', published_at: now,
    })
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
