import { randomUUID } from 'node:crypto'
import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from '../demo/json-repository'
import type { DemoRow } from '../demo/types'
import { systemClock, type Clock } from './clock'
import { findConflict } from './conflicts'
import { fitsOperatingHours } from './operating-hours'
import { withBookingWriteLock } from './write-lock'

// F-SCHED-03 Create Booking (spec-BKG US-4). Contract: specs/004-bkg-core/contracts/create-booking-api.md

const HOUR = 3_600_000
const HOLD_HOURS = 72
const HANOI_OFFSET = 7 * HOUR

export type BookingErrorCode =
  | 'VALIDATION_ERROR'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'PROVIDER_NOT_ELIGIBLE'
  | 'AGENCY_NOT_ELIGIBLE'
  | 'SLOT_UNAVAILABLE'

const STATUS_BY_CODE: Record<BookingErrorCode, number> = {
  VALIDATION_ERROR: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PROVIDER_NOT_ELIGIBLE: 409,
  AGENCY_NOT_ELIGIBLE: 409,
  SLOT_UNAVAILABLE: 409,
}

export class BookingError extends Error {
  readonly statusCode: number

  constructor(public readonly code: BookingErrorCode, message: string) {
    super(message)
    this.name = 'BookingError'
    this.statusCode = STATUS_BY_CODE[code]
  }
}

export interface BookingConditions {
  notice_period: number
  cancellation_policy: Record<string, unknown>
}

export interface CreateBookingResult {
  booking_id: string
  status: 'On hold'
  created_at: string
  hold_expires_at: string
  public_schedule_block: { start_at: string; end_at: string; status: 'On hold' }
  private_schedule_synced: boolean
}

interface ValidInput {
  experience_id: string
  agency_id: string
  start: number
  duration: number
  group_size: number
  agreed_price: number
  conditions: BookingConditions
  source_chat_session_id: string
}

function hanoiTimestamp(timestamp: number): string {
  return new Date(timestamp + HANOI_OFFSET).toISOString().slice(0, 19) + '+07:00'
}

const isPositiveInteger = (value: unknown): value is number => Number.isInteger(value) && (value as number) > 0
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

function invalid(message: string): never {
  throw new BookingError('VALIDATION_ERROR', message)
}

// Only an authenticated Local Provider may open BKG134, and only for its own Provider (BR-001).
export function canOpenCreateBooking(session: ActorSession, providerId: string): boolean {
  return session.authenticated && session.role === 'LocalProvider' && !!session.providerId && session.providerId === providerId
}

// Booking conditions prefilled as a snapshot of the Experience (BR-020, OQ #9).
export function bookingConditionsFromExperience(experience: DemoRow): BookingConditions {
  return {
    notice_period: Number(experience.notice_period_hours),
    cancellation_policy: JSON.parse(experience.cancellation_policy) as Record<string, unknown>,
  }
}

function validateConditions(value: unknown): BookingConditions {
  // Same shape as the schema's booking_conditions_chk (#42).
  if (!isPlainObject(value)) invalid('booking_conditions is required')
  const notice = value.notice_period
  if (!Number.isInteger(notice) || (notice as number) < 0) invalid('notice_period must be an integer >= 0')
  const policy = value.cancellation_policy
  if (!isPlainObject(policy) || Object.keys(policy).length === 0) invalid('cancellation_policy must be a non-empty object')
  return { notice_period: notice as number, cancellation_policy: policy }
}

function validateInput(input: Record<string, unknown>): ValidInput {
  if (!isNonEmptyString(input.experience_id)) invalid('experience_id is required')
  if (!isNonEmptyString(input.agency_id)) invalid('agency_id is required')
  const start = typeof input.start_at === 'string' ? Date.parse(input.start_at) : NaN
  if (!Number.isFinite(start)) invalid('start_at must be a date-time')
  // Any duration > 0 is accepted; it need not equal the Experience's duration (#38).
  if (!isPositiveInteger(input.duration)) invalid('duration must be an integer > 0')
  if (!isPositiveInteger(input.group_size)) invalid('group_size must be an integer > 0')
  const price = input.agreed_price
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) invalid('agreed_price must be > 0')
  const chat = input.source_chat_session_id
  if (chat !== undefined && chat !== null && typeof chat !== 'string') invalid('source_chat_session_id must be an ID')
  return {
    experience_id: input.experience_id,
    agency_id: input.agency_id,
    start,
    duration: input.duration,
    group_size: input.group_size,
    agreed_price: price,
    conditions: validateConditions(input.booking_conditions),
    source_chat_session_id: chat ?? '',
  }
}

export async function createBooking(
  session: ActorSession,
  input: Record<string, unknown>,
  options: { now?: Clock } = {},
): Promise<CreateBookingResult> {
  // BR-001: only a Local Provider controls the Booking lifecycle.
  if (!session.authenticated || session.role !== 'LocalProvider' || !session.providerId || !session.userId) {
    throw new BookingError('FORBIDDEN', 'Only a Local Provider can create a Booking')
  }
  const { providerId, userId } = session
  const request = validateInput(input)
  const repository = demoRepository()

  const experience = repository.find('experiences', row => row.experience_id === request.experience_id)
  if (!experience) throw new BookingError('NOT_FOUND', 'Experience not found')
  if (experience.provider_id !== providerId) throw new BookingError('FORBIDDEN', 'The Experience belongs to another Provider')

  // BR-018 and #37: active, Verified Provider and an unarchived Experience.
  const provider = repository.find('provider_profiles', row => row.provider_id === providerId)
  const providerUser = provider && repository.find('user_accounts', row => row.user_id === provider.user_id)
  if (!provider || provider.verification_status !== 'Verified' || providerUser?.account_status !== 'Active') {
    throw new BookingError('PROVIDER_NOT_ELIGIBLE', 'The Provider must be Verified and active')
  }
  if (experience.archived_at) throw new BookingError('PROVIDER_NOT_ELIGIBLE', 'The Experience is archived')

  // #39: the selected Agency's account must be Approved.
  const agency = repository.find('agency_profiles', row => row.agency_id === request.agency_id)
  if (!agency) throw new BookingError('NOT_FOUND', 'Agency not found')
  const agencyUser = repository.find('user_accounts', row => row.user_id === agency.user_id)
  if (agencyUser?.account_status !== 'Approved') throw new BookingError('AGENCY_NOT_ELIGIBLE', 'The Agency account is not Approved')

  // OQ #7: group_size must not exceed the Experience's max_participants.
  if (request.group_size > Number(experience.max_participants)) invalid('group_size exceeds max_participants')

  const now = (options.now ?? systemClock)().getTime()
  const startAt = hanoiTimestamp(request.start)
  const endAt = hanoiTimestamp(request.start + request.duration * 60_000) // BR-020

  return withBookingWriteLock(() => {
    // FR-003: atomic re-check against operating hours and On hold/Booked Bookings (BR-005, AC-BKG-RACE).
    const hours = repository.all('provider_operating_hours')
      .filter(row => row.provider_id === providerId)
      .map(row => ({ weekday: row.weekday, local_start: row.local_start, local_end: row.local_end }))
    if (!fitsOperatingHours(hours, startAt, endAt)) {
      throw new BookingError('SLOT_UNAVAILABLE', 'Slot Unavailable: outside the Provider operating hours')
    }
    if (findConflict(repository.all('bookings'), providerId, startAt, endAt)) {
      throw new BookingError('SLOT_UNAVAILABLE', 'Slot Unavailable: the time overlaps another Booking')
    }

    const bookingId = randomUUID()
    const createdAt = hanoiTimestamp(now)
    const holdExpiresAt = hanoiTimestamp(now + HOLD_HOURS * HOUR) // BR-004
    const booking: DemoRow = {
      booking_id: bookingId,
      agency_id: request.agency_id,
      provider_id: providerId,
      experience_id: request.experience_id,
      source_chat_session_id: request.source_chat_session_id,
      start_at: startAt,
      duration_minutes: String(request.duration),
      group_size: String(request.group_size),
      agreed_price_total: request.agreed_price.toFixed(2),
      conditions_snapshot: JSON.stringify({
        notice_period_hours: request.conditions.notice_period,
        cancellation_policy: request.conditions.cancellation_policy,
      }),
      status: 'On hold', // BR-003
      created_at: createdAt,
      updated_at: createdAt,
      hold_expires_at: holdExpiresAt,
      end_at: endAt,
      arrival_at: '',
    }
    const history: DemoRow = {
      history_id: randomUUID(),
      booking_id: bookingId,
      from_status: '',
      to_status: 'On hold',
      changed_by: userId,
      changed_at: createdAt,
      reason: '',
    }
    // BR-019: Booking and its initial history in one persist.
    repository.applyBatch([
      { table: 'bookings', row: booking },
      { table: 'booking_status_history', row: history },
    ])

    return {
      booking_id: bookingId,
      status: 'On hold',
      created_at: createdAt,
      hold_expires_at: holdExpiresAt,
      // BR-009: the public block exposes only time and status.
      public_schedule_block: { start_at: startAt, end_at: endAt, status: 'On hold' },
      // #36: the Agency schedule is derived from bookings, so it is current as soon as this persists.
      private_schedule_synced: true,
    }
  })
}
