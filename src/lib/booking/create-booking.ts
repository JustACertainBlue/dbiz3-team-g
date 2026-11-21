import { randomUUID } from 'node:crypto'
import { toSessionContext, type SessionLike } from '../auth/session'
import { demoRepository } from '../db/application-store'
import type { DemoRow } from '../demo/types'
import { bookingUpdateOperations } from './agency-sync'
import { hanoiTimestamp, systemClock, type Clock } from './clock'
import { findConflict } from './conflicts'
import { groupPrice } from './group-price'
import { assertSlotAndCapacity } from './slot-rules'
import { parseBookingRequest } from './request-card'
import { expireDueHoldsLocked } from './expire-holds'
import { HOLD_HOURS } from '../provider/hold-hours'
import { fitsOperatingHours } from './operating-hours'
import { withBookingWriteLock } from './write-lock'

// F-SCHED-03 Create Booking (spec-BKG US-4). Contract: specs/004-bkg-core/contracts/create-booking-api.md

const HOUR = 3_600_000

export type BookingErrorCode =
  | 'VALIDATION_ERROR'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'PROVIDER_NOT_ELIGIBLE'
  | 'AGENCY_NOT_ELIGIBLE'
  | 'SLOT_UNAVAILABLE'
  | 'BOOKING_TERMINAL'
  | 'INVALID_TRANSITION'

const STATUS_BY_CODE: Record<BookingErrorCode, number> = {
  VALIDATION_ERROR: 400,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  PROVIDER_NOT_ELIGIBLE: 409,
  AGENCY_NOT_ELIGIBLE: 409,
  SLOT_UNAVAILABLE: 409,
  BOOKING_TERMINAL: 409,
  INVALID_TRANSITION: 409,
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
  agreed_price: number | null
  conditions: BookingConditions
  source_chat_session_id: string
  request_message_id: string
  agreed_conditions: string
}

export const isPositiveInteger = (value: unknown): value is number => Number.isInteger(value) && (value as number) > 0
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function invalid(message: string): never {
  throw new BookingError('VALIDATION_ERROR', message)
}

// Only an authenticated Local Provider may open BKG134, and only for its own Provider (BR-001).
export async function canOpenCreateBooking(session: SessionLike, providerId: string): Promise<boolean> {
  const actor = (await toSessionContext(session))
  return actor.authenticated && actor.role === 'Local_Provider' && !!actor.providerId && actor.providerId === providerId
}

// Booking conditions prefilled as a snapshot of the Experience (BR-020, OQ #9).
export function bookingConditionsFromExperience(experience: DemoRow): BookingConditions {
  return {
    notice_period: Number(experience.notice_period_hours),
    cancellation_policy: JSON.parse(experience.cancellation_policy) as Record<string, unknown>,
  }
}

export function validateConditions(value: unknown): BookingConditions {
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
  // Omitted: the server prices the Booking from the Experience list price and Group Discount (screen 35 does not edit it).
  const price = input.agreed_price
  if (price !== undefined && price !== null && (typeof price !== 'number' || !Number.isFinite(price) || price <= 0)) invalid('agreed_price must be > 0')
  const requestId = input.request_message_id
  if (requestId !== undefined && requestId !== null && typeof requestId !== 'string') invalid('request_message_id must be an ID')
  const conditionsText = typeof input.agreed_conditions === 'string' ? input.agreed_conditions.trim() : ''
  if ([...conditionsText].length > 1000) invalid('agreed_conditions is longer than 1000 characters')
  const chat = input.source_chat_session_id
  if (chat !== undefined && chat !== null && typeof chat !== 'string') invalid('source_chat_session_id must be an ID')
  return {
    experience_id: input.experience_id,
    agency_id: input.agency_id,
    start,
    duration: input.duration,
    group_size: input.group_size,
    agreed_price: typeof price === 'number' ? price : null,
    conditions: validateConditions(input.booking_conditions),
    source_chat_session_id: chat ?? '',
    request_message_id: typeof requestId === 'string' ? requestId : '',
    agreed_conditions: conditionsText,
  }
}

export async function createBooking(
  session: SessionLike,
  input: Record<string, unknown>,
  // afterConflictCheck is a test-only seam: an async pause between the check and the write
  // (tests/unit/bkg-race-pause.test.ts).
  options: { now?: Clock; afterConflictCheck?: () => Promise<void> } = {},
): Promise<CreateBookingResult> {
  // BR-001: only a Local Provider controls the Booking lifecycle.
  const actor = (await toSessionContext(session))
  if (!actor.authenticated || actor.role !== 'Local_Provider' || !actor.providerId || !actor.userId) {
    throw new BookingError('FORBIDDEN', 'Only a Local Provider can create a Booking')
  }
  const { providerId, userId } = actor
  const request = validateInput(input)
  const repository = demoRepository()

  const experience = (await repository.find('experiences', row => row.experience_id === request.experience_id))
  if (!experience) throw new BookingError('NOT_FOUND', 'Experience not found')
  if (experience.provider_id !== providerId) throw new BookingError('FORBIDDEN', 'The Experience belongs to another Provider')

  // BR-018 and #37: active, Verified Provider and an unarchived Experience.
  const provider = (await repository.find('provider_profiles', row => row.provider_id === providerId))
  const providerUser = provider && (await repository.find('user_accounts', row => row.user_id === provider.user_id))
  if (!provider || provider.verification_status !== 'Verified' || providerUser?.account_status !== 'Active') {
    throw new BookingError('PROVIDER_NOT_ELIGIBLE', 'The Provider must be Verified and active')
  }
  if (experience.archived_at) throw new BookingError('PROVIDER_NOT_ELIGIBLE', 'The Experience is archived')

  // #39: the selected Agency's account must be Approved.
  const agency = (await repository.find('agency_profiles', row => row.agency_id === request.agency_id))
  if (!agency) throw new BookingError('NOT_FOUND', 'Agency not found')
  const agencyUser = (await repository.find('user_accounts', row => row.user_id === agency.user_id))
  if (agencyUser?.account_status !== 'Approved') throw new BookingError('AGENCY_NOT_ELIGIBLE', 'The Agency account is not Approved')

  // UI v3 decision #1: a Provider books only for an Agency that has already chatted with it (any Chat of the pair).
  const chatted = (await repository.find('chat_sessions', row => row.agency_id === request.agency_id && row.provider_id === providerId))
  if (!chatted) throw new BookingError('FORBIDDEN', 'The Agency has not chatted with this Provider')

  // Screen 35 (UI v3): the request note of 04/24 is copied to bookings.note; only a Quote Request of this pair counts.
  let requestNote = ''
  if (request.request_message_id) {
    const message = (await repository.find('chat_messages', row => row.message_id === request.request_message_id && row.message_kind === 'Quote Request'))
    const chat = message && (await repository.find('chat_sessions', row => row.chat_session_id === message.chat_session_id))
    const card = chat && chat.agency_id === request.agency_id && chat.provider_id === providerId ? parseBookingRequest(message.text) : null
    if (!card) invalid('request_message_id is not a booking request of this Agency and Provider')
    requestNote = card.note
  }
  // List price with the Group Discount when no price is given.
  const rules = (await repository.all('experience_discount_rules'))
    .filter(row => row.experience_id === request.experience_id && row.rule_kind === 'Group Discount')
    .map(row => ({ pax: Number(row.pax_threshold), pct: Number(row.discount_percentage) }))
  const agreedPrice = request.agreed_price ?? groupPrice(Number(experience.price_per_person), request.group_size, rules).total

  // OQ #7: group_size must not exceed the Experience's max_participants.
  if (request.group_size > Number(experience.max_participants)) invalid('group_size exceeds max_participants')

  const now = (options.now ?? systemClock)().getTime()
  const startAt = hanoiTimestamp(request.start)
  const endAt = hanoiTimestamp(request.start + request.duration * 60_000) // BR-020

  // Check + write run inside this lock; tests/unit/bkg-race-pause.test.ts proves it with an
  // async pause between findConflict and applyBatch (AC-BKG-RACE, build-log §4).
  return (await withBookingWriteLock(async () => {
    // #50, analyze M2: expire due holds first, so an expired hold no longer blocks this slot.
    ;(await expireDueHoldsLocked(new Date(now)))
    // FR-003: atomic re-check against operating hours and On hold/Booked Bookings (BR-005, AC-BKG-RACE).
    const hours = (await repository.all('provider_operating_hours'))
      .filter(row => row.provider_id === providerId)
      .map(row => ({ weekday: row.weekday, local_start: row.local_start, local_end: row.local_end }))
    if (!fitsOperatingHours(hours, startAt, endAt)) {
      throw new BookingError('SLOT_UNAVAILABLE', 'Slot Unavailable: outside the Provider operating hours')
    }
    if (findConflict((await repository.all('bookings')), providerId, startAt, endAt)) {
      throw new BookingError('SLOT_UNAVAILABLE', 'Slot Unavailable: the time overlaps another Booking')
    }
    // Slot + capacity inside the same transaction (UI v3 decision #7), shared with the edit.
    const lockedExperience = (await repository.find('experiences', row => row.experience_id === request.experience_id)) ?? experience
    await assertSlotAndCapacity(repository, { experience: lockedExperience, startAt, endAt, groupSize: request.group_size })
    if (options.afterConflictCheck) await options.afterConflictCheck()

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
      agreed_price_total: agreedPrice.toFixed(2),
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
      ...(requestNote ? { note: requestNote } : {}),
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
    // BR-019: Booking, its initial history and the F-SCHED-08 Booking Update message in one persist.
    ;(await repository.applyBatch([
      { table: 'bookings', row: booking },
      { table: 'booking_status_history', row: history },
      ...(await bookingUpdateOperations(booking, createdAt, [], request.agreed_conditions ? { suffix: `. Điều kiện đã thống nhất: ${request.agreed_conditions}` } : {})).operations,
    ]))

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
  }))
}
