'use client'

import { useEffect, useRef } from 'react'
import { startPolling } from './poller'

// Shared client hook (#157 / #158): BKG138 and SCH141 through <AutoRefresh />, and the open Chat
// on COM048 / COM065. The latest callback is always used, without restarting the timer.
export function usePolling(fetchNow: () => unknown, enabled = true): void {
  const latest = useRef(fetchNow)
  latest.current = fetchNow
  useEffect(() => {
    if (!enabled) return
    return startPolling(() => latest.current())
  }, [enabled])
}
