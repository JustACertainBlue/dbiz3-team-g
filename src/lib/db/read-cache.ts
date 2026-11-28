import type { DemoRow } from '../demo/types'

// Short in-process cache for tables that change rarely (villages, experiences, provider profiles, slots...).
// Egress audit: every page used to re-read these tables from the pooler on each render and each 10 s refresh.
// A write made by this process drops the affected tables at once (AsyncPostgresStore); another instance's
// write is seen after at most the TTL. HAB_READ_CACHE_SECONDS=0 disables it; default 30 s, 0 under tests.
const entries = new Map<string, { at: number; rows: DemoRow[] }>()
const inflight = new Map<string, Promise<DemoRow[]>>()
let generation = 0

export function readCacheTtlMs(env: Record<string, string | undefined> = process.env): number {
  const raw = env.HAB_READ_CACHE_SECONDS
  if (raw !== undefined && raw.trim() !== '') {
    const seconds = Number(raw)
    return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : 0
  }
  return env.NODE_ENV === 'test' ? 0 : 30_000
}

/** Rows of `name`, loaded at most once per TTL. Callers get their own copy and may mutate it. */
export async function cachedRows(name: string, load: () => Promise<DemoRow[]>, now = Date.now()): Promise<DemoRow[]> {
  const ttl = readCacheTtlMs()
  if (ttl === 0) return load()
  const hit = entries.get(name)
  if (hit && now - hit.at < ttl) return structuredClone(hit.rows)
  let pending = inflight.get(name)
  if (!pending) {
    const started = generation
    pending = load().then(rows => { if (started === generation) entries.set(name, { at: now, rows }); return rows }).finally(() => inflight.delete(name))
    inflight.set(name, pending)
  }
  return structuredClone(await pending)
}

/** Drop cached tables (all when `names` is omitted). Called after every write to them. */
export function invalidateReadCache(names?: Iterable<string>): void {
  generation += 1 // a load that started before this write must not repopulate the cache with pre-write rows
  if (!names) { entries.clear(); inflight.clear(); return }
  for (const name of names) { entries.delete(name); inflight.delete(name) }
}
