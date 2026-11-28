import { createHash } from 'node:crypto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { demoRepository as json } from '@/lib/demo/json-repository'
import { withApplicationStore } from '@/lib/db/application-store'
import { expireDueHolds } from '@/lib/booking/expire-holds'
import { productSessionFromRequest } from '@/lib/auth/product-session'
import { getChatHistory } from '@/lib/iac/chat-service'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { demoRuntime } from '@/lib/explore/demo-runtime'
import { AGENCY, PROVIDER_CHAT, PROVIDER, DEMO_AGENCY } from './iac-fixtures'
import { countingStore } from '../helpers/counting-store'

// Egress audit (docs/build/drafts/egress-audit.md): Supabase "Shared Pooler Egress" is the bytes the app pulls
// from PostgreSQL. AsyncPostgresStore.all / find / update read whole tables, so the budget is counted in rows.
const ON_HOLD = '54d7a276-90a2-5c70-be22-cb59ea95ea14' // hold until 2026-10-01 08:00 +07:00
const BEFORE_ANY_HOLD_ENDS = new Date('2026-09-20T00:00:00+07:00')
const report = (label: string, meter: { rows: number; bytes: number; queries: number; scans: Record<string, number> }) => {
  if (process.env.HAB_EGRESS_REPORT) console.info(`EGRESS ${label}: rows=${meter.rows} bytes=${meter.bytes} queries=${meter.queries} scans=${JSON.stringify(meter.scans)}`)
}

describe('egress | hold-expiry sweeper', () => {
  beforeEach(() => json().reset())

  it('a tick with no due hold reads no whole table, takes no lock and writes nothing', async () => {
    const { store, meter } = countingStore()
    await withApplicationStore(store, async () => { expect(await expireDueHolds(BEFORE_ANY_HOLD_ENDS)).toEqual([]) })
    report('sweeper tick (nothing due)', meter)
    expect(meter.scans.bookings ?? 0).toBe(0)
    expect(meter.atomic).toBe(0)
    expect(meter.rows).toBe(0)
  })

  it('a due hold is still cancelled (72 h behaviour unchanged) with at most the one guarded UPDATE touching bookings', async () => {
    const { store, meter } = countingStore()
    const expired = await withApplicationStore(store, () => expireDueHolds(new Date('2026-10-01T08:00:00+07:00')))
    report('sweeper tick (one due)', meter)
    expect(expired).toEqual([ON_HOLD])
    expect(json().find('bookings', row => row.booking_id === ON_HOLD)!.status).toBe('Cancelled')
    // The only remaining bookings read is applyBatch's guarded UPDATE of the expired row (it runs only when a hold is due).
    expect(meter.scans.bookings ?? 0).toBeLessThanOrEqual(1)
  })
})

describe('egress | per-request authentication', () => {
  beforeEach(() => json().reset())
  it('resolving the product session reads sessions / accounts / profiles by key, never whole tables', async () => {
    const account = json().find('user_accounts', row => row.user_id === AGENCY.userId)!
    json().insert('sessions', { session_id: '00000000-0000-4000-8000-0000000000aa', user_id: account.user_id, role_context: account.role_code,
      token_hash: createHash('sha256').update('egress-token').digest('hex'), expires_at: '2099-01-01T00:00:00+07:00', revoked_at: '', created_at: '2026-09-01T00:00:00+07:00' })
    const { store, meter } = countingStore()
    const identity = await withApplicationStore(store, () => productSessionFromRequest(new Request('http://x.test/', { headers: { cookie: 'hab_session=egress-token' } })))
    report('auth per request', meter)
    expect(identity?.userId).toBe(account.user_id)
    for (const table of ['sessions', 'user_accounts', 'agency_profiles', 'provider_profiles']) expect(meter.scans[table] ?? 0, table).toBe(0)
    expect(DEMO_AGENCY).toBeDefined()
  })
})

describe('egress | chat poll (/messages every 10 s)', () => {
  beforeEach(() => json().reset())
  it('loading one Chat history does not read the whole chat_messages table', async () => {
    const { store, meter } = countingStore()
    const history = await withApplicationStore(store, () => getChatHistory(PROVIDER, PROVIDER_CHAT))
    report('chat history poll', meter)
    expect(history.message_history.length).toBeGreaterThan(0)
    expect(meter.scans.chat_messages ?? 0).toBe(0)
  })
})

describe('egress | page data (/explore, /villages, /provider, /agency bookings)', () => {
  const tables = (meter: { scans: Record<string, number> }) => Object.keys(meter.scans)
  beforeEach(() => { json().reset(); vi.stubEnv('HAB_READ_CACHE_SECONDS', '0') })
  afterEach(() => vi.unstubAllEnvs())

  it('the default Explore snapshot skips the unbounded session and interaction tables', async () => {
    const { store, meter } = countingStore()
    await withApplicationStore(store, () => loadExploreRuntime())
    report('loadExploreRuntime()', meter)
    expect(tables(meter)).not.toContain('explore_sessions')
    expect(tables(meter)).not.toContain('explore_interactions')
  })

  it('never copies password hashes into page data', async () => {
    const { store } = countingStore()
    const seed = await withApplicationStore(store, () => loadExploreRuntime())
    expect(seed.user_accounts.length).toBeGreaterThan(0)
    for (const row of seed.user_accounts) expect(row).not.toHaveProperty('password_hash')
  })

  it('/explore loads the catalog once: demoRuntime reuses the page snapshot', async () => {
    const { store, meter } = countingStore()
    await withApplicationStore(store, async () => {
      const seed = await loadExploreRuntime({ sessions: true })
      meter.reset()
      await demoRuntime(seed)
    })
    expect(meter.queries).toBe(0)
  })

  it('/explore still sees sessions and interactions when the runtime asks for them', async () => {
    const seed = await loadExploreRuntime({ sessions: true })
    expect(seed.explore_sessions!.length).toBeGreaterThan(0)
    expect(seed.explore_interactions!.length).toBeGreaterThan(0)
  })
})

describe('egress | scheduler flag', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); delete (globalThis as { __habBookingExpiryTimer?: unknown }).__habBookingExpiryTimer })

  it('HAB_DISABLE_SCHEDULERS=1 keeps the hold-expiry scanner off; unset keeps it on (production default)', async () => {
    const { schedulersEnabled } = await import('@/lib/scheduler-flag')
    expect(schedulersEnabled({})).toBe(true)
    expect(schedulersEnabled({ NODE_ENV: 'production' })).toBe(true)
    expect(schedulersEnabled({ HAB_DISABLE_SCHEDULERS: '1' })).toBe(false)
    expect(schedulersEnabled({ HAB_DISABLE_SCHEDULERS: '0' })).toBe(true)
  })

  it('startExpiryTimer schedules nothing when the flag is set, and one timer otherwise', async () => {
    const { startExpiryTimer } = await import('@/lib/booking/expire-holds')
    const spy = vi.spyOn(globalThis, 'setInterval')
    vi.spyOn(console, 'info').mockImplementation(() => undefined)
    expect(startExpiryTimer({ NODE_ENV: 'development', HAB_DISABLE_SCHEDULERS: '1' })).toBe(false)
    expect(spy).not.toHaveBeenCalled()
    expect(startExpiryTimer({ NODE_ENV: 'development' })).toBe(true)
    expect(spy).toHaveBeenCalledTimes(1)
    expect(startExpiryTimer({ NODE_ENV: 'development' })).toBe(false) // one timer per process
    clearInterval((globalThis as { __habBookingExpiryTimer?: ReturnType<typeof setInterval> }).__habBookingExpiryTimer)
  })
})

describe('egress | short-lived read cache', () => {
  beforeEach(async () => { json().reset(); (await import('@/lib/db/read-cache')).invalidateReadCache() })
  afterEach(() => vi.unstubAllEnvs())
  const catalog = ['experiences', 'villages', 'provider_operating_hours']

  it('reads catalog tables once per TTL, live tables every time, and a write drops the cached table', async () => {
    vi.stubEnv('HAB_READ_CACHE_SECONDS', '30')
    const { invalidateReadCache } = await import('@/lib/db/read-cache')
    const { store, meter } = countingStore()
    await withApplicationStore(store, async () => {
      await loadExploreRuntime()
      const first = { ...meter.scans }
      await loadExploreRuntime()
      for (const table of catalog) expect(meter.scans[table], table).toBe(first[table])
      expect(meter.scans.bookings).toBe(first.bookings! + 1)
      invalidateReadCache(['villages'])
      await loadExploreRuntime()
      expect(meter.scans.villages).toBe(first.villages! + 1)
      expect(meter.scans.experiences).toBe(first.experiences)
    })
  })

  it('HAB_READ_CACHE_SECONDS=0 (the test default) never caches', async () => {
    const { store, meter } = countingStore()
    await withApplicationStore(store, async () => { await loadExploreRuntime(); await loadExploreRuntime() })
    expect(meter.scans.villages).toBe(2)
  })

  it('callers get their own copy: editing a cached row does not leak into the next read', async () => {
    vi.stubEnv('HAB_READ_CACHE_SECONDS', '30')
    const one = await loadExploreRuntime(); one.villages[0].name = 'EDITED'
    expect((await loadExploreRuntime()).villages[0].name).not.toBe('EDITED')
  })
})

describe('egress | /explore page render (report + budget)', () => {
  beforeEach(async () => { json().reset(); (await import('@/lib/db/read-cache')).invalidateReadCache() })
  afterEach(() => vi.unstubAllEnvs())

  it('a warm render reads far fewer rows than a cold one, and a cold one fewer than the old double snapshot', async () => {
    vi.stubEnv('HAB_READ_CACHE_SECONDS', '30')
    const { store, meter } = countingStore()
    await withApplicationStore(store, async () => { const seed = await loadExploreRuntime({ sessions: true }); await demoRuntime(seed) })
    const cold = { rows: meter.rows, bytes: meter.bytes }
    meter.reset()
    await withApplicationStore(store, async () => { const seed = await loadExploreRuntime({ sessions: true }); await demoRuntime(seed) })
    report('/explore cold', { ...meter, rows: cold.rows, bytes: cold.bytes })
    report('/explore warm', meter)
    const OLD_ROWS_PER_RENDER = 2 * 211 // measured before the fix: two 16-table snapshots (see egress-audit.md)
    expect(cold.rows).toBeLessThan(OLD_ROWS_PER_RENDER)
    expect(meter.rows).toBeLessThan(cold.rows / 2)
  })
})
