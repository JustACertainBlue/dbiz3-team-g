/**
 * Database client abstraction.
 * Stub — implementation belongs to code tasks (T005+).
 * Tests import this file so it must exist.
 */

export type DbClient = {
  query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>
  close: () => Promise<void>
}

/**
 * Returns a database client.
 * Placeholder — not yet implemented.
 */
export function getDbClient(): DbClient {
  throw new Error('DB client not implemented yet (T005 code task)')
}
