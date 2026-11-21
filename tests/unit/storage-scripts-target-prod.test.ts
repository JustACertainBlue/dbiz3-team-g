// storage:seed-images and storage:media-variants get the same PROD guard as storage:catalog-copies (human request 2026-11-21):
// DEV by default; --target-prod needs CONFIRM_PROJECT_REF=<prod ref> typed in the shell and DATABASE_URL + SUPABASE_URL both
// naming PROD; checked before any connection. Dry run stays the default and undo files stay bound to the project they came from.
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { DEV_PROJECT_REF, PROD_PROJECT_REF } from '../../scripts/storage/seed-image-import-plan.mjs'
import { assertImportTarget, parseArgs as parseSeed } from '../../scripts/storage/import-seed-images.mjs'
import { parseArgs as parseVariants } from '../../scripts/storage/backfill-media-variants.mjs'

const db = (ref: string) => `postgresql://postgres.${ref}:test-only@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
const storage = (ref: string) => `https://${ref}.supabase.co`
const envFor = (ref: string, extra: Record<string, string> = {}) => ({ DATABASE_URL: db(ref), SUPABASE_URL: storage(ref), ...extra })
const prod = envFor(PROD_PROJECT_REF, { CONFIRM_PROJECT_REF: PROD_PROJECT_REF })

describe('assertImportTarget (seed images)', () => {
  it('stays DEV by default and refuses PROD without --target-prod', () => {
    expect(assertImportTarget(envFor(DEV_PROJECT_REF))).toBe(DEV_PROJECT_REF)
    expect(() => assertImportTarget(prod)).toThrow(/not the DEV project/)
  })
  it('--target-prod needs the confirmation and PROD for both the database and Storage', () => {
    expect(assertImportTarget(prod, { targetProd: true })).toBe(PROD_PROJECT_REF)
    expect(() => assertImportTarget({ ...prod, CONFIRM_PROJECT_REF: undefined }, { targetProd: true })).toThrow(/CONFIRM_PROJECT_REF/)
    expect(() => assertImportTarget({ ...prod, SUPABASE_URL: storage(DEV_PROJECT_REF) }, { targetProd: true })).toThrow(/SUPABASE_URL/)
    expect(() => assertImportTarget({ ...envFor(DEV_PROJECT_REF), CONFIRM_PROJECT_REF: PROD_PROJECT_REF }, { targetProd: true })).toThrow(/confirmed PROD/)
  })
})

describe('parseArgs accepts --target-prod and stays a dry run', () => {
  it('seed images', () => {
    expect(parseSeed(['--json', 'a.json', '--photos-dir', 'p', '--target-prod'])).toMatchObject({ targetProd: true, apply: false })
    expect(parseSeed(['--json', 'a.json', '--photos-dir', 'p'])).toMatchObject({ targetProd: false, apply: false })
    expect(parseSeed(['--undo', 'u.json', '--target-prod', '--dry-run'])).toMatchObject({ targetProd: true, apply: false, undo: 'u.json' })
  })
  it('media variants', () => {
    expect(parseVariants(['--target-prod'])).toMatchObject({ targetProd: true, apply: false })
    expect(parseVariants([])).toMatchObject({ targetProd: false, apply: false })
    expect(parseVariants(['--target-prod', '--apply'])).toMatchObject({ targetProd: true, apply: true })
  })
})

describe('command lines refuse before connecting', () => {
  const cli = (script: string, args: string[], env: Record<string, string>) =>
    spawnSync(process.execPath, [script, ...args], { cwd: process.cwd(), env: { PATH: process.env.PATH ?? '', ...env } as unknown as NodeJS.ProcessEnv, encoding: 'utf8', timeout: 20000 })
  const seedArgs = ['--json', 'missing.json', '--photos-dir', 'missing']
  const cases: Array<[string, string[], Record<string, string>, string]> = [
    ['scripts/storage/import-seed-images.mjs', seedArgs, prod, 'PROD env without --target-prod'],
    ['scripts/storage/import-seed-images.mjs', [...seedArgs, '--target-prod'], { ...prod, CONFIRM_PROJECT_REF: '' }, '--target-prod without confirmation'],
    ['scripts/storage/import-seed-images.mjs', [...seedArgs, '--target-prod'], envFor(DEV_PROJECT_REF, { CONFIRM_PROJECT_REF: PROD_PROJECT_REF }), '--target-prod on DEV env'],
    ['scripts/storage/backfill-media-variants.mjs', [], prod, 'PROD env without --target-prod'],
    ['scripts/storage/backfill-media-variants.mjs', ['--target-prod'], { ...prod, CONFIRM_PROJECT_REF: '' }, '--target-prod without confirmation'],
    ['scripts/storage/backfill-media-variants.mjs', ['--target-prod', '--apply'], envFor(DEV_PROJECT_REF, { CONFIRM_PROJECT_REF: PROD_PROJECT_REF }), '--target-prod --apply on DEV env'],
  ]
  it.each(cases)('%s %j (%s)', (script, args, env) => {
    const result = cli(script, args, env)
    expect(result.status).not.toBe(0)
    expect(result.stderr).toMatch(/not the (DEV|confirmed PROD) project|CONFIRM_PROJECT_REF/)
    expect(result.stdout).not.toMatch(/"mode"/) // the mode line is printed only after the target check passed
  })
})
