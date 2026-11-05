import { withBookingWriteLock } from '../booking/write-lock'

// Q9, research R4: Chat writes use the same in-process queue as Booking writes, because BKG also
// creates pair Chats (agency-sync.ts) inside withBookingWriteLock. One queue means the
// "no Active Chat for the pair → create one" check can never run twice at the same time.
// Not re-entrant: code already inside the lock calls the …Locked / plan helpers directly.
export function withChatWriteLock<T>(fn: () => Promise<T> | T): Promise<T> {
  return withBookingWriteLock(fn)
}
