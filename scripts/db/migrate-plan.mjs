// Pure helpers for scripts/db/migrate.mjs (no connection, no env loading on import).
import { readdirSync } from 'node:fs'

export const PROD_PROJECT_REF = 'euxclvszgiknjosbwjya'

/** Migration files (`<digits>_<name>.sql`) of a folder, in apply order. */
export function listMigrations(dir = 'supabase/migrations') {
  return readdirSync(dir).filter(name => /^\d+_.+\.sql$/.test(name)).sort()
}

/** Migrations not yet recorded in the ledger, keeping the apply order. */
export function pendingMigrations(names, applied) {
  const done = new Set(applied)
  return names.filter(name => !done.has(name))
}

function projectRef(value) {
  let url
  try { url = new URL(value) } catch { throw new Error('DATABASE_URL must be a PostgreSQL URI') }
  let user = ''
  try { user = decodeURIComponent(url.username) } catch { throw new Error('DATABASE_URL has an invalid user encoding') }
  const fromUser = user.includes('.') ? user.slice(user.indexOf('.') + 1) : null
  const fromHost = url.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i)?.[1] ?? null
  if (fromUser && fromHost && fromUser !== fromHost) throw new Error('DATABASE_URL names two different project refs (user and host)')
  return fromUser ?? fromHost
}

/**
 * Target check for `--dry-run`, before any connection: the migration URL must name a Supabase project ref and it
 * must not be PROD. Only the ref is returned; the URL is never printed.
 */
export function dryRunTarget(env) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured')
  const ref = projectRef(env.DATABASE_URL)
  if (!ref) throw new Error('DATABASE_URL does not name a Supabase project ref; dry run refused')
  if (ref === PROD_PROJECT_REF) throw new Error('Refusing to run against PROD, even with --dry-run')
  return { projectRef: ref }
}
