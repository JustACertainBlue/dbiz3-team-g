import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync, rmdirSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import { parse } from 'csv-parse/sync'
import type { BatchOperation, DemoDatabase, DemoRepository, DemoRow } from './types'

function createFromSeed(root: string): DemoDatabase {
  const seedDirectory = join(root, 'data', 'seed')
  const tables: Record<string, DemoRow[]> = {}
  for (const file of readdirSync(seedDirectory).filter(name => name.endsWith('.csv')).sort()) {
    tables[file.slice(0, -4)] = parse(readFileSync(join(seedDirectory, file), 'utf8'), {
      columns: true,
      skip_empty_lines: true,
      bom: true,
    }) as DemoRow[]
  }
  return {
    meta: { format: 'hab-demo-json-v1', seeded_at: new Date().toISOString(), source: 'data/seed/*.csv' },
    tables,
  }
}

export class JsonDemoRepository implements DemoRepository {
  private readonly filePath: string
  private database: DemoDatabase
  private readonly volatile: boolean

  constructor(private readonly root = process.cwd(), options: { volatile?: boolean } = {}) {
    this.filePath = join(root, '.demo-data', 'runtime.json')
    this.volatile = options.volatile ?? process.env.NODE_ENV === 'test'
    this.database = this.volatile ? createFromSeed(root) : this.withLock(() => this.loadOrSeed())
  }

  private withLock<T>(work: () => T): T {
    if (this.volatile) return work()
    mkdirSync(dirname(this.filePath), { recursive: true })
    const lock = `${this.filePath}.lock`
    const deadline = Date.now() + 5000
    let deniedWithoutLock = false
    while (true) {
      try { mkdirSync(lock); break }
      catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        // Issue #96: on Windows mkdir returns EPERM/EACCES (not EEXIST) while another writer is still
        // removing its lock directory. That is contention when the directory exists, or once when it has
        // just disappeared; a denial that repeats with no lock directory is a real error.
        if (code === 'EPERM' || code === 'EACCES') {
          if (existsSync(lock)) deniedWithoutLock = false
          else if (deniedWithoutLock) throw error
          else deniedWithoutLock = true
        } else if (code !== 'EEXIST') throw error
        if (Date.now() >= deadline) throw new Error('Demo database is busy. Retry the operation; inspect runtime.json.lock if its writer exited unexpectedly.')
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10)
      }
    }
    try { return work() } finally { rmdirSync(lock) }
  }

  private refresh(): void {
    if (!this.volatile) this.database = this.loadOrSeed()
  }

  private mutate<T>(work: () => T): T {
    return this.withLock(() => {
      this.refresh()
      const previous = this.database
      this.database = structuredClone(previous)
      try { return work() } catch (error) { this.database = previous; throw error }
    })
  }

  private loadOrSeed(): DemoDatabase {
    if (this.volatile) return createFromSeed(this.root)
    if (!existsSync(this.filePath)) {
      const database = createFromSeed(this.root)
      this.persist(database)
      return database
    }
    const parsed = JSON.parse(readFileSync(this.filePath, 'utf8')) as DemoDatabase
    if (parsed.meta?.format !== 'hab-demo-json-v1' || !parsed.tables) {
      throw new Error('Unsupported demo database format. Run npm run demo:reset.')
    }
    return parsed
  }

  private persist(database = this.database): void {
    if (this.volatile) return
    mkdirSync(dirname(this.filePath), { recursive: true })
    const temporary = `${this.filePath}.${process.pid}.${randomUUID()}.tmp`
    writeFileSync(temporary, `${JSON.stringify(database, null, 2)}\n`, 'utf8')
    renameSync(temporary, this.filePath)
  }

  private table(name: string): DemoRow[] {
    return this.database.tables[name] ??= []
  }

  all(table: string): DemoRow[] {
    this.refresh()
    return this.table(table).map(row => ({ ...row }))
  }

  /** Synchronous read/check/write transaction under the same cross-process lock. */
  transaction<T>(work: (tables: Record<string, DemoRow[]>) => T): T {
    return this.mutate(() => {
      const result = work(this.database.tables)
      this.persist()
      return result
    })
  }

  find(table: string, predicate: (row: DemoRow) => boolean): DemoRow | undefined {
    this.refresh()
    const row = this.table(table).find(predicate)
    return row ? { ...row } : undefined
  }

  insert(table: string, row: DemoRow): DemoRow {
    return this.mutate(() => {
    this.table(table).push({ ...row })
    this.persist()
    return { ...row }
    })
  }

  update(table: string, predicate: (row: DemoRow) => boolean, changes: Partial<DemoRow>): DemoRow | undefined {
    return this.mutate(() => {
    const row = this.table(table).find(predicate)
    if (!row) return undefined
    Object.assign(row, changes)
    this.persist()
    return { ...row }
    })
  }

  remove(table: string, predicate: (row: DemoRow) => boolean): number {
    return this.mutate(() => {
    const rows = this.table(table)
    const retained = rows.filter(row => !predicate(row))
    const removed = rows.length - retained.length
    if (removed) {
      this.database.tables[table] = retained
      this.persist()
    }
    return removed
    })
  }

  // Inserts rows and updates single rows across several tables with one persist. The in-memory
  // tables change only after the write succeeds, so a failed persist leaves none of the changes
  // (BKG BR-019, spec #44). An update that matches no row throws before anything is written.
  applyBatch(operations: readonly BatchOperation[]): DemoRow[] {
    return this.mutate(() => this.batch(operations))
  }

  private batch(operations: readonly BatchOperation[]): DemoRow[] {
    const tables = { ...this.database.tables }
    const results: DemoRow[] = []
    for (const operation of operations) {
      const rows = tables[operation.table] ?? []
      if ('row' in operation) {
        tables[operation.table] = [...rows, { ...operation.row }]
        results.push({ ...operation.row })
        continue
      }
      const index = rows.findIndex(operation.match)
      if (index < 0) throw new Error(`applyBatch: no ${operation.table} row matches the update`)
      const updated = { ...rows[index], ...operation.changes } as DemoRow
      tables[operation.table] = rows.map((row, i) => (i === index ? updated : row))
      results.push({ ...updated })
    }
    const next: DemoDatabase = { ...this.database, tables }
    this.persist(next)
    this.database = next
    return results
  }

  snapshot(tableNames: readonly string[]): Record<string, DemoRow[]> {
    this.refresh()
    return Object.fromEntries(tableNames.map(name => [name, this.table(name).map(row => ({ ...row }))]))
  }

  reset(): void {
    this.mutate(() => {
    this.database = createFromSeed(this.root)
    this.persist()
    })
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __habDemoRepository: JsonDemoRepository | undefined
}

export function demoRepository(): JsonDemoRepository {
  return globalThis.__habDemoRepository ??= new JsonDemoRepository()
}
