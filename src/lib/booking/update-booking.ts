import { randomUUID } from 'node:crypto'
import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from '../demo/json-repository'
import type { BatchOperation, DemoRow } from '../demo/types'
import { bookingUpdateOperations } from './agency-sync'
import { loadBookingForActor } from './booking-access'
import { hanoiTimestamp, systemClock, type Clock } from './clock'
import { findConflict } from './conflicts'
import { BookingError, invalid, isPositiveInteger, validateConditions } from './create-booking'
import { expireDueHoldsLocked } from './expire-holds'
import { fitsOperatingHours } from './operating-hours'
import { withBookingWriteLock } from './write-lock'

// F-SCHED-04 Update Booking details (spec-BKG US-5). Contract: specs/011-bkg-manage/contracts/manage-booking-api.md

const EDITABLE_FIELDS = ['start_at', 'duration', 'group_size', 'agreed_price', 'booking_conditions'] // #48

export interface UpdateBookingResult {
  updated_booking: DemoRow
  private_schedule_synced: boolean
  public_schedule_updated: boolean
  agency_notification_message_id: string | null
  audit_log_id: string | null
}

type Changes = Partial<Record<string, { before: unknown; after: unknown }>>

function sortedJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(sortedJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${sortedJson((value as Record<string, unknown>)[key])}`).join(',')}}`
  }
  return JSON.stringify(value)
}

function validateFields(input: Record<string, unknown>): void {
  const keys = Object.keys(input)
  if (keys.length === 0) invalid('at least one field must be provided')
  const unknown = keys.filter(key => !EDITABLE_FIELDS.includes(key))
  if (unknown.length) invalid(`fields not editable by F-SCHED-04: ${unknown.join(', ')}`) // BR-007, #48
  if ('start_at' in input && !(typeof input.start_at === 'string' && Number.isFinite(Date.parse(input.start_at)))) invalid('start_at must be a date-time')
  if ('duration' in input && !isPositiveInteger(input.duration)) invalid('duration must be an integer > 0')
  if ('group_size' in input && !isPositiveInteger(input.group_size)) invalid('group_size must be an integer > 0')
  if ('agreed_price' in input && !(typeof input.agreed_price === 'number' && Number.isFinite(input.agreed_price) && input.agreed_price > 0)) invalid('agreed_price must be > 0')
  if ('booking_conditions' in input) validateConditions(input.booking_conditions) // #42
}

export async function updateBooking(
  session: ActorSession,
  bookingId: string,
  input: Record<string, unknown>,
  // afterConflictCheck is a test-only seam (tests/unit/bkg-race-pause.test.ts).
  options: { now?: Clock; afterConflictCheck?: () => Promise<void> } = {},
): Promise<UpdateBookingResult> {
  validateFields(input)
  const now = (options.now ?? systemClock)().getTime()
  const repository = demoRepository()

  return withBookingWriteLock(async () => {
    // BR-001 first: a denied request writes nothing, not even expiry. Then expiry (#50, analyze H1) and a fresh read.
    if (loadBookingForActor(session, bookingId).view !== 'provider') throw new BookingError('FORBIDDEN', 'Only the Local Provider of this Booking can update it')
    expireDueHoldsLocked(new Date(now))
    const { booking } = loadBookingForActor(session, bookingId)
    if (booking.status !== 'On hold' && booking.status !== 'Booked') {
      throw new BookingError('BOOKING_TERMINAL', `A ${booking.status} Booking cannot be changed`) // BR-011
    }

    const start = 'start_at' in input ? Date.parse(input.start_at as string) : Date.parse(booking.start_at)
    const duration = 'duration' in input ? (input.duration as number) : Number(booking.duration_minutes)
    const groupSize = 'group_size' in input ? (input.group_size as number) : Number(booking.group_size)
    const price = 'agreed_price' in input ? (input.agreed_price as number) : Number(booking.agreed_price_total)
    const currentConditions = JSON.parse(booking.conditions_snapshot) as { notice_period_hours: number; cancellation_policy: Record<string, unknown> }
    const conditions = 'booking_conditions' in input
      ? (() => {
          const value = validateConditions(input.booking_conditions)
          return { notice_period_hours: value.notice_period, cancellation_policy: value.cancellation_policy }
        })()
      : currentConditions

    const experience = repository.find('experiences', row => row.experience_id === booking.experience_id)
    if (experience && groupSize > Number(experience.max_participants)) invalid('group_size exceeds max_participants') // #7

    const changes: Changes = {}
    if (start !== Date.parse(booking.start_at)) changes.start_at = { before: booking.start_at, after: hanoiTimestamp(start) }
    if (duration !== Number(booking.duration_minutes)) changes.duration = { before: Number(booking.duration_minutes), after: duration }
    if (groupSize !== Number(booking.group_size)) changes.group_size = { before: Number(booking.group_size), after: groupSize }
    if (price !== Number(booking.agreed_price_total)) changes.agreed_price = { before: Number(booking.agreed_price_total), after: price }
    if (sortedJson(conditions) !== sortedJson(currentConditions)) changes.booking_conditions = { before: currentConditions, after: conditions }

    const changedFields = Object.keys(changes)
    if (changedFields.length === 0) {
      // #52: nothing to write, no message, null ids.
      return { updated_booking: { ...booking }, private_schedule_synced: true, public_schedule_updated: false, agency_notification_message_id: null, audit_log_id: null }
    }

    const startAt = hanoiTimestamp(start)
    const endAt = hanoiTimestamp(start + duration * 60_000) // BR-020
    const timeChanged = 'start_at' in changes || 'duration' in changes
    if (timeChanged) {
      // #47: the whole new interval must fit the hours and not overlap another Booking, excluding itself.
      const hours = repository.all('provider_operating_hours')
        .filter(row => row.provider_id === booking.provider_id)
        .map(row => ({ weekday: row.weekday, local_start: row.local_start, local_end: row.local_end }))
      if (!fitsOperatingHours(hours, startAt, endAt)) throw new BookingError('SLOT_UNAVAILABLE', 'Slot Unavailable: outside the Provider operating hours')
      if (findConflict(repository.all('bookings'), booking.provider_id, startAt, endAt, booking.booking_id)) {
        throw new BookingError('SLOT_UNAVAILABLE', 'Slot Unavailable: the time overlaps another Booking')
      }
      if (options.afterConflictCheck) await options.afterConflictCheck()
    }

    const at = hanoiTimestamp(now)
    const bookingChanges: Partial<DemoRow> = {
      start_at: startAt,
      duration_minutes: String(duration),
      end_at: endAt,
      group_size: String(groupSize),
      agreed_price_total: price.toFixed(2),
      conditions_snapshot: JSON.stringify(conditions),
      updated_at: at, // hold_expires_at is never touched (#6)
    }
    const updated: DemoRow = { ...booking, ...bookingChanges } as DemoRow
    const auditId = randomUUID()
    const sync = bookingUpdateOperations(updated, at, changedFields)
    const operations: BatchOperation[] = [
      { table: 'bookings', match: row => row.booking_id === booking.booking_id, changes: bookingChanges },
      {
        table: 'audit_logs',
        row: {
          audit_id: auditId, actor_user_id: session.userId ?? '', action: 'booking.update', target_type: 'booking',
          target_id: booking.booking_id, occurred_at: at, change_or_result: JSON.stringify(changes),
        },
      }, // #27
      ...sync.operations,
    ]
    repository.applyBatch(operations) // #44: one persist for the whole event

    return {
      updated_booking: updated,
      private_schedule_synced: true,
      public_schedule_updated: timeChanged,
      agency_notification_message_id: sync.messageId,
      audit_log_id: auditId,
    }
  })
}
