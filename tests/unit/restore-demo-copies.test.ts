/**
 * storage:restore-demo-copies (human request 2026-11-28): the gallery rows that storage:catalog-copies pointed at a photo of
 * assets/demo-media (their size and dimensions equal that photo) get their object back, byte for byte, under the existing key.
 * Never writes to the database, never replaces an object, never re-encodes.
 */
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import { DEV_PROJECT_REF, PROD_PROJECT_REF, RETIRED_PROJECT_REFS } from '../../scripts/db/project-refs.mjs'
import { assertDemoCopiesTarget, parseArgs, restoreDemoCopies, undoDemoCopies } from '../../scripts/storage/restore-demo-copies.mjs'

const fid = (n: number) => `d0000000-0000-5000-8000-${String(n).padStart(12, '0')}`
let mediaDir: string
let silk: Buffer, clay: Buffer

beforeAll(async () => {
  mediaDir = mkdtempSync(join(tmpdir(), 'demo-media-'))
  silk = await sharp({ create: { width: 1280, height: 960, channels: 3, background: { r: 200, g: 20, b: 20 } } }).jpeg({ quality: 80 }).toBuffer()
  clay = await sharp({ create: { width: 1280, height: 958, channels: 3, background: { r: 20, g: 20, b: 200 } } }).jpeg({ quality: 70 }).toBuffer()
  writeFileSync(join(mediaDir, 'silk.jpg'), silk)
  writeFileSync(join(mediaDir, 'ceramics.jpg'), clay)
  writeFileSync(join(mediaDir, 'manifest.json'), JSON.stringify([
    { slug: 'silk', file: 'silk.jpg', bytes: silk.length, width: 1280, height: 960 },
    { slug: 'ceramics', file: 'ceramics.jpg', bytes: clay.length, width: 1280, height: 958 },
  ]))
})

const row = (n: number, link: string, photo: Buffer, width: number, height: number, over: Record<string, unknown> = {}) =>
  ({ file_id: fid(n), file_size_bytes: String(photo.length), width_px: width, height_px: height, link, ...over })
const silkRow = (n: number, link = 'workshop gallery') => row(n, link, silk, 1280, 960)
const clayRow = (n: number, link = 'experience gallery') => row(n, link, clay, 1280, 958)

const fakeClient = (rows: unknown[]) => {
  const queries: string[] = []
  return { queries, async query(sql: string) { queries.push(sql); return /^\s*SELECT/i.test(sql) ? { rows } : { rows: [] } } }
}
const fakeStorage = (present: Record<string, number> = {}) => {
  const objects = new Map<string, Buffer | number>(Object.entries(present))
  const calls: Array<{ op: string, key: string, replace?: boolean, bytes?: Buffer }> = []
  const lengthOf = (key: string) => { const value = objects.get(key); return value === undefined ? null : typeof value === 'number' ? value : value.length }
  return {
    objects, calls,
    async exists(key: string) { return objects.has(key) },
    async size(key: string) { return lengthOf(key) },
    async write(key: string, bytes: Buffer, _type: string, options: { replace?: boolean } = {}) {
      calls.push({ op: 'write', key, replace: options.replace, bytes })
      if (objects.has(key)) throw new Error('exists')
      objects.set(key, bytes)
    },
    async remove(key: string) { calls.push({ op: 'remove', key }); objects.delete(key) },
  }
}
const deps = (rows: unknown[], storage = fakeStorage()) => ({ client: fakeClient(rows), storage, notesDir: mkdtempSync(join(tmpdir(), 'demo-copies-notes-')), projectRef: PROD_PROJECT_REF, mediaDir, now: new Date('2026-11-28T10:00:00Z') })
const opts = (over: Record<string, unknown> = {}) => ({ apply: false, targetProd: true, ...over })

describe('parseArgs', () => {
  it('is a dry run by default; --apply applies; --dry-run with --apply is refused; unknown options refused', () => {
    expect(parseArgs(['--target-prod'])).toMatchObject({ apply: false, targetProd: true })
    expect(parseArgs(['--target-prod', '--apply']).apply).toBe(true)
    expect(() => parseArgs(['--apply', '--dry-run'])).toThrow(/either/)
    expect(() => parseArgs(['--force'])).toThrow(/Unknown option/)
  })
  it('--undo writes by itself, previews with --dry-run, and cannot be combined with --apply', () => {
    expect(parseArgs(['--undo', 'u.json', '--target-prod'])).toMatchObject({ undo: 'u.json', apply: true })
    expect(parseArgs(['--undo', 'u.json', '--dry-run']).apply).toBe(false)
    expect(() => parseArgs(['--undo', 'u.json', '--apply'])).toThrow(/--undo/)
  })
})

describe('guards (checked before any connection)', () => {
  const db = (ref: string) => `postgresql://postgres.${ref}:test-only@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
  const env = (ref: string, extra: Record<string, string> = {}) => ({ DATABASE_URL: db(ref), SUPABASE_URL: `https://${ref}.supabase.co`, ...extra })
  it('PROD only: --target-prod, the typed confirmation, PROD for both URLs', () => {
    expect(assertDemoCopiesTarget(env(PROD_PROJECT_REF, { CONFIRM_PROJECT_REF: PROD_PROJECT_REF }), { targetProd: true })).toBe(PROD_PROJECT_REF)
    expect(() => assertDemoCopiesTarget(env(PROD_PROJECT_REF, { CONFIRM_PROJECT_REF: PROD_PROJECT_REF }), { targetProd: false })).toThrow(/--target-prod/)
    expect(() => assertDemoCopiesTarget(env(PROD_PROJECT_REF), { targetProd: true })).toThrow(/CONFIRM_PROJECT_REF/)
    expect(() => assertDemoCopiesTarget(env(DEV_PROJECT_REF, { CONFIRM_PROJECT_REF: PROD_PROJECT_REF }), { targetProd: true })).toThrow(/confirmed PROD/)
  })
  it('refuses a retired ref even when confirmed', () => {
    const [retired] = RETIRED_PROJECT_REFS
    expect(() => assertDemoCopiesTarget(env(retired, { CONFIRM_PROJECT_REF: retired }), { targetProd: true })).toThrow(/retired/)
  })
})

describe('dry run', () => {
  it('counts selected / toUpload / alreadyPresent / noMatch per group and uploads nothing', async () => {
    const rows = [silkRow(1), silkRow(2), clayRow(3), clayRow(4, 'village cover'), silkRow(5, 'experience gallery'),
      row(6, 'workshop gallery', silk, 1280, 700), // no demo photo has these dimensions
    ]
    const storage = fakeStorage({ [`prf-media/${fid(2)}`]: 1 }) // present already
    const report = await restoreDemoCopies(opts(), deps(rows, storage))
    expect(report.mode).toMatch(/dry-run/)
    expect(storage.calls).toHaveLength(0)
    expect(report.groups['workshop gallery']).toEqual({ selected: 3, toUpload: 1, alreadyPresent: 1, noMatch: 1 })
    expect(report.groups['experience gallery']).toEqual({ selected: 2, toUpload: 2, alreadyPresent: 0, noMatch: 0 })
    expect(report.groups['village cover']).toEqual({ selected: 1, toUpload: 1, alreadyPresent: 0, noMatch: 0 })
    expect(report.totals).toEqual({ selected: 6, toUpload: 4, alreadyPresent: 1, noMatch: 1 })
  })
  it('selects only linked images in prf-media and leaves the importer rows to restore-from-sets', async () => {
    const input = deps([])
    await restoreDemoCopies(opts(), input)
    const sql = input.client.queries.find(text => /SELECT/i.test(text)) ?? ''
    expect(sql).toMatch(/profile_media/)
    expect(sql).toMatch(/provider_version_media/)
    expect(sql).toMatch(/cover_image_id/)
    expect(sql).toMatch(/storage_key\s*=\s*'prf-media\/'/)
    expect(sql).toMatch(/NOT LIKE 'seed-/)
  })
  it('never writes to the database: READ ONLY transaction, SELECT only, rolled back', async () => {
    const input = deps([silkRow(1)])
    await restoreDemoCopies(opts(), input)
    const words = input.client.queries.map(sql => sql.trim().split(/\s+/)[0].toUpperCase())
    expect(words.every(word => ['BEGIN', 'SELECT', 'ROLLBACK'].includes(word))).toBe(true)
    expect(input.client.queries[0]).toMatch(/BEGIN READ ONLY/i)
    expect(input.client.queries.at(-1)).toMatch(/ROLLBACK/i)
  })
  it('a size/dimension triple shared by two demo photos is not matched (noMatch)', async () => {
    const twin = mkdtempSync(join(tmpdir(), 'demo-twin-'))
    writeFileSync(join(twin, 'silk.jpg'), silk)
    writeFileSync(join(twin, 'copy.jpg'), silk)
    writeFileSync(join(twin, 'manifest.json'), JSON.stringify([
      { slug: 'silk', file: 'silk.jpg', bytes: silk.length, width: 1280, height: 960 },
      { slug: 'copy', file: 'copy.jpg', bytes: silk.length, width: 1280, height: 960 },
    ]))
    const report = await restoreDemoCopies(opts(), { ...deps([silkRow(1)]), mediaDir: twin })
    expect(report.totals).toMatchObject({ toUpload: 0, noMatch: 1 })
  })
  it('stops when the local file is not the photo its manifest entry describes (bytes or dimensions)', async () => {
    const bad = mkdtempSync(join(tmpdir(), 'demo-bad-'))
    writeFileSync(join(bad, 'silk.jpg'), clay) // wrong file under the silk name
    writeFileSync(join(bad, 'manifest.json'), JSON.stringify([{ slug: 'silk', file: 'silk.jpg', bytes: silk.length, width: 1280, height: 960 }]))
    await expect(restoreDemoCopies(opts(), { ...deps([silkRow(1)]), mediaDir: bad })).rejects.toThrow(/does not match its manifest/)
  })
  it('writes plan.json with file ids only and prints no names, e-mails, urls or keys', async () => {
    const report = await restoreDemoCopies(opts(), deps([silkRow(1), row(6, 'workshop gallery', silk, 1280, 700)]))
    const plan = JSON.parse(readFileSync(report.planFile, 'utf8'))
    expect(plan.noMatch.map((item: { file_id: string }) => item.file_id)).toEqual([fid(6)])
    expect(JSON.stringify(report)).not.toMatch(/@|https?:|prf-media|\.supabase\.co/)
  })
})

describe('--apply', () => {
  it('uploads the original bytes unchanged under the existing key with replace:false, undo file first, size verified, nothing removed', async () => {
    const rows = [silkRow(1), clayRow(2)]
    const storage = fakeStorage()
    const input = deps(rows, storage)
    let undoPath = ''
    const seen: boolean[] = []
    const write = storage.write.bind(storage)
    storage.write = async (...args: Parameters<typeof write>) => { seen.push(undoPath ? existsSync(undoPath) : false); return write(...args) }
    const report = await restoreDemoCopies(opts({ apply: true }), { ...input, onUndoFile: (path: string) => { undoPath = path } })
    expect(report.uploaded).toBe(2)
    expect(seen).toEqual([true, true])
    expect(storage.calls.every(call => call.op === 'write' && call.replace === false)).toBe(true)
    expect(storage.objects.get(`prf-media/${fid(1)}`)).toEqual(silk)
    expect(storage.objects.get(`prf-media/${fid(2)}`)).toEqual(clay)
    const undo = JSON.parse(readFileSync(report.undoFile, 'utf8'))
    expect(undo).toMatchObject({ tool: 'storage:restore-demo-copies', projectRef: PROD_PROJECT_REF })
    expect(undo.items).toHaveLength(2)
  })
  it('a second run finds everything present and writes nothing', async () => {
    const storage = fakeStorage()
    await restoreDemoCopies(opts({ apply: true }), deps([silkRow(1)], storage))
    const before = storage.calls.length
    const again = await restoreDemoCopies(opts({ apply: true }), deps([silkRow(1)], storage))
    expect(again.totals).toMatchObject({ alreadyPresent: 1, toUpload: 0 })
    expect(storage.calls.length).toBe(before)
  })
})

describe('--undo', () => {
  it('deletes only keys of its own file that still have the recorded size; --dry-run previews', async () => {
    const storage = fakeStorage({ [`prf-media/${fid(1)}`]: 100, [`prf-media/${fid(2)}`]: 999, [`prf-media/${fid(9)}`]: 50 })
    const file = join(mkdtempSync(join(tmpdir(), 'demo-undo-')), 'undo.json')
    writeFileSync(file, JSON.stringify({ tool: 'storage:restore-demo-copies', projectRef: PROD_PROJECT_REF, items: [{ file_id: fid(1), storage_key: `prf-media/${fid(1)}`, bytes: 100 }, { file_id: fid(2), storage_key: `prf-media/${fid(2)}`, bytes: 100 }] }))
    expect(await undoDemoCopies({ undo: file, apply: false }, { storage, projectRef: PROD_PROJECT_REF })).toMatchObject({ toRemove: 1, skipped: 1, removed: 0 })
    expect(storage.calls).toHaveLength(0)
    expect(await undoDemoCopies({ undo: file, apply: true }, { storage, projectRef: PROD_PROJECT_REF })).toMatchObject({ removed: 1, skipped: 1 })
    expect([...storage.objects.keys()].sort()).toEqual([`prf-media/${fid(2)}`, `prf-media/${fid(9)}`])
  })
  it('refuses an undo file of another project or tool', async () => {
    const file = join(mkdtempSync(join(tmpdir(), 'demo-undo-')), 'undo.json')
    writeFileSync(file, JSON.stringify({ tool: 'storage:restore-demo-copies', projectRef: DEV_PROJECT_REF, items: [] }))
    await expect(undoDemoCopies({ undo: file, apply: true }, { storage: fakeStorage(), projectRef: PROD_PROJECT_REF })).rejects.toThrow(/undo file/)
    writeFileSync(file, JSON.stringify({ tool: 'storage:restore-from-sets', projectRef: PROD_PROJECT_REF, items: [] }))
    await expect(undoDemoCopies({ undo: file, apply: true }, { storage: fakeStorage(), projectRef: PROD_PROJECT_REF })).rejects.toThrow(/undo file/)
  })
})
