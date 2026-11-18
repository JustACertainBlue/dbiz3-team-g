// `npm run db:migrate -- --dry-run` (human decision 2026-11-18): every pending migration runs in one transaction, in
// order, then ROLLBACK; the ledger is not written; PROD (euxclvszgiknjosbwjya) is refused even with --dry-run.
import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { dryRunTarget, listMigrations, pendingMigrations, PROD_PROJECT_REF } from '../../scripts/db/migrate-plan.mjs'

const MIGRATION = (ref: string) => `postgresql://postgres.${ref}:test-only@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
const DIRECT = (ref: string) => `postgresql://postgres:test-only@db.${ref}.supabase.co:5432/postgres`

describe('listMigrations / pendingMigrations', () => {
  it('lists only NNN_name.sql files, sorted by name', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hab-mig-'))
    for (const name of ['20261118120000_b.sql', '20261107041151_a.sql', 'README.md', 'x.sql', '20261118101709_c.sql']) writeFileSync(join(dir, name), '')
    expect(listMigrations(dir)).toEqual(['20261107041151_a.sql', '20261118101709_c.sql', '20261118120000_b.sql'])
  })
  it('keeps the migrations not in the ledger, in order', () => {
    expect(pendingMigrations(['1_a.sql', '2_b.sql', '3_c.sql'], ['2_b.sql'])).toEqual(['1_a.sql', '3_c.sql'])
    expect(pendingMigrations(['1_a.sql'], ['1_a.sql'])).toEqual([])
  })
})

describe('dryRunTarget', () => {
  it('refuses PROD, with the pooler or the direct URL', () => {
    expect(PROD_PROJECT_REF).toBe('euxclvszgiknjosbwjya')
    expect(() => dryRunTarget({ DATABASE_URL: MIGRATION(PROD_PROJECT_REF) })).toThrow(/PROD/)
    expect(() => dryRunTarget({ DATABASE_URL: DIRECT(PROD_PROJECT_REF) })).toThrow(/PROD/)
  })
  it('refuses a missing URL or an unknown project ref', () => {
    expect(() => dryRunTarget({})).toThrow(/DATABASE_URL/)
    expect(() => dryRunTarget({ DATABASE_URL: 'postgresql://u:p@localhost:5432/db' })).toThrow(/project ref/)
  })
  it('returns the DEV ref', () => {
    expect(dryRunTarget({ DATABASE_URL: MIGRATION('jfrpnffknjpgmkyquxql') })).toEqual({ projectRef: 'jfrpnffknjpgmkyquxql' })
  })
})
