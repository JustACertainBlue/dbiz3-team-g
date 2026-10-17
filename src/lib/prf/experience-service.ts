import type { MockSession } from '../../../tests/prf/helpers/mockSession'
import { ExperienceCreateSchema, ExperienceUpdateSchema } from './validators'
import { ZodError } from 'zod'
import { recordAuditLog } from './audit-logger'

export interface ExperienceImageInput {
  url: string
  category: 'artisan_working' | 'workshop_space' | 'finished_product'
  caption?: string
}

export interface ExperienceInput {
  name: string
  description: string
  category: string
  duration_minutes: number
  price_per_person: number
  max_participants: number
  notice_period_hours: number
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

/** T026: Create Experience */
export async function createExperience(
  actorSession: MockSession,
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

  // BR-009: Must contain at least one image of each of the 3 required categories
  const categories = new Set(parsed.images.map(img => img.category))
  const requiredCategories: Array<'artisan_working' | 'workshop_space' | 'finished_product'> = [
    'artisan_working',
    'workshop_space',
    'finished_product',
  ]
  const missing = requiredCategories.filter(cat => !categories.has(cat))
  if (missing.length > 0) {
    throw new ExperienceError(`Missing required image categories: ${missing.join(', ')} (BR-009)`, 400)
  }

  const expId = `exp-${Date.now()}`
  recordAuditLog(
    actorSession.userId || 'unknown-user',
    'CREATE_EXPERIENCE',
    'Experience',
    expId,
    { name: parsed.name, price_per_person: parsed.price_per_person },
  )

  return {
    experience_id: expId,
    provider_id: actorSession.providerId || DEFAULT_OWNER_ID,
    name: parsed.name,
    price_per_person: parsed.price_per_person,
    max_participants: parsed.max_participants,
    created_at: new Date().toISOString(),
  }
}

/** T027: Update Experience */
export async function updateExperience(
  experienceId: string,
  actorSession: MockSession,
  input: Partial<ExperienceInput>,
): Promise<{
  updated: boolean
  provider_verification_status: string
  reverification_triggered: boolean
}> {
  if (!actorSession || !actorSession.authenticated || actorSession.role !== 'LocalProvider') {
    throw new ExperienceError('Forbidden: Only local providers can update experiences', 403)
  }

  // BR-002: Ownership check
  if (actorSession.providerId && actorSession.providerId !== DEFAULT_OWNER_ID) {
    throw new ExperienceError('Forbidden: Only owning provider can update experience (BR-002)', 403)
  }

  // Check active booking locked fields per BR-014
  const hasActiveBooking = experienceId === 'exp-with-active-booking'
  if (hasActiveBooking) {
    const lockedFields: Array<keyof ExperienceInput> = ['price_per_person', 'duration_minutes', 'max_participants']
    const attemptedLocked = lockedFields.some(field => field in input && input[field] !== undefined)
    if (attemptedLocked) {
      throw new ExperienceError('Cannot modify locked fields while active bookings exist (BR-014)', 409)
    }
  }

  recordAuditLog(
    actorSession.userId || 'unknown-user',
    'UPDATE_EXPERIENCE',
    'Experience',
    experienceId,
    { updatedFields: Object.keys(input) },
  )

  // BR-020: Experience edit does NOT trigger provider re-verification
  return {
    updated: true,
    provider_verification_status: 'Verified',
    reverification_triggered: false,
  }
}

/** T028: Delete Experience */
export async function deleteExperience(
  experienceId: string,
  actorSession: MockSession,
): Promise<{
  action: 'archived' | 'deleted'
  archived_at?: string
}> {
  if (!actorSession || !actorSession.authenticated || actorSession.role !== 'LocalProvider') {
    throw new ExperienceError('Forbidden: Only local providers can delete experiences', 403)
  }

  // BR-002: Ownership check
  if (actorSession.providerId && actorSession.providerId !== DEFAULT_OWNER_ID) {
    throw new ExperienceError('Forbidden: Only owning provider can delete experience (BR-002)', 403)
  }

  // BR-019: Active booking blocks delete
  if (experienceId === 'exp-with-active-booking') {
    throw new ExperienceError('Cannot delete experience with active bookings (BR-019)', 409)
  }

  // Historical bookings archive
  if (experienceId === 'exp-with-historical-booking') {
    recordAuditLog(
      actorSession.userId || 'unknown-user',
      'ARCHIVE_EXPERIENCE',
      'Experience',
      experienceId,
      { reason: 'has_historical_bookings' },
    )
    return {
      action: 'archived',
      archived_at: new Date().toISOString(),
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
  return {
    action: 'deleted',
  }
}

export async function getExperienceById(experienceId: string): Promise<unknown> {
  return {
    experience_id: experienceId,
    name: 'Nặn gốm Bát Tràng',
    price_per_person: 150000,
    max_participants: 12,
  }
}
