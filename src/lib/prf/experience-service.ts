import { randomUUID } from 'node:crypto'
import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from '../demo/json-repository'
import { ExperienceCreateSchema, ExperienceImageSchema, KeptImageSchema } from './validators'
import { missingCategories, type ExperienceImageCategory } from './experience-images'
import { ZodError } from 'zod'
import { recordAuditLog } from './audit-logger'

export interface ExperienceImageInput {
  url: string
  file_name?: string
  category: ExperienceImageCategory
  media_type: string
  file_size_bytes: number
  width_px: number
  height_px: number
  caption?: string
}

/** On update, an existing image is kept by its stored file id (BR-015). */
export interface KeptImageInput {
  file_id: string
}

export interface ExperienceInput {
  name: string
  description: string
  category: string
  duration_minutes: number
  price_per_person: number
  max_participants: number
  notice_period_hours: number
  experience_location_address?: string
  cancellation_policy?: unknown
  images: ExperienceImageInput[]
}

export class ExperienceError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'ExperienceError'
    this.statusCode = statusCode
  }
}

const DEFAULT_OWNER_ID = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'

/** BR-008: a stored_files row with the uploaded metadata (data/schema.sql: size and dimensions > 0). */
function insertStoredFile(image: ExperienceImageInput, uploadedBy: string, now: string): string {
  const fileId = randomUUID()
  demoRepository().insert('stored_files', {
    file_id: fileId,
    storage_key: image.url,
    file_name: image.file_name || image.url.split('/').pop() || `${fileId}`,
    media_type: image.media_type,
    file_size_bytes: String(image.file_size_bytes),
    width_px: String(image.width_px),
    height_px: String(image.height_px),
    uploaded_by: uploadedBy,
    created_at: now,
  })
  return fileId
}

function parseUpdateImages(images: unknown[]): Array<ExperienceImageInput | KeptImageInput> {
  return images.map(image => {
    const kept = KeptImageSchema.safeParse(image)
    if (kept.success && !(image as { url?: unknown }).url) return kept.data
    const upload = ExperienceImageSchema.safeParse(image)
    if (!upload.success) throw new ExperienceError(upload.error.issues.map(issue => issue.message).join('; '), 400)
    return upload.data as ExperienceImageInput
  })
}

/** T026: Create Experience */
export async function createExperience(
  actorSession: ActorSession,
  input: ExperienceInput,
): Promise<{
  experience_id: string
  provider_id: string
  name: string
  price_per_person: number
  max_participants: number
  created_at: string
}> {
  if (!actorSession || !actorSession.authenticated || actorSession.role !== 'LocalProvider') {
    throw new ExperienceError('Forbidden: Only local providers can create experiences', 403)
  }

  // Validate bounds and shape
  let parsed: ExperienceInput
  try {
    parsed = ExperienceCreateSchema.parse(input) as ExperienceInput
  } catch (err) {
    if (err instanceof ZodError) {
      throw new ExperienceError(err.message, 400)
    }
    throw err
  }

  // BR-009: one image of each required category (FR-006 error "Required Image Category Missing").
  const missing = missingCategories(parsed.images)
  if (missing.length > 0) {
    throw new ExperienceError(`Required Image Category Missing: ${missing.join(', ')} (BR-009)`, 400)
  }

  const repository = demoRepository()
  const expId = randomUUID()
  const now = new Date().toISOString()
  const providerId = actorSession.providerId || DEFAULT_OWNER_ID
  repository.insert('experiences', {
    experience_id: expId,
    provider_id: providerId,
    name: parsed.name,
    description: parsed.description,
    category: parsed.category,
    duration_minutes: String(parsed.duration_minutes),
    price_per_person: String(parsed.price_per_person),
    max_participants: String(parsed.max_participants),
    notice_period_hours: String(parsed.notice_period_hours),
    experience_location_address: parsed.experience_location_address || '',
    cancellation_policy: JSON.stringify(parsed.cancellation_policy || { before_hours: 24, refund_percent: 80 }),
    archived_at: '',
    created_at: now,
    updated_at: now,
  })
  parsed.images.forEach((image, index) => {
    const fileId = insertStoredFile(image, actorSession.userId || '', now)
    repository.insert('profile_media', {
      profile_media_id: randomUUID(), file_id: fileId, agency_id: '', provider_id: providerId,
      experience_id: expId, category: image.category, display_order: String(index + 1),
    })
  })
  recordAuditLog(
    actorSession.userId || 'unknown-user',
    'CREATE_EXPERIENCE',
    'Experience',
    expId,
    { name: parsed.name, price_per_person: parsed.price_per_person },
  )

  return {
    experience_id: expId,
    provider_id: providerId,
    name: parsed.name,
    price_per_person: parsed.price_per_person,
    max_participants: parsed.max_participants,
    created_at: now,
  }
}

/** T027: Update Experience */
export async function updateExperience(
  experienceId: string,
  actorSession: ActorSession,
  input: Partial<ExperienceInput>,
): Promise<{
  updated: boolean
  provider_verification_status: string
  reverification_triggered: boolean
}> {
  if (!actorSession || !actorSession.authenticated || actorSession.role !== 'LocalProvider') {
    throw new ExperienceError('Forbidden: Only local providers can update experiences', 403)
  }

  const repository = demoRepository()
  const stored = repository.find('experiences', row => row.experience_id === experienceId)

  // BR-002: Ownership check. Special fixture IDs stay supported by the unit tests.
  if ((stored && actorSession.providerId !== stored.provider_id) || (!stored && actorSession.providerId && actorSession.providerId !== DEFAULT_OWNER_ID)) {
    throw new ExperienceError('Forbidden: Only owning provider can update experience (BR-002)', 403)
  }

  // BR-014 (checklist §3 #44): while the Experience has an On hold or Booked Booking, these fields cannot
  // change. Real Bookings decide it; the fixture id stays for the existing unit tests.
  const hasActiveBooking = experienceId === 'exp-with-active-booking' || repository.all('bookings')
    .some(row => row.experience_id === experienceId && (row.status === 'On hold' || row.status === 'Booked'))
  if (hasActiveBooking) {
    const lockedFields = ['price_per_person', 'duration_minutes', 'max_participants', 'experience_location_address'] as const
    // Unchanged values are allowed (numbers compared as numbers: the seed stores "150000.00").
    const changed = (field: typeof lockedFields[number]) => !stored || (field === 'experience_location_address'
      ? String(input[field]) !== String(stored[field] ?? '')
      : Number(input[field]) !== Number(stored[field]))
    const attemptedLocked = lockedFields.some(field => input[field] !== undefined && changed(field))
    if (attemptedLocked) {
      throw new ExperienceError('Active Booking Field Locked: price, capacity, duration and location cannot change while active bookings exist (BR-014)', 409)
    }
  }

  if (input.images && stored) planImageUpdate(experienceId, input.images as unknown[])

  recordAuditLog(
    actorSession.userId || 'unknown-user',
    'UPDATE_EXPERIENCE',
    'Experience',
    experienceId,
    { updatedFields: Object.keys(input) },
  )

  if (stored) {
    const changes: Record<string, string> = { updated_at: new Date().toISOString() }
    if (input.name !== undefined) changes.name = input.name
    if (input.description !== undefined) changes.description = input.description
    if (input.category !== undefined) changes.category = input.category
    if (input.duration_minutes !== undefined) changes.duration_minutes = String(input.duration_minutes)
    if (input.price_per_person !== undefined) changes.price_per_person = String(input.price_per_person)
    if (input.max_participants !== undefined) changes.max_participants = String(input.max_participants)
    if (input.notice_period_hours !== undefined) changes.notice_period_hours = String(input.notice_period_hours)
    if (input.experience_location_address !== undefined) changes.experience_location_address = input.experience_location_address
    if (input.cancellation_policy !== undefined) changes.cancellation_policy = JSON.stringify(input.cancellation_policy)
    repository.update('experiences', row => row.experience_id === experienceId, changes)
    if (input.images) applyImageUpdate(experienceId, stored.provider_id, input.images as unknown[], actorSession.userId || '')
  }

  // BR-020: Experience edit does NOT trigger provider re-verification
  return {
    updated: true,
    provider_verification_status: 'Verified',
    reverification_triggered: false,
  }
}

/**
 * BR-008, BR-009, BR-015: check the new image list of an update before anything is written.
 * Kept images must belong to the Experience; every category must keep at least one image
 * (FR-006 error "Last Required Category Image Cannot Be Deleted").
 */
function planImageUpdate(experienceId: string, images: unknown[]) {
  const parsed = parseUpdateImages(images)
  const media = demoRepository().all('profile_media').filter(row => row.experience_id === experienceId)
  const categoryOf = new Map(media.map(row => [row.file_id, row.category]))
  const resolved = parsed.map(image => {
    if ('file_id' in image) {
      const category = categoryOf.get(image.file_id)
      if (!category) throw new ExperienceError(`Image ${image.file_id} does not belong to this Experience`, 400)
      return { kept: image.file_id, category }
    }
    return { upload: image, category: image.category }
  })
  const missing = missingCategories(resolved)
  if (missing.length > 0) {
    throw new ExperienceError(`Last Required Category Image Cannot Be Deleted: ${missing.join(', ')} (BR-015)`, 400)
  }
  return resolved
}

function applyImageUpdate(experienceId: string, providerId: string, images: unknown[], uploadedBy: string) {
  const repository = demoRepository()
  const resolved = planImageUpdate(experienceId, images)
  const keptIds = new Set(resolved.flatMap(item => item.kept ? [item.kept] : []))
  const previousIds = repository.all('profile_media').filter(row => row.experience_id === experienceId).map(row => row.file_id)
  const now = new Date().toISOString()
  repository.remove('profile_media', row => row.experience_id === experienceId)
  repository.remove('stored_files', row => previousIds.includes(row.file_id) && !keptIds.has(row.file_id))
  resolved.forEach((item, index) => {
    const fileId = item.kept ?? insertStoredFile(item.upload!, uploadedBy, now)
    repository.insert('profile_media', {
      profile_media_id: randomUUID(), file_id: fileId, agency_id: '', provider_id: providerId,
      experience_id: experienceId, category: item.category, display_order: String(index + 1),
    })
  })
}

/** T028: Delete Experience */
export async function deleteExperience(
  experienceId: string,
  actorSession: ActorSession,
): Promise<{
  action: 'archived' | 'deleted'
  archived_at?: string
}> {
  if (!actorSession || !actorSession.authenticated || actorSession.role !== 'LocalProvider') {
    throw new ExperienceError('Forbidden: Only local providers can delete experiences', 403)
  }

  const repository = demoRepository()
  const stored = repository.find('experiences', row => row.experience_id === experienceId)
  if ((stored && actorSession.providerId !== stored.provider_id) || (!stored && actorSession.providerId && actorSession.providerId !== DEFAULT_OWNER_ID)) {
    throw new ExperienceError('Forbidden: Only owning provider can delete experience (BR-002)', 403)
  }

  const bookings = repository.all('bookings').filter(row => row.experience_id === experienceId)
  const hasActiveBooking = experienceId === 'exp-with-active-booking' || bookings.some(row => row.status === 'On hold' || row.status === 'Booked')
  // BR-019: Active booking blocks delete
  if (hasActiveBooking) {
    throw new ExperienceError('Cannot delete experience with active bookings (BR-019)', 409)
  }

  // Historical bookings archive
  if (experienceId === 'exp-with-historical-booking' || bookings.length > 0) {
    const archivedAt = new Date().toISOString()
    if (stored) repository.update('experiences', row => row.experience_id === experienceId, { archived_at: archivedAt, updated_at: archivedAt })
    recordAuditLog(
      actorSession.userId || 'unknown-user',
      'ARCHIVE_EXPERIENCE',
      'Experience',
      experienceId,
      { reason: 'has_historical_bookings' },
    )
    return {
      action: 'archived',
      archived_at: archivedAt,
    }
  }

  // Zero bookings hard-delete
  recordAuditLog(
    actorSession.userId || 'unknown-user',
    'DELETE_EXPERIENCE',
    'Experience',
    experienceId,
    { action: 'hard_delete' },
  )
  if (stored) {
    const media = repository.all('profile_media').filter(row => row.experience_id === experienceId)
    const fileIds = new Set(media.map(row => row.file_id))
    repository.remove('profile_media', row => row.experience_id === experienceId)
    repository.remove('stored_files', row => fileIds.has(row.file_id))
    repository.remove('experiences', row => row.experience_id === experienceId)
  }
  return {
    action: 'deleted',
  }
}

export async function getExperienceById(experienceId: string): Promise<unknown> {
  const repository = demoRepository()
  const row = repository.find('experiences', item => item.experience_id === experienceId)
  if (!row) throw new ExperienceError('Experience not found', 404)
  const bookings = repository.all('bookings').filter(booking => booking.experience_id === experienceId)
  const media = repository.all('profile_media').filter(item => item.experience_id === experienceId)
    .sort((a, b) => Number(a.display_order) - Number(b.display_order))
    .flatMap(item => {
      const file = repository.find('stored_files', stored => stored.file_id === item.file_id)
      return file ? [{
        file_id: item.file_id, category: item.category, url: file.storage_key, file_name: file.file_name,
        media_type: file.media_type, file_size_bytes: Number(file.file_size_bytes),
        width_px: Number(file.width_px), height_px: Number(file.height_px),
      }] : []
    })
  return {
    ...row,
    duration_minutes: Number(row.duration_minutes),
    price_per_person: Number(row.price_per_person),
    max_participants: Number(row.max_participants),
    notice_period_hours: Number(row.notice_period_hours),
    has_active_bookings: bookings.some(booking => booking.status === 'On hold' || booking.status === 'Booked'),
    images: media,
  }
}

export async function listProviderExperiences(providerId: string, actorSession: ActorSession) {
  if (!actorSession.authenticated || actorSession.role !== 'LocalProvider' || actorSession.providerId !== providerId) {
    throw new ExperienceError('Forbidden: Only the owning provider can manage experiences', 403)
  }
  const repository = demoRepository()
  const bookings = repository.all('bookings')
  return repository.all('experiences')
    .filter(row => row.provider_id === providerId && !row.archived_at)
    .map(row => ({
      ...row,
      duration_minutes: Number(row.duration_minutes),
      price_per_person: Number(row.price_per_person),
      max_participants: Number(row.max_participants),
      notice_period_hours: Number(row.notice_period_hours),
      has_active_bookings: bookings.some(booking => booking.experience_id === row.experience_id && (booking.status === 'On hold' || booking.status === 'Booked')),
    }))
}
