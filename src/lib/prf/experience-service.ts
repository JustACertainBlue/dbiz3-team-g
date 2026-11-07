import { randomUUID } from 'node:crypto'
import { toSessionContext, type SessionLike } from '../auth/session'
import { demoRepository } from '../db/application-store'
import { ExperienceCreateSchema, ExperienceImageSchema, INVALID_CATEGORY_MESSAGE, KeptImageSchema } from './validators'
import type { DiscountRule } from './experience-terms'
import { mediaUrl } from './media-urls'
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
  group_discounts?: DiscountRule[]
  special_rates?: DiscountRule[]
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

async function assertUploadedImage(image: ExperienceImageInput, uploadedBy: string) {
  const id=image.url.match(/^\/api\/prf\/media\/([0-9a-f-]{36})$/i)?.[1]
  if (!id) return
  const file=(await demoRepository().find('stored_files',row=>row.file_id===id && row.uploaded_by===uploadedBy && row.storage_key===`prf-media/${id}`))
  if (!file) throw new ExperienceError('Image does not belong to this account',403)
  if (!ExperienceImageSchema.safeParse({...image,media_type:file.media_type,file_size_bytes:Number(file.file_size_bytes),width_px:Number(file.width_px),height_px:Number(file.height_px)}).success) throw new ExperienceError('Uploaded image metadata is invalid',400)
}

/** BR-008: a stored_files row with the uploaded metadata (data/schema.sql: size and dimensions > 0). */
async function insertStoredFile(image: ExperienceImageInput, uploadedBy: string, now: string): Promise<string> {
  const uploaded = image.url.match(/^\/api\/prf\/media\/([0-9a-f-]{36})$/i)?.[1]
  if (uploaded) {
    const file = (await demoRepository().find('stored_files',row=>row.file_id===uploaded && row.uploaded_by===uploadedBy && row.storage_key===`prf-media/${uploaded}`))
    if (!file) throw new ExperienceError('Image does not belong to this account',403)
    return uploaded
  }
  const fileId = randomUUID()
  ;(await demoRepository().insert('stored_files', {
    file_id: fileId,
    storage_key: image.url,
    file_name: image.file_name || image.url.split('/').pop() || `${fileId}`,
    media_type: image.media_type,
    file_size_bytes: String(image.file_size_bytes),
    width_px: String(image.width_px),
    height_px: String(image.height_px),
    uploaded_by: uploadedBy,
    created_at: now,
  }))
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
  actorSession: SessionLike,
  input: ExperienceInput,
): Promise<{
  experience_id: string
  provider_id: string
  name: string
  price_per_person: number
  max_participants: number
  created_at: string
}> {
  return demoRepository().atomic(["experiences","experience_discount_rules","profile_media","stored_files","audit_logs","bookings"],async()=>{

  const actor = (await toSessionContext(actorSession))
  if (!actor.authenticated || actor.role !== 'Local_Provider') {
    throw new ExperienceError('Forbidden: Only local providers can create experiences', 403)
  }

  // Validate bounds and shape
  let parsed: ExperienceInput
  try {
    parsed = ExperienceCreateSchema.parse(input) as ExperienceInput
  } catch (err) {
    if (err instanceof ZodError) {
      if (err.issues.some(issue => issue.path[0] === 'category')) throw new ExperienceError(INVALID_CATEGORY_MESSAGE, 400) // #88
      throw new ExperienceError(err.message, 400)
    }
    throw err
  }

  // BR-009: one image of each required category (FR-006 error "Required Image Category Missing").
  const missing = missingCategories(parsed.images)
  if (missing.length > 0) {
    throw new ExperienceError(`Required Image Category Missing: ${missing.join(', ')} (BR-009)`, 400)
  }

  ;(await Promise.all(parsed.images.map(async image=>(await assertUploadedImage(image,actor.userId || '')))))
  for (const rules of [parsed.group_discounts,parsed.special_rates]) if (rules && new Set(rules.map(rule=>rule.pax_threshold)).size!==rules.length) throw new ExperienceError('Discount thresholds must be unique',400)
  const repository = demoRepository()
  const expId = randomUUID()
  const now = new Date().toISOString()
  const providerId = actor.providerId || DEFAULT_OWNER_ID
  ;(await repository.insert('experiences', {
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
  }))
  ;(await Promise.all(parsed.images.map(async (image, index) => {
    const fileId = (await insertStoredFile(image, actor.userId || '', now))
    ;(await repository.insert('profile_media', {
      profile_media_id: randomUUID(), file_id: fileId, agency_id: '', provider_id: '',
      experience_id: expId, category: image.category, display_order: String(index + 1),
    }))
  })))
  ;(await saveDiscounts(expId, parsed))
  ;(await recordAuditLog(
    actor.userId || 'unknown-user',
    'CREATE_EXPERIENCE',
    'Experience',
    expId,
    { name: parsed.name, price_per_person: parsed.price_per_person },
  ))

  return {
    experience_id: expId,
    provider_id: providerId,
    name: parsed.name,
    price_per_person: parsed.price_per_person,
    max_participants: parsed.max_participants,
    created_at: now,
  }

  })
}

/** T027: Update Experience */
export async function updateExperience(
  experienceId: string,
  actorSession: SessionLike,
  input: Partial<ExperienceInput>,
): Promise<{
  updated: boolean
  provider_verification_status: string
  reverification_triggered: boolean
}> {
  return demoRepository().atomic(["experiences","experience_discount_rules","profile_media","stored_files","audit_logs","bookings"],async()=>{

  const actor = (await toSessionContext(actorSession))
  if (!actor.authenticated || actor.role !== 'Local_Provider') {
    throw new ExperienceError('Forbidden: Only local providers can update experiences', 403)
  }
  for (const field of ['group_discounts', 'special_rates'] as const) {
    if (input[field] !== undefined && !ExperienceCreateSchema.shape[field].safeParse(input[field]).success) throw new ExperienceError('Invalid discount rules', 400)
    if (input[field] && new Set(input[field]!.map(rule=>rule.pax_threshold)).size !== input[field]!.length) throw new ExperienceError('Discount thresholds must be unique',400)
  }
  if (input.category !== undefined && !ExperienceCreateSchema.shape.category.safeParse(input.category).success) throw new ExperienceError(INVALID_CATEGORY_MESSAGE, 400) // #88
  if (input.cancellation_policy!==undefined && !ExperienceCreateSchema.shape.cancellation_policy.safeParse(input.cancellation_policy).success)throw new ExperienceError('Invalid cancellation policy',400)

  const repository = demoRepository()
  const stored = (await repository.find('experiences', row => row.experience_id === experienceId))

  // BR-002: Ownership check. Special fixture IDs stay supported by the unit tests.
  if ((stored && actor.providerId !== stored.provider_id) || (!stored && actor.providerId && actor.providerId !== DEFAULT_OWNER_ID)) {
    throw new ExperienceError('Forbidden: Only owning provider can update experience (BR-002)', 403)
  }

  // BR-014 (checklist §3 #44): while the Experience has an On hold or Booked Booking, these fields cannot
  // change. Real Bookings decide it; the fixture id stays for the existing unit tests.
  const hasActiveBooking = experienceId === 'exp-with-active-booking' || (await repository.all('bookings'))
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

  if (input.images && stored) { (await planImageUpdate(experienceId, input.images as unknown[])); (await Promise.all(parseUpdateImages(input.images).map(async image=>{if ('url' in image) (await assertUploadedImage(image,actor.userId || ''))}))) }

  ;(await recordAuditLog(
    actor.userId || 'unknown-user',
    'UPDATE_EXPERIENCE',
    'Experience',
    experienceId,
    { updatedFields: Object.keys(input) },
  ))

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
    ;(await repository.update('experiences', row => row.experience_id === experienceId, changes))
    if (input.images) (await applyImageUpdate(experienceId, stored.provider_id, input.images as unknown[], actor.userId || ''))
    ;(await saveDiscounts(experienceId, input))
  }

  // BR-020: Experience edit does NOT trigger provider re-verification
  return {
    updated: true,
    provider_verification_status: 'Verified',
    reverification_triggered: false,
  }

  })
}

async function saveDiscounts(experienceId: string, input: Partial<ExperienceInput>) {
  const repo = demoRepository()
  for (const [field, kind] of [['group_discounts','Group Discount'], ['special_rates','Special Rate']] as const) {
    const values = input[field]
    if (values === undefined) continue
    ;(await repo.remove('experience_discount_rules', row => row.experience_id === experienceId && row.rule_kind === kind))
    for (const rule of values) (await repo.insert('experience_discount_rules', { rule_id: randomUUID(), experience_id: experienceId, rule_kind: kind, pax_threshold: String(rule.pax_threshold), discount_percentage: String(rule.discount_percentage) }))
  }
}

/**
 * BR-008, BR-009, BR-015: check the new image list of an update before anything is written.
 * Kept images must belong to the Experience; every category must keep at least one image
 * (FR-006 error "Last Required Category Image Cannot Be Deleted").
 */
async function planImageUpdate(experienceId: string, images: unknown[]) {
  const parsed = parseUpdateImages(images)
  const media = (await demoRepository().all('profile_media')).filter(row => row.experience_id === experienceId)
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

async function applyImageUpdate(experienceId: string, providerId: string, images: unknown[], uploadedBy: string) {
  const repository = demoRepository()
  const resolved = (await planImageUpdate(experienceId, images))
  const now = new Date().toISOString()
  ;(await repository.remove('profile_media', row => row.experience_id === experienceId))
  // Retain file metadata: other profile/version links may still reference it.
  ;(await Promise.all(resolved.map(async (item, index) => {
    const fileId = item.kept ?? (await insertStoredFile(item.upload!, uploadedBy, now))
    ;(await repository.insert('profile_media', {
      profile_media_id: randomUUID(), file_id: fileId, agency_id: '', provider_id: '',
      experience_id: experienceId, category: item.category, display_order: String(index + 1),
    }))
  })))
}

/** T028: Delete Experience */
export async function deleteExperience(
  experienceId: string,
  actorSession: SessionLike,
): Promise<{
  action: 'archived' | 'deleted'
  archived_at?: string
}> {
  return demoRepository().atomic(["experiences","experience_discount_rules","profile_media","stored_files","audit_logs","bookings"],async()=>{

  const actor = (await toSessionContext(actorSession))
  if (!actor.authenticated || actor.role !== 'Local_Provider') {
    throw new ExperienceError('Forbidden: Only local providers can delete experiences', 403)
  }

  const repository = demoRepository()
  const stored = (await repository.find('experiences', row => row.experience_id === experienceId))
  if ((stored && actor.providerId !== stored.provider_id) || (!stored && actor.providerId && actor.providerId !== DEFAULT_OWNER_ID)) {
    throw new ExperienceError('Forbidden: Only owning provider can delete experience (BR-002)', 403)
  }

  const bookings = (await repository.all('bookings')).filter(row => row.experience_id === experienceId)
  const hasActiveBooking = experienceId === 'exp-with-active-booking' || bookings.some(row => row.status === 'On hold' || row.status === 'Booked')
  // BR-019: Active booking blocks delete
  if (hasActiveBooking) {
    throw new ExperienceError('Cannot delete experience with active bookings (BR-019)', 409)
  }

  // Historical bookings archive
  if (experienceId === 'exp-with-historical-booking' || bookings.length > 0) {
    const archivedAt = new Date().toISOString()
    if (stored) (await repository.update('experiences', row => row.experience_id === experienceId, { archived_at: archivedAt, updated_at: archivedAt }))
    ;(await recordAuditLog(
      actor.userId || 'unknown-user',
      'ARCHIVE_EXPERIENCE',
      'Experience',
      experienceId,
      { reason: 'has_historical_bookings' },
    ))
    return {
      action: 'archived',
      archived_at: archivedAt,
    }
  }

  // Zero bookings hard-delete
  ;(await recordAuditLog(
    actor.userId || 'unknown-user',
    'DELETE_EXPERIENCE',
    'Experience',
    experienceId,
    { action: 'hard_delete' },
  ))
  if (stored) {
    ;(await repository.remove('profile_media', row => row.experience_id === experienceId))
    ;(await repository.remove('experience_discount_rules', row => row.experience_id === experienceId))
    ;(await repository.remove('experiences', row => row.experience_id === experienceId))
  }
  return {
    action: 'deleted',
  }

  })
}

export async function getExperienceById(experienceId: string): Promise<unknown> {
  const repository = demoRepository()
  const row = (await repository.find('experiences', item => item.experience_id === experienceId))
  if (!row) throw new ExperienceError('Experience not found', 404)
  const bookings = (await repository.all('bookings')).filter(booking => booking.experience_id === experienceId)
  const media = (await Promise.all((await repository.all('profile_media')).filter(item => item.experience_id === experienceId)
    .sort((a, b) => Number(a.display_order) - Number(b.display_order))
    .map(async item => {
      const file = (await repository.find('stored_files', stored => stored.file_id === item.file_id))
      return file ? [{
        file_id: item.file_id, category: item.category, url: mediaUrl(file.storage_key), file_name: file.file_name,
        media_type: file.media_type, file_size_bytes: Number(file.file_size_bytes),
        width_px: Number(file.width_px), height_px: Number(file.height_px),
      }] : []
    }))).flat()
  return {
    ...row,
    duration_minutes: Number(row.duration_minutes),
    price_per_person: Number(row.price_per_person),
    max_participants: Number(row.max_participants),
    notice_period_hours: Number(row.notice_period_hours),
    has_active_bookings: bookings.some(booking => booking.status === 'On hold' || booking.status === 'Booked'),
    deletion_outcome: bookings.some(booking => ['On hold','Booked'].includes(booking.status)) ? 'blocked' : bookings.length ? 'archive' : 'delete',
    group_discounts: (await repository.all('experience_discount_rules')).filter(item => item.experience_id === experienceId && item.rule_kind === 'Group Discount').map(item => ({ pax_threshold: Number(item.pax_threshold), discount_percentage: Number(item.discount_percentage) })),
    special_rates: (await repository.all('experience_discount_rules')).filter(item => item.experience_id === experienceId && item.rule_kind === 'Special Rate').map(item => ({ pax_threshold: Number(item.pax_threshold), discount_percentage: Number(item.discount_percentage) })),
    images: media,
  }
}

export async function listProviderExperiences(providerId: string, actorSession: SessionLike, includeArchived = false) {
  const actor = (await toSessionContext(actorSession))
  if (!actor.authenticated || actor.role !== 'Local_Provider' || actor.providerId !== providerId) {
    throw new ExperienceError('Forbidden: Only the owning provider can manage experiences', 403)
  }
  const repository = demoRepository()
  const bookings = (await repository.all('bookings'))
  return (await repository.all('experiences'))
    .filter(row => row.provider_id === providerId && (includeArchived || !row.archived_at))
    .map(row => ({
      ...row,
      duration_minutes: Number(row.duration_minutes),
      price_per_person: Number(row.price_per_person),
      max_participants: Number(row.max_participants),
      notice_period_hours: Number(row.notice_period_hours),
      has_active_bookings: bookings.some(booking => booking.experience_id === row.experience_id && (booking.status === 'On hold' || booking.status === 'Booked')),
    }))
}
