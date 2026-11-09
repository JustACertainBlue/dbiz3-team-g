/**
 * Issues #157 (BKG138 / SCH141, spec-BKG FR-008) and #158 (COM048 / COM065, spec-IAC FR-002
 * "Message delivered immediately", screen Purpose "real-time").
 * Decision (linhkhanh-vu, 09/11): polling every 10 s, paused while the tab is hidden, resumed with an
 * immediate fetch when it becomes visible; one shared client hook; no Supabase Realtime.
 */
import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POLL_INTERVAL_MS, startPolling, type VisibilitySource } from '@/lib/client/poller'
import { mergeLatestPage } from '@/app/messages/chat-view'

function fakeDocument(initial: 'visible' | 'hidden' = 'visible') {
  const listeners = new Set<() => void>()
  const doc = {
    visibilityState: initial as string,
    addEventListener: (_type: 'visibilitychange', l: () => void) => { listeners.add(l) },
    removeEventListener: (_type: 'visibilitychange', l: () => void) => { listeners.delete(l) },
  }
  const set = (state: 'visible' | 'hidden') => { doc.visibilityState = state; listeners.forEach(l => l()) }
  return { doc: doc as VisibilitySource, set, listeners }
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('#157 / #158 | startPolling', () => {
  it('polls every 10 s', () => {
    expect(POLL_INTERVAL_MS).toBe(10_000)
  })

  it('visible tab: no fetch at start (the page just loaded), then one fetch per 10 s', async () => {
    const fetchNow = vi.fn()
    const { doc } = fakeDocument('visible')
    startPolling(fetchNow, { doc })
    expect(fetchNow).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(9_999)
    expect(fetchNow).toHaveBeenCalledTimes(0)
    await vi.advanceTimersByTimeAsync(1)
    expect(fetchNow).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(fetchNow).toHaveBeenCalledTimes(3)
  })

  it('hidden tab: no fetch at all', async () => {
    const fetchNow = vi.fn()
    const { doc } = fakeDocument('hidden')
    startPolling(fetchNow, { doc })
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetchNow).not.toHaveBeenCalled()
  })

  it('hidden tab: no timer is left running (no wake-ups at all)', async () => {
    const { doc, set } = fakeDocument('hidden')
    startPolling(vi.fn(), { doc })
    expect(vi.getTimerCount()).toBe(0)
    set('visible')
    expect(vi.getTimerCount()).toBe(1)
    set('hidden')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('visible → hidden stops fetching', async () => {
    const fetchNow = vi.fn()
    const { doc, set } = fakeDocument('visible')
    startPolling(fetchNow, { doc })
    await vi.advanceTimersByTimeAsync(10_000)
    set('hidden')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetchNow).toHaveBeenCalledTimes(1)
  })

  it('hidden → visible fetches now, then every 10 s again', async () => {
    const fetchNow = vi.fn()
    const { doc, set } = fakeDocument('hidden')
    startPolling(fetchNow, { doc })
    await vi.advanceTimersByTimeAsync(30_000)
    set('visible')
    expect(fetchNow).toHaveBeenCalledTimes(1)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchNow).toHaveBeenCalledTimes(2)
  })

  it('does not start a second fetch while one is still running', async () => {
    let finish: () => void = () => {}
    const fetchNow = vi.fn(() => new Promise<void>(resolve => { finish = resolve }))
    const { doc } = fakeDocument('visible')
    startPolling(fetchNow, { doc })
    await vi.advanceTimersByTimeAsync(30_000)
    expect(fetchNow).toHaveBeenCalledTimes(1)
    finish()
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchNow).toHaveBeenCalledTimes(2)
  })

  it('a failed fetch does not stop polling', async () => {
    const fetchNow = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined)
    const { doc } = fakeDocument('visible')
    startPolling(fetchNow, { doc })
    await vi.advanceTimersByTimeAsync(20_000)
    expect(fetchNow).toHaveBeenCalledTimes(2)
  })

  it('stop() clears the timer and the visibility listener', async () => {
    const fetchNow = vi.fn()
    const { doc, set, listeners } = fakeDocument('visible')
    const stop = startPolling(fetchNow, { doc })
    expect(listeners.size).toBe(1)
    stop()
    expect(listeners.size).toBe(0)
    set('visible')
    await vi.advanceTimersByTimeAsync(60_000)
    expect(fetchNow).not.toHaveBeenCalled()
  })
})

describe('#158 | mergeLatestPage keeps older messages the user already loaded', () => {
  const m = (id: string) => ({ message_id: id })
  const page = (chat: string, ids: string[], more: boolean) => ({ chat_session_id: chat, message_history: ids.map(m), has_more_messages: more })

  it('same chat: older loaded messages stay, new messages are appended', () => {
    const current = page('c1', ['m1', 'm2', 'm3'], false)
    const latest = page('c1', ['m2', 'm3', 'm4'], true)
    expect(mergeLatestPage(current, latest)).toEqual(page('c1', ['m1', 'm2', 'm3', 'm4'], false))
  })

  it('another chat or nothing loaded: the latest page as is', () => {
    expect(mergeLatestPage(page('c1', ['m1'], false), page('c2', ['x1'], true))).toEqual(page('c2', ['x1'], true))
    expect(mergeLatestPage(null, page('c2', ['x1'], true))).toEqual(page('c2', ['x1'], true))
  })

  it('takes the latest status fields (a Chat closed by the other side shows Closed)', () => {
    const current = { ...page('c1', ['m1'], false), chat_status: 'Active' }
    const latest = { ...page('c1', ['m1', 'm2'], false), chat_status: 'Closed' }
    expect(mergeLatestPage(current, latest)).toMatchObject({ chat_status: 'Closed', message_history: [m('m1'), m('m2')] })
  })
})

describe('#157 / #158 | the shared hook is used by BKG138, SCH141 and the open Chat', () => {
  const read = (path: string) => readFileSync(path, 'utf8')

  it('usePolling wraps startPolling', () => {
    expect(read('src/lib/client/use-polling.ts')).toMatch(/startPolling\(/)
  })

  it.each([
    ['BKG138', 'src/app/agency/[agencyId]/bookings/[bookingId]/page.tsx'],
    ['SCH141', 'src/app/agency/[agencyId]/schedule/page.tsx'],
    // BKG FR-002 (spec-BKG.md:317): Booking History "Syncs real-time when LP updates booking".
    ['BKG137', 'src/app/agency/[agencyId]/bookings/page.tsx'],
  ])('%s renders <AutoRefresh />, which polls with usePolling + router.refresh', (_screen, path) => {
    expect(read(path)).toMatch(/<AutoRefresh\s*\/>/)
    const auto = read('src/app/components/AutoRefresh.tsx')
    expect(auto).toMatch(/usePolling\(/)
    expect(auto).toMatch(/router\.refresh\(\)/)
  })

  it('COM048 / COM065 polls the open Chat with usePolling', () => {
    expect(read('src/app/messages/page.tsx')).toMatch(/usePolling\(/)
  })
})
