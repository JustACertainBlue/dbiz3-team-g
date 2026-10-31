// In-process mutex for Booking writes (AC-BKG-RACE). It serialises "check + write" inside one
// Node process only; two processes sharing one runtime.json are not protected.
declare global {
  // eslint-disable-next-line no-var
  var __habBookingWriteTail: Promise<unknown> | undefined
}

export function withBookingWriteLock<T>(fn: () => Promise<T> | T): Promise<T> {
  const previous = globalThis.__habBookingWriteTail ?? Promise.resolve()
  const run = previous.then(() => fn())
  globalThis.__habBookingWriteTail = run.catch(() => undefined)
  return run
}
