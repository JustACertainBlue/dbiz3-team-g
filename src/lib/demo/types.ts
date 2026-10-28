export type DemoRow = Record<string, string>

export interface DemoDatabase {
  meta: {
    format: 'hab-demo-json-v1'
    seeded_at: string
    source: 'data/seed/*.csv'
  }
  tables: Record<string, DemoRow[]>
}

export interface DemoRepository {
  all(table: string): DemoRow[]
  find(table: string, predicate: (row: DemoRow) => boolean): DemoRow | undefined
  insert(table: string, row: DemoRow): DemoRow
  update(table: string, predicate: (row: DemoRow) => boolean, changes: Partial<DemoRow>): DemoRow | undefined
  remove(table: string, predicate: (row: DemoRow) => boolean): number
  snapshot(tableNames: readonly string[]): Record<string, DemoRow[]>
  reset(): void
}
