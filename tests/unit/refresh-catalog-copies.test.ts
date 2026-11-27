/**
 * Human request 2026-11-19 (runbook-replace-photos step 2): DEV has stored_files rows outside the seed whose objects are byte
 * copies of the six replaced CC BY-SA catalog photos. scripts/storage/refresh-catalog-copies.mjs (DEV only, dry run by
 * default) finds them by size + SHA-256 of the old photo, overwrites each object with the new photo of the same slug, updates
 * file_size_bytes / width_px / height_px, and first saves the old bytes and values so --undo can restore them.
 */
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it } from 'vitest'
import { DEV_PROJECT_REF, OLD_CATALOG_PHOTOS, assertDevTargets, parseArgs, run } from '../../scripts/storage/refresh-catalog-copies.mjs'

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const OLD = Buffer.from('old ceramics bytes'), NEW = Buffer.from('new ceramics photo'), OTHER = Buffer.from('someone else upload')
const oldPhotos = { ceramics: { bytes: OLD.length, sha256: sha(OLD) } }
const newPhotos = new Map([['ceramics', { slug: 'ceramics', bytes: NEW.length, width: 1280, height: 960, data: NEW }]])
const devEnv = { DATABASE_URL: `postgresql://postgres.${DEV_PROJECT_REF}:x@aws-0.pooler.supabase.com:5432/postgres`, SUPABASE_URL: `https://${DEV_PROJECT_REF}.supabase.co` }

type Row = { file_id: string; storage_key: string; media_type: string; file_size_bytes: number; width_px: number; height_px: number }
function fakes(rows: Row[], objects: Record<string, Buffer>) {
  const db = new Map(rows.map(row => [row.file_id, { ...row }])), store = new Map(Object.entries(objects)), log: string[] = []
  const client = {
    async query(sql: string, values: unknown[] = []) {
      if (/^SELECT/.test(sql)) return { rows: [...db.values()].filter(row => (values[0] as number[]).includes(row.file_size_bytes)), rowCount: 0 }
      if (/^UPDATE public\.stored_files/.test(sql)) {
        const [bytes, width, height, id, fromBytes] = values as [number, number, number, string, number]
        const row = db.get(id); if (!row || row.file_size_bytes !== fromBytes) return { rowCount: 0, rows: [] }
        Object.assign(row, { file_size_bytes: bytes, width_px: width, height_px: height }); log.push(`db ${id}`); return { rowCount: 1, rows: [] }
      }
      return { rows: [], rowCount: 0 }
    },
  }
  const storage = {
    async read(key: string) { return store.get(key) ?? null },
    async write(key: string, bytes: Buffer) { log.push(`write ${key}`); store.set(key, Buffer.from(bytes)) },
  }
  return { client, storage, db, store, log }
}
const row = (id: string, size = OLD.length): Row => ({ file_id: id, storage_key: `prf-media/${id}`, media_type: 'image/jpeg', file_size_bytes: size, width_px: 1280, height_px: 857 })
const A = '00000000-0000-4000-8000-00000000000a', B = '00000000-0000-4000-8000-00000000000b', C = '00000000-0000-4000-8000-00000000000c'
const deps = (f: ReturnType<typeof fakes>, notesDir: string) => ({ client: f.client, storage: f.storage, oldPhotos, newPhotos, seedIds: [C], notesDir, now: new Date('2026-11-19T12:00:00Z'), projectRef: DEV_PROJECT_REF })

describe('refresh catalog copies (DEV only)', () => {
  it('knows the six replaced photos by size and SHA-256 of the old file', () => {
    expect(Object.keys(OLD_CATALOG_PHOTOS).sort()).toEqual(['bamboo', 'ceramics', 'conical-hats', 'silk', 'water-puppets', 'wood-carving'])
    expect(OLD_CATALOG_PHOTOS.ceramics).toEqual({ bytes: 229731, sha256: 'c32806ee9e6bbc0b079e394c0fe8ffc78862b8454fe1458b11d239655499e746' })
  })
  it('refuses any target that is not the DEV project, before connecting', () => {
    expect(assertDevTargets(devEnv)).toBe(DEV_PROJECT_REF)
    expect(() => assertDevTargets({ ...devEnv, SUPABASE_URL: 'https://pdeioligjeksgfnodgzs.supabase.co' })).toThrow(/not the DEV project.*Nothing was changed/)
    expect(() => assertDevTargets({ ...devEnv, DATABASE_URL: devEnv.DATABASE_URL.replace(DEV_PROJECT_REF, 'pdeioligjeksgfnodgzs') })).toThrow(/not the DEV project/)
    expect(() => assertDevTargets({ SUPABASE_URL: devEnv.SUPABASE_URL })).toThrow(/not configured/)
  })
  it('is a dry run unless --apply is given', () => {
    expect(parseArgs([])).toMatchObject({ apply: false })
    expect(parseArgs(['--apply'])).toMatchObject({ apply: true })
    expect(parseArgs(['--undo', 'x.json'])).toMatchObject({ apply: true, undo: 'x.json' })
    expect(parseArgs(['--undo', 'x.json', '--dry-run'])).toMatchObject({ apply: false, undo: 'x.json' })
    expect(() => parseArgs(['--apply', '--dry-run'])).toThrow(/Nothing was changed/)
  })
  it('dry run classifies copies and writes nothing', async () => {
    const f = fakes([row(A), row(B), row(C)], { [`prf-media/${A}`]: OLD, [`prf-media/${B}`]: Buffer.from('OLD CERAMICS BYTES'), [`prf-media/${C}`]: OLD })
    const report = await run({ apply: false }, deps(f, mkdtempSync(join(tmpdir(), 'copies-'))))
    expect(report.toReplace).toEqual([{ file_id: A, slug: 'ceramics' }])
    expect(report.skipped).toEqual([{ file_id: B, reason: 'bytes differ from the old photo' }])
    expect(f.log).toEqual([])
  })
  it('apply saves old bytes and values first, then replaces the object and its metadata', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'copies-'))
    const f = fakes([row(A)], { [`prf-media/${A}`]: OLD })
    const report = await run({ apply: true }, deps(f, dir))
    expect(report.replaced).toBe(1)
    expect(f.store.get(`prf-media/${A}`)).toEqual(NEW)
    expect(f.db.get(A)).toMatchObject({ file_size_bytes: NEW.length, width_px: 1280, height_px: 960 })
    const [backup] = readdirSync(dir); const undo = JSON.parse(readFileSync(join(dir, backup, 'undo.json'), 'utf8'))
    expect(undo.files).toEqual([expect.objectContaining({ file_id: A, slug: 'ceramics', from: { bytes: OLD.length, width: 1280, height: 857, sha256: sha(OLD) }, to: expect.objectContaining({ sha256: sha(NEW) }) })])
    expect(readFileSync(join(dir, backup, `${A}.jpg`))).toEqual(OLD)
  })
  it('undo restores the old bytes and values of rows that still hold the new photo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'copies-'))
    const f = fakes([row(A)], { [`prf-media/${A}`]: OLD })
    await run({ apply: true }, deps(f, dir))
    const undoFile = join(dir, readdirSync(dir)[0], 'undo.json')
    const preview = await run({ apply: false, undo: undoFile }, deps(f, dir))
    expect(preview).toMatchObject({ restorable: 1, conflicts: [] })
    await run({ apply: true, undo: undoFile }, deps(f, dir))
    expect(f.store.get(`prf-media/${A}`)).toEqual(OLD)
    expect(f.db.get(A)).toMatchObject({ file_size_bytes: OLD.length, width_px: 1280, height_px: 857 })
  })
  it('undo refuses when a row no longer holds the new photo', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'copies-'))
    const f = fakes([row(A)], { [`prf-media/${A}`]: OLD })
    await run({ apply: true }, deps(f, dir))
    f.store.set(`prf-media/${A}`, OTHER)
    await expect(run({ apply: true, undo: join(dir, readdirSync(dir)[0], 'undo.json') }, deps(f, dir))).rejects.toThrow(/Nothing was changed/)
    expect(f.store.get(`prf-media/${A}`)).toEqual(OTHER)
  })
})
