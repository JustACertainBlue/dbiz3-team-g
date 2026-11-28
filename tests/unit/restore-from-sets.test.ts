/**
 * storage:restore-from-sets (runbook docs/build/prod-migrate-supabase.md §7.4.2, human request 2026-11-28): put the bytes of the
 * 20/11 and 21/11 photo sets back under the EXISTING object keys of a restored PROD database. It never writes to the database
 * and never replaces an object.
 */
import { createHash } from 'node:crypto'
import { existsSync, mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import sharp from 'sharp'
import { beforeAll, describe, expect, it } from 'vitest'
import { PROD_PROJECT_REF, DEV_PROJECT_REF, RETIRED_PROJECT_REFS } from '../../scripts/db/project-refs.mjs'
import { processImage } from '../../scripts/storage/seed-image-import-plan.mjs'
import { assertRestoreTarget, parseArgs, restoreFromSets, undoRestore } from '../../scripts/storage/restore-from-sets.mjs'

const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
const EXP = 'aaaaaaaa-aaaa-5aaa-8aaa-000000000001'
const EXP2 = 'dddddddd-dddd-5ddd-8ddd-000000000002'
const VIL = 'bbbbbbbb-bbbb-5bbb-8bbb-000000000001'
const PRV = 'cccccccc-cccc-5ccc-8ccc-000000000001'
const fid = (n: number) => `f0000000-0000-4000-8000-${String(n).padStart(12, '0')}`

let root: string
const photo = async (name: string, colour: number, width = 1920, height = 1080) => {
  const bytes = await sharp({ create: { width, height, channels: 3, background: { r: colour, g: 90, b: 40 } } }).jpeg({ quality: 90 }).toBuffer()
  const file = join(root, name)
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(file, bytes)
  return bytes
}
const entry = (loai: string, id: string, n: number, bytes: Buffer, extra: Record<string, unknown> = {}) => loai === 'workshop'
  ? { loai, provider_id: id, version: 1, file: `workshop/${id}/${n}.jpg`, source_type: 'pexels', page_url: 'https://www.pexels.com/photo/1/', sha256: sha(bytes), vi_tri_moi: { category: 'Activity', display_order: 0 }, ...extra }
  : { loai, id, ten: 't', lang: 'l', file: `${loai}/${id}/${n}.jpg`, source_type: 'pexels', page_url: 'https://www.pexels.com/photo/1/', sha256: sha(bytes), ...extra }
const manifest = (name: string, entries: unknown[]) => { const file = join(root, name); writeFileSync(file, JSON.stringify(entries)); return file }

/** A stored_files row as the importer would have written it for these bytes. */
const rowFor = async (n: number, kind: string, id: string, file: number, bytes: Buffer, over: Record<string, unknown> = {}) => {
  const done = await processImage(bytes)
  return { file_id: fid(n), file_name: `seed-${kind}-${id.slice(0, 8)}-${file}.jpg`, file_size_bytes: String(done.bytes.length), width_px: done.width, height_px: done.height, linked: true, ...over }
}

const fakeClient = (rows: unknown[]) => {
  const queries: string[] = []
  return { queries, async query(sql: string) { queries.push(sql); return /SELECT/i.test(sql) && !/^\s*(BEGIN|ROLLBACK)/i.test(sql) ? { rows } : { rows: [] } } }
}
const fakeStorage = (present: Record<string, number> = {}) => {
  const objects = new Map<string, Buffer | number>(Object.entries(present))
  const calls: Array<{ op: string, key: string, replace?: boolean }> = []
  const lengthOf = (key: string) => { const value = objects.get(key); return value === undefined ? null : typeof value === 'number' ? value : value.length }
  return {
    objects, calls,
    async exists(key: string) { return objects.has(key) },
    async size(key: string) { return lengthOf(key) },
    async write(key: string, bytes: Buffer, _type: string, options: { replace?: boolean } = {}) {
      calls.push({ op: 'write', key, replace: options.replace })
      if (objects.has(key)) throw new Error('exists')
      objects.set(key, bytes)
    },
    async remove(key: string) { calls.push({ op: 'remove', key }); objects.delete(key) },
  }
}
const base = (over: Record<string, unknown> = {}) => ({ apply: false, sets: [] as Array<{ manifest: string, photosDir: string }>, targetProd: true, ...over })

let a: Buffer, b: Buffer, c: Buffer, d: Buffer
beforeAll(async () => {
  root = mkdtempSync(join(tmpdir(), 'restore-sets-'))
  a = await photo('s1/experience/' + EXP + '/1.jpg', 10, 1280, 720) // 20/11 photo: stays 1280x720
  b = await photo('s1/village/' + VIL + '/1.jpg', 60)
  c = await photo('s2/workshop/' + PRV + '/1.jpg', 120)
  d = await photo('s2/experience/' + EXP + '/1.jpg', 200) // 21/11 photo (becomes 1600x900) with the SAME importer name as the 20/11 one
})
const sets = () => [
  { manifest: manifest('s1.json', [entry('experience', EXP, 1, a), entry('village', VIL, 1, b)]), photosDir: join(root, 's1') },
  { manifest: manifest('s2.json', [entry('workshop', PRV, 1, c), entry('experience', EXP, 1, d)]), photosDir: join(root, 's2') },
]
const deps = (rows: unknown[], storage = fakeStorage()) => ({ client: fakeClient(rows), storage, notesDir: mkdtempSync(join(tmpdir(), 'restore-notes-')), projectRef: PROD_PROJECT_REF, now: new Date('2026-11-28T10:00:00Z') })

describe('parseArgs', () => {
  it('is a dry run by default and reads repeated --set <manifest> <photos-dir>', () => {
    const options = parseArgs(['--set', 'a.json', 'dirA', '--set', 'b.json', 'dirB', '--target-prod'])
    expect(options).toMatchObject({ apply: false, targetProd: true, sets: [{ manifest: 'a.json', photosDir: 'dirA' }, { manifest: 'b.json', photosDir: 'dirB' }] })
  })
  it('--apply applies; --dry-run with --apply is refused; unknown options and a missing --set are refused', () => {
    expect(parseArgs(['--set', 'a.json', 'd', '--apply', '--target-prod']).apply).toBe(true)
    expect(() => parseArgs(['--set', 'a.json', 'd', '--apply', '--dry-run'])).toThrow(/either/)
    expect(() => parseArgs(['--set', 'a.json', 'd', '--force'])).toThrow(/Unknown option/)
    expect(() => parseArgs(['--target-prod'])).toThrow(/--set/)
    expect(() => parseArgs(['--set', 'a.json'])).toThrow(/--set/)
  })
  it('--undo needs no --set and cannot be combined with --apply', () => {
    expect(parseArgs(['--undo', 'u.json', '--target-prod', '--dry-run'])).toMatchObject({ undo: 'u.json', apply: false })
    expect(parseArgs(['--undo', 'u.json', '--target-prod']).apply).toBe(true)
    expect(() => parseArgs(['--undo', 'u.json', '--apply'])).toThrow(/--undo/)
  })
})

describe('guards (checked before any connection)', () => {
  const db = (ref: string) => `postgresql://postgres.${ref}:test-only@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`
  const env = (ref: string, extra: Record<string, string> = {}) => ({ DATABASE_URL: db(ref), SUPABASE_URL: `https://${ref}.supabase.co`, ...extra })
  it('runs only on PROD, with --target-prod and the typed confirmation', () => {
    expect(assertRestoreTarget(env(PROD_PROJECT_REF, { CONFIRM_PROJECT_REF: PROD_PROJECT_REF }), { targetProd: true })).toBe(PROD_PROJECT_REF)
    expect(() => assertRestoreTarget(env(PROD_PROJECT_REF, { CONFIRM_PROJECT_REF: PROD_PROJECT_REF }), { targetProd: false })).toThrow(/--target-prod/)
    expect(() => assertRestoreTarget(env(PROD_PROJECT_REF), { targetProd: true })).toThrow(/CONFIRM_PROJECT_REF/)
    expect(() => assertRestoreTarget(env(DEV_PROJECT_REF, { CONFIRM_PROJECT_REF: PROD_PROJECT_REF }), { targetProd: true })).toThrow(/confirmed PROD/)
  })
  it('refuses a retired ref for the database or for Storage, even when confirmed', () => {
    const [retired] = RETIRED_PROJECT_REFS
    expect(() => assertRestoreTarget(env(retired, { CONFIRM_PROJECT_REF: retired }), { targetProd: true })).toThrow(/retired/)
    expect(() => assertRestoreTarget({ ...env(PROD_PROJECT_REF, { CONFIRM_PROJECT_REF: PROD_PROJECT_REF }), SUPABASE_URL: `https://${retired}.supabase.co` }, { targetProd: true })).toThrow(/retired/)
  })
})

describe('dry run', () => {
  it('reports per group (experience, village, workshop) and uploads nothing', async () => {
    const rows = [
      await rowFor(1, 'experience', EXP, 1, d),
      await rowFor(2, 'village', VIL, 1, b),
      await rowFor(3, 'workshop', PRV, 1, c),
    ]
    const storage = fakeStorage()
    const report = await restoreFromSets(base({ sets: sets() }), deps(rows, storage))
    expect(report.mode).toMatch(/dry-run/)
    expect(storage.calls.filter(call => call.op === 'write')).toHaveLength(0)
    expect(report.groups.village).toMatchObject({ selected: 1, toUpload: 1, sizeDrift: 0, noSource: 0 })
    expect(report.groups.workshop).toMatchObject({ selected: 1, toUpload: 1 })
    expect(report.groups.experience.selected).toBe(1)
  })
  it('never writes to the database: read-only transaction, only SELECT statements, always rolled back', async () => {
    const deps0 = deps([await rowFor(2, 'village', VIL, 1, b)])
    await restoreFromSets(base({ sets: sets() }), deps0)
    const statements = deps0.client.queries.map(sql => sql.trim().split(/\s+/)[0].toUpperCase())
    expect(statements.every(word => ['BEGIN', 'SELECT', 'ROLLBACK'].includes(word))).toBe(true)
    expect(deps0.client.queries[0]).toMatch(/BEGIN READ ONLY/i)
    expect(deps0.client.queries.at(-1)).toMatch(/ROLLBACK/i)
  })
  it('skips rows whose object is already present and rows no longer linked (unlinked face rows stay without bytes)', async () => {
    const rows = [await rowFor(2, 'village', VIL, 1, b), await rowFor(3, 'workshop', PRV, 1, c, { linked: false })]
    const storage = fakeStorage({ [`prf-media/${fid(2)}`]: 1 })
    const report = await restoreFromSets(base({ sets: sets() }), deps(rows, storage))
    expect(report.groups.village).toMatchObject({ selected: 1, alreadyPresent: 1, toUpload: 0 })
    expect(report.groups.workshop).toMatchObject({ selected: 1, unlinked: 1, toUpload: 0 })
  })
  it('counts a row with no manifest entry as noSource and writes its id to plan.json (ids only)', async () => {
    const rows = [await rowFor(4, 'experience', EXP2, 1, a)]
    const input = deps(rows)
    const report = await restoreFromSets(base({ sets: sets() }), input)
    expect(report.groups.experience).toMatchObject({ selected: 1, noSource: 1, toUpload: 0 })
    const plan = JSON.parse(readFileSync(report.planFile, 'utf8'))
    expect(plan.noSource.map((item: { file_id: string }) => item.file_id)).toEqual([fid(4)])
    expect(JSON.stringify(plan)).not.toMatch(/@|http/)
  })
  it('reports size-drift when the re-encoded photo differs from the stored row, and does not upload it', async () => {
    const rows = [await rowFor(2, 'village', VIL, 1, b, { file_size_bytes: '12345' })]
    const report = await restoreFromSets(base({ sets: sets() }), deps(rows))
    expect(report.groups.village).toMatchObject({ sizeDrift: 1, toUpload: 0 })
  })
  it('two sets with the same importer name: the candidate that matches size and dimensions is used; identical re-encodings are not ambiguous', async () => {
    const rows = [await rowFor(1, 'experience', EXP, 1, a)]
    const report = await restoreFromSets(base({ sets: sets() }), deps(rows))
    expect(report.groups.experience).toMatchObject({ toUpload: 1, ambiguous: 0, sizeDrift: 0 })
  })
  it('stops when a local file is not the approved photo (SHA-256 differs)', async () => {
    const file = manifest('bad.json', [entry('village', VIL, 1, b, { sha256: '0'.repeat(64) })])
    await expect(restoreFromSets(base({ sets: [{ manifest: file, photosDir: join(root, 's1') }] }), deps([await rowFor(2, 'village', VIL, 1, b)]))).rejects.toThrow(/SHA-256 mismatch/)
  })
  it('a manifest entry that is not valid is refused before anything is read from the database', async () => {
    const file = manifest('invalid.json', [{ loai: 'village', id: 'nope' }])
    const input = deps([])
    await expect(restoreFromSets(base({ sets: [{ manifest: file, photosDir: root }] }), input)).rejects.toThrow(/Invalid/)
    expect(input.client.queries).toHaveLength(0)
  })
})

describe('--apply', () => {
  it('writes the undo file first, uploads under the existing key with replace:false, verifies the size, never removes', async () => {
    const rows = [await rowFor(2, 'village', VIL, 1, b), await rowFor(3, 'workshop', PRV, 1, c)]
    const storage = fakeStorage()
    const input = deps(rows, storage)
    const seen: boolean[] = []
    const write = storage.write.bind(storage)
    let undoPath = ''
    storage.write = async (...args: Parameters<typeof write>) => { seen.push(undoPath ? existsSync(undoPath) : true); return write(...args) }
    const report = await restoreFromSets(base({ sets: sets(), apply: true }), { ...input, onUndoFile: (path: string) => { undoPath = path } })
    expect(report.uploaded).toBe(2)
    expect(seen.every(Boolean) && seen.length === 2).toBe(true)
    expect(storage.calls.every(call => call.op === 'write' && call.replace === false)).toBe(true)
    expect([...storage.objects.keys()].sort()).toEqual([`prf-media/${fid(2)}`, `prf-media/${fid(3)}`])
    const undo = JSON.parse(readFileSync(report.undoFile, 'utf8'))
    expect(undo.projectRef).toBe(PROD_PROJECT_REF)
    expect(undo.items.map((item: { file_id: string }) => item.file_id).sort()).toEqual([fid(2), fid(3)])
    expect(Object.keys(report.uploadedSha256)).toHaveLength(2)
  })
  it('a second run finds nothing to upload (idempotent) and writes nothing', async () => {
    const rows = [await rowFor(2, 'village', VIL, 1, b)]
    const storage = fakeStorage()
    await restoreFromSets(base({ sets: sets(), apply: true }), deps(rows, storage))
    const before = storage.calls.length
    const again = await restoreFromSets(base({ sets: sets(), apply: true }), deps(rows, storage))
    expect(again.groups.village).toMatchObject({ alreadyPresent: 1, toUpload: 0 })
    expect(storage.calls.length).toBe(before)
  })
  it('prints no names, e-mails, urls or credentials in the report', async () => {
    const report = await restoreFromSets(base({ sets: sets() }), deps([await rowFor(2, 'village', VIL, 1, b)]))
    expect(JSON.stringify(report)).not.toMatch(/@|https?:|seed-village|\.supabase\.co/)
  })
})

describe('--undo', () => {
  it('deletes only the keys of its own file that still have the recorded size', async () => {
    const storage = fakeStorage({ [`prf-media/${fid(2)}`]: 100, [`prf-media/${fid(3)}`]: 999, [`prf-media/${fid(9)}`]: 50 })
    const dir = mkdtempSync(join(tmpdir(), 'restore-undo-'))
    const file = join(dir, 'undo.json')
    writeFileSync(file, JSON.stringify({ tool: 'storage:restore-from-sets', projectRef: PROD_PROJECT_REF, items: [{ file_id: fid(2), storage_key: `prf-media/${fid(2)}`, bytes: 100 }, { file_id: fid(3), storage_key: `prf-media/${fid(3)}`, bytes: 100 }] }))
    const preview = await undoRestore({ undo: file, apply: false }, { storage, projectRef: PROD_PROJECT_REF })
    expect(preview).toMatchObject({ toRemove: 1, skipped: 1, removed: 0 })
    expect(storage.calls).toHaveLength(0)
    const done = await undoRestore({ undo: file, apply: true }, { storage, projectRef: PROD_PROJECT_REF })
    expect(done).toMatchObject({ removed: 1, skipped: 1 })
    expect([...storage.objects.keys()].sort()).toEqual([`prf-media/${fid(3)}`, `prf-media/${fid(9)}`])
  })
  it('refuses an undo file of another project or another tool', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'restore-undo-'))
    const file = join(dir, 'undo.json')
    writeFileSync(file, JSON.stringify({ tool: 'storage:restore-from-sets', projectRef: DEV_PROJECT_REF, items: [] }))
    await expect(undoRestore({ undo: file, apply: true }, { storage: fakeStorage(), projectRef: PROD_PROJECT_REF })).rejects.toThrow(/undo file/)
    writeFileSync(file, JSON.stringify({ tool: 'other', projectRef: PROD_PROJECT_REF, items: [] }))
    await expect(undoRestore({ undo: file, apply: true }, { storage: fakeStorage(), projectRef: PROD_PROJECT_REF })).rejects.toThrow(/undo file/)
  })
})
