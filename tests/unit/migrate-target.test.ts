// npm run db:migrate target rules (human request 2026-11-21): the same guard as storage:catalog-copies.
//   DEV dry run / apply: no flag needed (unchanged).
//   PROD dry run: only with CONFIRM_PROJECT_REF=<prod ref> (still ends in ROLLBACK).
//   PROD apply: needs --target-prod AND CONFIRM_PROJECT_REF=<prod ref>; either missing = refused.
//   --target-prod on a non-PROD project is refused. All checked before any connection.
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { dryRunTarget, migrationTarget, PROD_PROJECT_REF } from '../../scripts/db/migrate-plan.mjs'

const DEV = 'jfrpnffknjpgmkyquxql'
const url = (ref: string) => `postgresql://postgres.${ref}:test-only@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
const dev = { DATABASE_URL: url(DEV) }
const prod = { DATABASE_URL: url(PROD_PROJECT_REF) }
const confirmed = { ...prod, CONFIRM_PROJECT_REF: PROD_PROJECT_REF }

describe('migrationTarget: DEV', () => {
  it('dry run and apply on DEV need no flag', () => {
    expect(migrationTarget(dev, { dryRun: true })).toEqual({ projectRef: DEV, isProd: false })
    expect(migrationTarget(dev, { dryRun: false })).toEqual({ projectRef: DEV, isProd: false })
  })
  it('--target-prod on DEV is refused, even with the confirmation', () => {
    expect(() => migrationTarget({ ...dev, CONFIRM_PROJECT_REF: PROD_PROJECT_REF }, { dryRun: false, targetProd: true })).toThrow(/--target-prod/)
    expect(() => migrationTarget(dev, { dryRun: true, targetProd: true })).toThrow(/--target-prod/)
  })
  it('refuses a missing URL or a URL without a project ref', () => {
    expect(() => migrationTarget({}, { dryRun: true })).toThrow(/DATABASE_URL/)
    expect(() => migrationTarget({ DATABASE_URL: 'postgresql://u:p@localhost:5432/db' }, { dryRun: true })).toThrow(/project ref/)
  })
})

describe('migrationTarget: PROD dry run', () => {
  it('is refused without CONFIRM_PROJECT_REF, and with a wrong one', () => {
    expect(() => migrationTarget(prod, { dryRun: true })).toThrow(/PROD.*CONFIRM_PROJECT_REF/)
    expect(() => migrationTarget({ ...prod, CONFIRM_PROJECT_REF: DEV }, { dryRun: true })).toThrow(/CONFIRM_PROJECT_REF/)
  })
  it('is accepted with CONFIRM_PROJECT_REF, with or without --target-prod', () => {
    expect(migrationTarget(confirmed, { dryRun: true })).toEqual({ projectRef: PROD_PROJECT_REF, isProd: true })
    expect(migrationTarget(confirmed, { dryRun: true, targetProd: true })).toEqual({ projectRef: PROD_PROJECT_REF, isProd: true })
  })
  it('dryRunTarget keeps refusing PROD without the confirmation', () => {
    expect(() => dryRunTarget(prod)).toThrow(/PROD/)
    expect(dryRunTarget(dev)).toEqual({ projectRef: DEV })
  })
})

describe('migrationTarget: PROD apply', () => {
  it('needs both --target-prod and CONFIRM_PROJECT_REF', () => {
    expect(() => migrationTarget(prod, { dryRun: false })).toThrow(/PROD/)
    expect(() => migrationTarget(prod, { dryRun: false, targetProd: true })).toThrow(/CONFIRM_PROJECT_REF/)
    expect(() => migrationTarget(confirmed, { dryRun: false })).toThrow(/--target-prod/)
    expect(() => migrationTarget(confirmed, { dryRun: false, targetProd: false })).toThrow(/--target-prod/)
  })
  it('is accepted with both', () => {
    expect(migrationTarget(confirmed, { dryRun: false, targetProd: true })).toEqual({ projectRef: PROD_PROJECT_REF, isProd: true })
  })
})

describe('db:migrate command line refuses before connecting', () => {
  const cli = (args: string[], env: Record<string, string>) =>
    spawnSync(process.execPath, ['scripts/db/migrate.mjs', ...args], { cwd: process.cwd(), env: { PATH: process.env.PATH ?? '', ...env } as unknown as NodeJS.ProcessEnv, encoding: 'utf8', timeout: 20000 })
  it.each([
    ['apply, no flags', [], prod],
    ['apply, --target-prod without confirmation', ['--target-prod'], prod],
    ['apply, confirmation without --target-prod', [], confirmed],
    ['dry run, no confirmation', ['--dry-run'], prod],
    ['--target-prod on DEV', ['--target-prod'], dev],
  ])('%s', (_name, args, env) => {
    const result = cli(args as string[], env as Record<string, string>)
    expect(result.status).not.toBe(0)
    expect(result.stdout + result.stderr).not.toMatch(/Applied:|Already applied|rolled back; ledger unchanged|OK /)
    expect(result.stderr).toMatch(/PROD|--target-prod|CONFIRM_PROJECT_REF/)
  })
})
