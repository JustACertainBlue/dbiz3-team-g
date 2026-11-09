// Issues #157 / #158 (spec-BKG FR-008, spec-IAC FR-002): screens that show data another user can
// change re-fetch it every 10 s while the tab is visible. Hidden tab: no request. Becoming visible:
// fetch at once, then every 10 s again. One fetch at a time; a failed fetch is retried next tick.
// Polling instead of Supabase Realtime (decision 09/11): the app has no Supabase Auth or supabase-js,
// and anon/authenticated have no table access.
export const POLL_INTERVAL_MS = 10_000

export interface VisibilitySource {
  readonly visibilityState: string
  addEventListener(type: 'visibilitychange', listener: () => void): void
  removeEventListener(type: 'visibilitychange', listener: () => void): void
}

export function startPolling(
  fetchNow: () => unknown,
  options: { intervalMs?: number; doc?: VisibilitySource } = {},
): () => void {
  const intervalMs = options.intervalMs ?? POLL_INTERVAL_MS
  const doc = options.doc ?? document
  let timer: ReturnType<typeof setInterval> | undefined
  let inFlight = false

  const tick = async () => {
    if (inFlight) return
    inFlight = true
    try {
      await fetchNow()
    } catch {
      // keep polling; the screen keeps what it showed
    } finally {
      inFlight = false
    }
  }
  const stopTimer = () => {
    if (timer !== undefined) clearInterval(timer)
    timer = undefined
  }
  const startTimer = () => {
    stopTimer()
    timer = setInterval(() => { void tick() }, intervalMs)
  }
  const onVisibility = () => {
    if (doc.visibilityState === 'hidden') return stopTimer()
    void tick()
    startTimer()
  }

  doc.addEventListener('visibilitychange', onVisibility)
  if (doc.visibilityState !== 'hidden') startTimer()
  return () => {
    stopTimer()
    doc.removeEventListener('visibilitychange', onVisibility)
  }
}
