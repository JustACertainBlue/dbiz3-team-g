// Runs once when the Next.js server starts. Starts the 72-hour hold-expiry scanner (60 s interval);
// reads still expire due holds as well (list-bookings, provider-schedule, change-status).
// The positive `=== 'nodejs'` check matters: Next removes this branch from the edge bundle, so `pg` is never compiled there.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startExpiryTimer } = await import('@/lib/booking/expire-holds')
    startExpiryTimer()
  }
}
