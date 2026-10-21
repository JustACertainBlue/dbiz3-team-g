import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  const connectionString =
    process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

  if (
    !pool ||
    (process.env.TEST_DATABASE_URL &&
      (pool as any)._connString !== connectionString)
  ) {
    if (pool) {
      pool.end().catch(() => {});
    }
    pool = new Pool({
      connectionString,
    });
    (pool as any)._connString = connectionString;
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = any>(
  sql: string,
  params?: any[]
): Promise<pg.QueryResult<T>> {
  const currentPool = getPool();
  return currentPool.query<T>(sql, params);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
