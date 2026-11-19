/**
 * Human request 2026-11-19: PROD has 45 non-seed copies of the old catalog photos. storage:catalog-copies may now run on PROD,
 * but only with --target-prod AND CONFIRM_PROJECT_REF equal to the PROD ref that both DATABASE_URL and SUPABASE_URL name;
 * anything missing or different stops before any connection. DEV stays the default. Dry run by default; the undo folder
 * (old bytes + values) always goes under .demo-data/ in the folder the command runs from.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { DEV_PROJECT_REF, PROD_PROJECT_REF, assertTargets, parseArgs, resolveNotesDir, run } from '../../scripts/storage/refresh-catalog-copies.mjs'

const env = (ref: string, storageRef = ref) => ({
  DATABASE_URL: `postgresql://postgres.${ref}:x@aws-0.pooler.supabase.com:5432/postgres`, SUPABASE_URL: `https://${storageRef}.supabase.co`,
})
const prod = { ...env(PROD_PROJECT_REF), CONFIRM_PROJECT_REF: PROD_PROJECT_REF }

describe('storage:catalog-copies PROD guard', () => {
  it('keeps DEV the default: PROD without --target-prod is refused', () => {
    expect(assertTargets(env(DEV_PROJECT_REF), { targetProd: false })).toBe(DEV_PROJECT_REF)
    expect(() => assertTargets(prod, { targetProd: false })).toThrow(/not the DEV project.*Nothing was changed/)
  })
  it('refuses --target-prod without CONFIRM_PROJECT_REF', () => {
    expect(() => assertTargets(env(PROD_PROJECT_REF), { targetProd: true })).toThrow(/CONFIRM_PROJECT_REF.*Nothing was changed/)
  })
  it('refuses --target-prod when CONFIRM_PROJECT_REF is not the PROD ref', () => {
    expect(() => assertTargets({ ...env(PROD_PROJECT_REF), CONFIRM_PROJECT_REF: DEV_PROJECT_REF }, { targetProd: true })).toThrow(/CONFIRM_PROJECT_REF/)
    expect(() => assertTargets({ ...env(PROD_PROJECT_REF), CONFIRM_PROJECT_REF: ` ${PROD_PROJECT_REF}` }, { targetProd: true })).toThrow(/CONFIRM_PROJECT_REF/)
  })
  it('refuses --target-prod when the database or Storage is not the confirmed PROD project', () => {
    expect(() => assertTargets({ ...env(DEV_PROJECT_REF), CONFIRM_PROJECT_REF: PROD_PROJECT_REF }, { targetProd: true })).toThrow(/DATABASE_URL/)
    expect(() => assertTargets({ ...env(PROD_PROJECT_REF, DEV_PROJECT_REF), CONFIRM_PROJECT_REF: PROD_PROJECT_REF }, { targetProd: true })).toThrow(/SUPABASE_URL/)
  })
  it('accepts --target-prod with the matching confirmation', () => {
    expect(assertTargets(prod, { targetProd: true })).toBe(PROD_PROJECT_REF)
  })
  it('parses --target-prod and stays a dry run without --apply', () => {
    expect(parseArgs(['--target-prod'])).toMatchObject({ targetProd: true, apply: false })
    expect(parseArgs(['--target-prod', '--apply'])).toMatchObject({ targetProd: true, apply: true })
    expect(parseArgs([])).toMatchObject({ targetProd: false, apply: false })
  })
  it('keeps the undo folder under .demo-data/ of the folder the command runs from', () => {
    const cwd = '/work/dbiz3-prod'
    expect(resolveNotesDir(cwd, undefined)).toBe('/work/dbiz3-prod/.demo-data/catalog-copies')
    expect(resolveNotesDir(cwd, '.demo-data/prod-photos')).toBe('/work/dbiz3-prod/.demo-data/prod-photos')
    expect(() => resolveNotesDir(cwd, '/tmp/elsewhere')).toThrow(/\.demo-data.*Nothing was changed/)
    expect(() => resolveNotesDir(cwd, '.demo-data/../src')).toThrow(/\.demo-data/)
  })
  it('a PROD dry run reads only: no object, row or undo folder is written', async () => {
    const OLD = Buffer.from('old ceramics bytes'), NEW = Buffer.from('new ceramics photo')
    const id = '00000000-0000-4000-8000-0000000000aa', writes: string[] = []
    const client = { async query(sql: string) {
      if (/^UPDATE/.test(sql)) writes.push('db')
      return /^SELECT/.test(sql) ? { rows: [{ file_id: id, storage_key: `prf-media/${id}`, media_type: 'image/jpeg', file_size_bytes: OLD.length, width_px: 1280, height_px: 857 }], rowCount: 1 } : { rows: [], rowCount: 0 }
    } }
    const storage = { async read() { return OLD }, async write() { writes.push('storage') } }
    const notesDir = join(mkdtempSync(join(tmpdir(), 'prod-dry-')), 'catalog-copies')
    const report = await run({ apply: false }, { client, storage, notesDir, projectRef: PROD_PROJECT_REF, seedIds: [],
      oldPhotos: { ceramics: { bytes: OLD.length, sha256: createHash('sha256').update(OLD).digest('hex') } },
      newPhotos: new Map([['ceramics', { slug: 'ceramics', bytes: NEW.length, width: 1280, height: 960, data: NEW }]]) })
    expect(report.toReplace).toEqual([{ file_id: id, slug: 'ceramics' }])
    expect(writes).toEqual([])
    expect(existsSync(notesDir)).toBe(false)
  })
  it('undo refuses a file made on another project than the one connected', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'undo-ref-')), file = join(dir, 'undo.json')
    const { writeFileSync } = await import('node:fs')
    writeFileSync(file, JSON.stringify({ kind: 'hab-catalog-copies-undo', version: 1, projectRef: DEV_PROJECT_REF, createdAt: '2026-11-19T00:00:00Z', files: [] }))
    const deps = { client: { query: async () => ({ rows: [], rowCount: 0 }) }, storage: { read: async () => null, write: async () => {} }, newPhotos: new Map(), seedIds: [], notesDir: dir }
    await expect(run({ apply: false, undo: file }, { ...deps, projectRef: PROD_PROJECT_REF })).rejects.toThrow(/not made on this project/)
    expect(await run({ apply: false, undo: file }, { ...deps, projectRef: DEV_PROJECT_REF })).toMatchObject({ restorable: 0, conflicts: [] })
    expect(readdirSync(dir)).toEqual(['undo.json'])
  })
})
