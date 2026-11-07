import { demoRepository } from '../db/application-store'
// In-process mutex for Booking writes (AC-BKG-RACE). It serialises "check + write" inside one
// Node process only; two processes sharing one runtime.json are not protected.
declare global {
  // eslint-disable-next-line no-var
  var __habBookingWriteTail: Promise<unknown> | undefined
}

export function withBookingWriteLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const previous = globalThis.__habBookingWriteTail ?? Promise.resolve()
  const run = previous.then(() => demoRepository().atomic(['bookings','booking_status_history','chat_sessions','chat_messages','chat_participants','chat_attachments','stored_files','quote_requests','experiences','provider_profiles','provider_profile_versions','audit_logs','notifications'],async()=>fn()))
  globalThis.__habBookingWriteTail = run.catch(() => undefined)
  return run
}
