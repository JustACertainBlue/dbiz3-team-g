import { randomUUID } from 'node:crypto'
import { demoRepository } from '../demo/json-repository'
import { bookingUpdateOperations } from './agency-sync'
import { hanoiTimestamp } from './clock'
import { withBookingWriteLock } from './write-lock'

// Automatic 72-hour expiry (BR-004, #40, #45, #46, #50, AC-BKG-EXPIRY).
export const EXPIRY_REASON = 'Automatic expiry: 72-hour On hold elapsed'
const TIMER_MS = 60_000

// Cancels every On hold whose hold has ended. Takes no lock: callers already inside
// withBookingWriteLock use this one, because the lock is not re-entrant (analyze H1).
// Each Booking is one event: Booking, history and Booking Update message in one persist (#44).
export function expireDueHoldsLocked(now: Date): string[] {
  const repository = demoRepository()
  const at = hanoiTimestamp(now.getTime())
  const due = repository.all('bookings')
    .filter(row => row.status === 'On hold' && Date.parse(row.hold_expires_at) <= now.getTime())
  for (const booking of due) {
    const cancelled = { ...booking, status: 'Cancelled', updated_at: at }
    repository.applyBatch([
      { table: 'bookings', match: row => row.booking_id === booking.booking_id && row.status === 'On hold', changes: { status: 'Cancelled', updated_at: at } },
      {
        table: 'booking_status_history',
        row: { history_id: randomUUID(), booking_id: booking.booking_id, from_status: 'On hold', to_status: 'Cancelled', changed_by: '', changed_at: at, reason: EXPIRY_REASON },
      },
      ...bookingUpdateOperations(cancelled, at).operations,
    ])
  }
  return due.map(row => row.booking_id)
}

// Locking variant for the timer, read paths and tests.
export function expireDueHolds(now: Date): Promise<string[]> {
  return withBookingWriteLock(() => expireDueHoldsLocked(now))
}

declare global {
  // eslint-disable-next-line no-var
  var __habBookingExpiryTimer: ReturnType<typeof setInterval> | undefined
}

// One timer per dev-server process (#50); never under tests (analyze M1).
export function startExpiryTimer(): void {
  if (process.env.NODE_ENV === 'test' || globalThis.__habBookingExpiryTimer) return
  globalThis.__habBookingExpiryTimer = setInterval(() => {
    expireDueHolds(new Date()).catch(() => undefined)
  }, TIMER_MS)
  globalThis.__habBookingExpiryTimer.unref?.()
}
