import type { ApplicationStore } from '@/lib/db/application-store'
import { demoRepository } from '@/lib/db/application-store'
import type { DemoRow } from '@/lib/demo/types'

// Egress meter. Wraps the isolated fixture store and charges every call the way AsyncPostgresStore
// does against the pooler: all / find / update / remove / snapshot / transaction read the WHOLE table
// (SELECT * with the predicate applied in JS); where / dueHolds / project read only what SQL returns.
export interface Meter {
  rows: number
  bytes: number
  queries: number
  atomic: number
  /** whole-table reads per table (the expensive kind) */
  scans: Record<string, number>
  /** rows read per table */
  byTable: Record<string, number>
  reset(): void
}

export function countingStore(): { store: ApplicationStore; meter: Meter } {
  const inner = demoRepository() as ApplicationStore & Record<string, any>
  const meter: Meter = {
    rows: 0, bytes: 0, queries: 0, atomic: 0, scans: {}, byTable: {},
    reset() { this.rows = 0; this.bytes = 0; this.queries = 0; this.atomic = 0; this.scans = {}; this.byTable = {} },
  }
  const charge = (table: string, rows: readonly DemoRow[], scan: boolean) => {
    meter.queries += 1
    meter.rows += rows.length
    meter.byTable[table] = (meter.byTable[table] ?? 0) + rows.length
    meter.bytes += rows.reduce((sum, row) => sum + JSON.stringify(row).length, 0)
    if (scan) meter.scans[table] = (meter.scans[table] ?? 0) + 1
  }
  const scanOf = async (table: string) => { charge(table, await inner.all(table), true) }
  const store: Record<string, unknown> = {
    all: async (name: string) => { const rows = await inner.all(name); charge(name, rows, true); return rows },
    find: async (name: string, predicate: (row: DemoRow) => boolean) => { await scanOf(name); return inner.find(name, predicate) },
    snapshot: async (names: readonly string[]) => { for (const name of names) await scanOf(name); return inner.snapshot(names) },
    insert: async (name: string, row: DemoRow) => inner.insert(name, row),
    update: async (name: string, predicate: (row: DemoRow) => boolean, changes: Partial<DemoRow>) => { await scanOf(name); return inner.update(name, predicate, changes) },
    remove: async (name: string, predicate: (row: DemoRow) => boolean) => { await scanOf(name); return inner.remove(name, predicate) },
    applyBatch: async (operations: Parameters<ApplicationStore['applyBatch']>[0]) => {
      for (const operation of operations) if ('match' in operation) await scanOf(operation.table)
      return inner.applyBatch(operations)
    },
    transaction: async (names: readonly string[], work: (tables: Record<string, DemoRow[]>) => unknown) => {
      for (const name of names) await scanOf(name)
      return inner.transaction(names, work)
    },
    atomic: async (names: readonly string[], work: () => Promise<unknown>) => { meter.atomic += 1; return inner.atomic(names, work) },
  }
  // Keyed reads exist only after the egress fix; before it the production code never calls them.
  for (const method of ['where', 'dueHolds', 'project'] as const) {
    store[method] = async (...args: any[]) => {
      const rows = (await (inner[method] as (...a: any[]) => Promise<DemoRow[]>)(...args))
      charge(String(args[0] instanceof Date ? 'bookings' : args[0]), rows, false)
      return rows
    }
  }
  return { store: store as unknown as ApplicationStore, meter }
}
