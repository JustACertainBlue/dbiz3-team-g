import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parse } from 'csv-parse/sync'
import type { DemoDatabase, DemoRepository, DemoRow } from './types'

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

  constructor(private readonly root = process.cwd()) {
    this.filePath = join(root, '.demo-data', 'runtime.json')
    this.volatile = process.env.NODE_ENV === 'test'
    this.database = this.loadOrSeed()
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
    const temporary = `${this.filePath}.tmp`
    writeFileSync(temporary, `${JSON.stringify(database, null, 2)}\n`, 'utf8')
    renameSync(temporary, this.filePath)
  }

  private table(name: string): DemoRow[] {
    return this.database.tables[name] ??= []
  }

  all(table: string): DemoRow[] {
    return this.table(table).map(row => ({ ...row }))
  }

  find(table: string, predicate: (row: DemoRow) => boolean): DemoRow | undefined {
    const row = this.table(table).find(predicate)
    return row ? { ...row } : undefined
  }

  insert(table: string, row: DemoRow): DemoRow {
    this.table(table).push({ ...row })
    this.persist()
    return { ...row }
  }

  update(table: string, predicate: (row: DemoRow) => boolean, changes: Partial<DemoRow>): DemoRow | undefined {
    const row = this.table(table).find(predicate)
    if (!row) return undefined
    Object.assign(row, changes)
    this.persist()
    return { ...row }
  }

  remove(table: string, predicate: (row: DemoRow) => boolean): number {
    const rows = this.table(table)
    const retained = rows.filter(row => !predicate(row))
    const removed = rows.length - retained.length
    if (removed) {
      this.database.tables[table] = retained
      this.persist()
    }
    return removed
  }

  snapshot(tableNames: readonly string[]): Record<string, DemoRow[]> {
    return Object.fromEntries(tableNames.map(name => [name, this.all(name)]))
  }

  reset(): void {
    this.database = createFromSeed(this.root)
    this.persist()
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __habDemoRepository: JsonDemoRepository | undefined
}

export function demoRepository(): JsonDemoRepository {
  return globalThis.__habDemoRepository ??= new JsonDemoRepository()
}
