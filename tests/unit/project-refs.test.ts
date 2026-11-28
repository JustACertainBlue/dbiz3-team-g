// PROD moved to a new Supabase project (human decision 2026-11-28, docs/build/prod-migrate-supabase.md §1.1):
//  - scripts/db/project-refs.mjs is the only place a project ref is written;
//  - the old PROD ref is RETIRED: every guard refuses it before any other comparison, with or without flags;
//  - the new PROD ref needs --target-prod + CONFIRM_PROJECT_REF (same rules as the old PROD ref had).
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { DEV_PROJECT_REF, PROD_PROJECT_REF, RETIRED_PROJECT_REFS, assertNoRetiredRef } from '../../scripts/db/project-refs.mjs'
import { migrationTarget } from '../../scripts/db/migrate-plan.mjs'
import { assertTargets } from '../../scripts/storage/refresh-catalog-copies.mjs'
import { assertImportTarget } from '../../scripts/storage/seed-image-import-plan.mjs'
import { assertDevTarget } from '../../scripts/db/dev-load-content.mjs'
import { assertTarget as assertContentTarget } from '../../scripts/db/prod-content-load.mjs'
import { lecturerPreflight } from '../../scripts/db/lecturer-accounts.mjs'
import { databaseConfig } from '../../scripts/db/config.mjs'
import { storageConfig } from '../../scripts/storage/client.mjs'

const OLD = 'euxclvszgiknjosbwjya'
const NEW = 'pdeioligjeksgfnodgzs'
const pooler = (ref: string, user = 'postgres') => `postgresql://${user}.${ref}:test-only@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
const direct = (ref: string) => `postgresql://postgres:test-only@db.${ref}.supabase.co:5432/postgres`
const both = (ref: string, extra: Record<string, string> = {}) => ({ DATABASE_URL: pooler(ref), SUPABASE_URL: `https://${ref}.supabase.co`, ...extra })

describe('project-refs: one place, three lists', () => {
  it('holds DEV, the new PROD and the retired old PROD', () => {
    expect(DEV_PROJECT_REF).toBe('jfrpnffknjpgmkyquxql')
    expect(PROD_PROJECT_REF).toBe(NEW)
    expect(RETIRED_PROJECT_REFS).toEqual([OLD])
    expect(RETIRED_PROJECT_REFS).not.toContain(PROD_PROJECT_REF)
    expect(RETIRED_PROJECT_REFS).not.toContain(DEV_PROJECT_REF)
  })
  it('assertNoRetiredRef refuses the old ref in a pooler URL, a direct URL and a Supabase URL, and passes the others', () => {
    for (const value of [pooler(OLD), pooler(OLD, 'hab_app'), direct(OLD), `https://${OLD}.supabase.co`]) {
      expect(() => assertNoRetiredRef('X', value)).toThrow(/retired.*Nothing was changed/)
    }
    for (const value of [pooler(NEW), direct(NEW), `https://${NEW}.supabase.co`, pooler(DEV_PROJECT_REF), undefined, '']) {
      expect(() => assertNoRetiredRef('X', value)).not.toThrow()
    }
  })
  it('does not print the credential part of the URL in its message', () => {
    try { assertNoRetiredRef('DATABASE_URL', pooler(OLD)) } catch (error) { expect(String(error)).not.toContain('test-only') }
  })
})

describe('db:migrate guard (migrationTarget)', () => {
  it.each([
    ['no flags', {}],
    ['dry run', { dryRun: true }],
    ['--target-prod', { targetProd: true }],
    ['dry run + --target-prod', { dryRun: true, targetProd: true }],
  ])('refuses the retired ref: %s, with or without the old confirmation', (_name, options) => {
    for (const env of [{ DATABASE_URL: pooler(OLD) }, { DATABASE_URL: direct(OLD) }, { DATABASE_URL: pooler(OLD), CONFIRM_PROJECT_REF: OLD }, { DATABASE_URL: pooler(OLD), CONFIRM_PROJECT_REF: NEW }]) {
      expect(() => migrationTarget(env, options)).toThrow(/retired/)
    }
  })
  it('the new PROD ref needs CONFIRM_PROJECT_REF, and --target-prod to apply', () => {
    const env = { DATABASE_URL: pooler(NEW) }
    expect(() => migrationTarget(env, { dryRun: true })).toThrow(/CONFIRM_PROJECT_REF/)
    expect(() => migrationTarget(env, { dryRun: false, targetProd: true })).toThrow(/CONFIRM_PROJECT_REF/)
    expect(() => migrationTarget({ ...env, CONFIRM_PROJECT_REF: NEW }, { dryRun: false })).toThrow(/--target-prod/)
    expect(() => migrationTarget({ ...env, CONFIRM_PROJECT_REF: OLD }, { dryRun: true })).toThrow(/CONFIRM_PROJECT_REF/)
    expect(migrationTarget({ ...env, CONFIRM_PROJECT_REF: NEW }, { dryRun: true })).toEqual({ projectRef: NEW, isProd: true })
    expect(migrationTarget({ ...env, CONFIRM_PROJECT_REF: NEW }, { dryRun: false, targetProd: true })).toEqual({ projectRef: NEW, isProd: true })
  })
  it('refuses the retired ref on the command line before connecting, whatever the flags', () => {
    const cleaned = { ...process.env } as Record<string, string | undefined>
    for (const name of ['DATABASE_URL', 'DATABASE_APP_URL', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'CONFIRM_PROJECT_REF', 'DATABASE_SSL_CA_FILE']) delete cleaned[name]
    for (const args of [[], ['--dry-run'], ['--target-prod']]) {
      const result = spawnSync(process.execPath, ['scripts/db/migrate.mjs', ...args], { cwd: process.cwd(), env: { ...cleaned, DATABASE_URL: pooler(OLD), CONFIRM_PROJECT_REF: OLD } as unknown as NodeJS.ProcessEnv, encoding: 'utf8', timeout: 20000 })
      expect(result.status).not.toBe(0)
      expect(result.stdout + result.stderr).not.toMatch(/Applied:|Already applied|rolled back; ledger unchanged|OK /)
      expect(result.stderr).toMatch(/retired/)
    }
  })
})

describe('storage guards (assertTargets, seed images)', () => {
  it('refuse the retired ref in DATABASE_URL or SUPABASE_URL, DEV mode and PROD mode, even confirmed', () => {
    for (const targetProd of [false, true]) {
      for (const env of [both(OLD), { ...both(OLD), CONFIRM_PROJECT_REF: OLD }, { ...both(NEW), SUPABASE_URL: `https://${OLD}.supabase.co`, CONFIRM_PROJECT_REF: NEW }, { ...both(NEW), DATABASE_URL: pooler(OLD), CONFIRM_PROJECT_REF: NEW }]) {
        expect(() => assertTargets(env, { targetProd })).toThrow(/retired/)
        expect(() => assertImportTarget(env)).toThrow(/retired/)
      }
    }
  })
  it('the new PROD ref needs --target-prod and CONFIRM_PROJECT_REF', () => {
    expect(() => assertTargets(both(NEW), { targetProd: false })).toThrow(/not the DEV project/)
    expect(() => assertTargets(both(NEW), { targetProd: true })).toThrow(/CONFIRM_PROJECT_REF/)
    expect(() => assertTargets({ ...both(NEW), CONFIRM_PROJECT_REF: OLD }, { targetProd: true })).toThrow(/CONFIRM_PROJECT_REF|retired/)
    expect(assertTargets({ ...both(NEW), CONFIRM_PROJECT_REF: NEW }, { targetProd: true })).toBe(NEW)
  })
})

describe('content loaders', () => {
  it('the DEV loader refuses the retired ref and the new PROD ref', () => {
    expect(() => assertDevTarget({ DATABASE_URL: pooler(OLD) })).toThrow(/retired/)
    expect(() => assertDevTarget({ DATABASE_URL: pooler(NEW) })).toThrow(/PROD/)
    expect(assertDevTarget({ DATABASE_URL: pooler(DEV_PROJECT_REF) })).toBe(DEV_PROJECT_REF)
  })
  it('db:content-load refuses the retired ref and needs the confirmation for the new PROD ref', () => {
    expect(() => assertContentTarget({ DATABASE_URL: pooler(OLD) }, { targetProd: false })).toThrow(/retired/)
    expect(() => assertContentTarget({ DATABASE_URL: pooler(OLD), CONFIRM_PROJECT_REF: OLD }, { targetProd: true })).toThrow(/retired/)
    expect(() => assertContentTarget({ DATABASE_URL: pooler(NEW) }, { targetProd: true })).toThrow(/CONFIRM_PROJECT_REF/)
    expect(assertContentTarget({ DATABASE_URL: pooler(NEW), CONFIRM_PROJECT_REF: NEW }, { targetProd: true })).toBe(NEW)
  })
})

describe('connection builders and lecturer run never reach the retired project', () => {
  it('databaseConfig refuses it for both purposes', () => {
    expect(() => databaseConfig({ DATABASE_APP_URL: pooler(OLD, 'hab_app') }, 'application')).toThrow(/retired/)
    expect(() => databaseConfig({ DATABASE_URL: pooler(OLD) }, 'migration')).toThrow(/retired/)
    expect(() => databaseConfig({ DATABASE_URL: direct(OLD) }, 'migration')).toThrow(/retired/)
  })
  it('databaseConfig still accepts the new project', () => {
    expect(databaseConfig({ DATABASE_APP_URL: pooler(NEW, 'hab_app') }, 'application')).toMatchObject({ user: `hab_app.${NEW}` })
  })
  it('storageConfig refuses the retired project URL and accepts the new one', () => {
    expect(() => storageConfig({ SUPABASE_URL: `https://${OLD}.supabase.co`, SUPABASE_SECRET_KEY: 'synthetic' })).toThrow(/retired/)
    expect(storageConfig({ SUPABASE_URL: `https://${NEW}.supabase.co`, SUPABASE_SECRET_KEY: 'synthetic' }).url).toBe(`https://${NEW}.supabase.co`)
  })
  it('lecturerPreflight refuses the retired ref even when HAB_EXPECT_PROJECT_REF names it', () => {
    expect(() => lecturerPreflight({ HAB_EXPECT_PROJECT_REF: OLD, DATABASE_APP_URL: pooler(OLD, 'hab_app'), HAB_LECTURER_VILLAGE: 'x' })).toThrow(/retired/)
    expect(lecturerPreflight({ HAB_EXPECT_PROJECT_REF: NEW, DATABASE_APP_URL: pooler(NEW, 'hab_app'), HAB_LECTURER_VILLAGE: 'x' })).toMatchObject({ projectRef: NEW })
  })
})
