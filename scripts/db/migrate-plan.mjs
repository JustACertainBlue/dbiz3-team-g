// Pure helpers for scripts/db/migrate.mjs (no connection, no env loading on import).
import { readdirSync } from 'node:fs'

import { PROD_PROJECT_REF, assertNoRetiredRef } from './project-refs.mjs'

export { PROD_PROJECT_REF }

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
 * Target check, before any connection (human request 2026-11-21, same pattern as storage:catalog-copies). Only the ref is
 * returned; the URL is never printed.
 *  - DEV or any other non-PROD project: dry run and apply need no flag; --target-prod is refused there.
 *  - PROD dry run: only with CONFIRM_PROJECT_REF equal to the PROD ref (it still ends in ROLLBACK).
 *  - PROD apply: --target-prod AND CONFIRM_PROJECT_REF equal to the PROD ref.
 * `env.CONFIRM_PROJECT_REF` must come from the shell, not from a .env file (migrate.mjs captures it before loading .env).
 */
export function migrationTarget(env, { dryRun = false, targetProd = false } = {}) {
  if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not configured')
  assertNoRetiredRef('DATABASE_URL', env.DATABASE_URL) // first: a retired project is refused with or without any flag
  const ref = projectRef(env.DATABASE_URL)
  if (!ref) throw new Error('DATABASE_URL does not name a Supabase project ref; refused')
  const isProd = ref === PROD_PROJECT_REF
  if (targetProd && !isProd) throw new Error('--target-prod is only for the PROD project; DATABASE_URL names another project')
  if (isProd) {
    if (env.CONFIRM_PROJECT_REF !== PROD_PROJECT_REF) throw new Error(`Refusing to run against PROD without CONFIRM_PROJECT_REF=${PROD_PROJECT_REF} (missing or different)${dryRun ? ', even with --dry-run' : ''}`)
    if (!dryRun && !targetProd) throw new Error('Refusing to apply migrations to PROD without --target-prod')
  }
  return { projectRef: ref, isProd }
}

/** Target check for `--dry-run` (kept for callers and tests): PROD is refused unless CONFIRM_PROJECT_REF names it. */
export const dryRunTarget = env => {
  const { projectRef: ref } = migrationTarget(env, { dryRun: true })
  return { projectRef: ref }
}
