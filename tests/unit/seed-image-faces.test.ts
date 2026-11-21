/**
 * Seed image import 2111 (human request 2026-11-21), face-image removal: the rows that show a clearly visible person are found by
 * the SHA-256 of the object bytes (file ids differ between DEV and PROD) and compared with go-anh-mat-nguoi-final.json before
 * anything is written; any difference stops the run.
 */
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { compareRemoval, findFaceRows, parseRemovalList, removeFaceRows, rowKey } from '../../scripts/storage/seed-image-faces.mjs'

const sha = (text: string) => createHash('sha256').update(text).digest('hex')
const A = Buffer.from('picture A'), B = Buffer.from('picture B'), OTHER = Buffer.from('some other picture')
const SHA_A = sha('picture A'), SHA_B = sha('picture B')
const U = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const [E1, E2, P1, FA1, FA2, FB1, FB2, FO] = [U(1), U(2), U(3), U(11), U(12), U(13), U(14), U(15)]

const list = () => ({
  version: 2,
  tong: { profile_media: 2, provider_version_media: 1, giu_lai: 1 },
  hashes: [{ sha256: SHA_A, anh: 'A' }, { sha256: SHA_B, anh: 'B' }],
  rows: [
    { table: 'profile_media', sha256: SHA_A, experience_id: E1, profile_media_id: U(101), file_id: FA1, display_order: 0 },
    { table: 'profile_media', sha256: SHA_B, provider_id: P1, profile_media_id: U(102), file_id: FB1, display_order: 0 },
    { table: 'provider_version_media', sha256: SHA_B, provider_id: P1, version_no: '1', file_id: FB1, display_order: 0 },
  ],
  giu_lai: [{ table: 'profile_media', sha256: SHA_A, experience_id: E2, profile_media_id: U(103), file_id: FA2 }],
})

describe('parseRemovalList', () => {
  it('accepts a well-formed list and exposes rows, retained rows and hashes', () => {
    const parsed = parseRemovalList(list())
    expect(parsed.rows).toHaveLength(3)
    expect(parsed.retained).toHaveLength(1)
    expect([...parsed.hashes].sort()).toEqual([SHA_A, SHA_B].sort())
  })
  it('refuses a bad hash, an unknown table, a row whose hash is not listed, and totals that do not add up', () => {
    const bad = (change: (doc: any) => void, pattern: RegExp) => { const doc = list(); change(doc); expect(() => parseRemovalList(doc)).toThrow(pattern) }
    bad(doc => { doc.rows[0].sha256 = 'xyz' }, /sha256/)
    bad(doc => { doc.rows[0].table = 'stored_files' }, /table/)
    bad(doc => { doc.rows[0].sha256 = 'a'.repeat(64) }, /not in hashes/)
    bad(doc => { doc.tong.profile_media = 9 }, /totals/)
    bad(doc => { doc.rows[2].version_no = undefined }, /version_no/)
  })
})

describe('compareRemoval', () => {
  const found = () => [
    { table: 'profile_media', sha256: SHA_A, experience_id: E1, profile_media_id: 'x1', file_id: 'f1' },
    { table: 'profile_media', sha256: SHA_A, experience_id: E2, profile_media_id: 'x2', file_id: 'f2' }, // the retained one
    { table: 'profile_media', sha256: SHA_B, provider_id: P1, profile_media_id: 'x3', file_id: 'f3' },
    { table: 'provider_version_media', sha256: SHA_B, provider_id: P1, version_no: '1', file_id: 'f3' },
  ]
  const hashesFound = () => new Set([SHA_A, SHA_B])
  it('matches by table, owner and hash, not by file id or row id (they differ on PROD)', () => {
    expect(compareRemoval(found(), hashesFound(), parseRemovalList(list()))).toEqual({ ok: true, problems: [] })
    expect(rowKey(found()[0])).toBe(rowKey(list().rows[0]))
  })
  it('stops on a missing row, an extra row, an agency-owned row and a missing hash', () => {
    const doc = parseRemovalList(list())
    expect(compareRemoval(found().slice(1), hashesFound(), doc).problems.join(' ')).toMatch(/missing/)
    expect(compareRemoval([...found(), { table: 'profile_media', sha256: SHA_A, experience_id: U(9), profile_media_id: 'x9' }], hashesFound(), doc).problems.join(' ')).toMatch(/unexpected/)
    expect(compareRemoval([...found(), { table: 'profile_media', sha256: SHA_A, agency_id: U(8), profile_media_id: 'x8' }], hashesFound(), doc).problems.join(' ')).toMatch(/unexpected/)
    const result = compareRemoval(found(), new Set([SHA_A]), doc)
    expect(result.ok).toBe(false); expect(result.problems.join(' ')).toMatch(/hash/)
  })
})

function fakes() {
  const files = [FA1, FA2, FB1, FB2, FO]
  const objects: Record<string, Buffer> = { [`prf-media/${FA1}`]: A, [`prf-media/${FA2}`]: A, [`prf-media/${FB1}`]: B, [`prf-media/${FB2}`]: B, [`prf-media/${FO}`]: OTHER }
  const pm = [
    { profile_media_id: U(101), file_id: FA1, experience_id: E1, provider_id: null, agency_id: null, category: 'Activity', display_order: 0 },
    { profile_media_id: U(103), file_id: FA2, experience_id: E2, provider_id: null, agency_id: null, category: 'Activity', display_order: 0 },
    { profile_media_id: U(102), file_id: FB1, experience_id: null, provider_id: P1, agency_id: null, category: 'Activity', display_order: 0 },
    { profile_media_id: U(104), file_id: FO, experience_id: E1, provider_id: null, agency_id: null, category: 'Space', display_order: 1 },
  ]
  const pvm = [{ provider_id: P1, version_no: 1, file_id: FB1, category: 'Activity', display_order: 0 }]
  const log: string[] = []
  const client = {
    async query(sql: string, values: any[] = []) {
      log.push(sql.replace(/\s+/g, ' ').trim().slice(0, 40))
      if (/SELECT DISTINCT/i.test(sql)) return { rows: files.map(file_id => ({ file_id })), rowCount: files.length }
      if (/^\s*DELETE FROM public\.profile_media/i.test(sql)) { const gone = pm.filter(r => values[0].includes(r.profile_media_id)); gone.forEach(r => pm.splice(pm.indexOf(r), 1)); return { rows: gone, rowCount: gone.length } }
      if (/^\s*DELETE FROM public\.provider_version_media/i.test(sql)) { const gone = pvm.filter(r => values[0].includes(r.file_id) && values[1].includes(r.provider_id)); gone.forEach(r => pvm.splice(pvm.indexOf(r), 1)); return { rows: gone, rowCount: gone.length } }
      if (/FROM public\.profile_media/i.test(sql)) return { rows: pm.filter(r => values[0].includes(r.file_id)), rowCount: 0 }
      if (/FROM public\.provider_version_media/i.test(sql)) return { rows: pvm.filter(r => values[0].includes(r.file_id)), rowCount: 0 }
      return { rows: [], rowCount: 0 }
    },
  }
  const reads: string[] = []
  const storage = { async read(key: string) { reads.push(key); return objects[key] ?? null } }
  return { client, storage, pm, pvm, log, reads }
}

describe('findFaceRows', () => {
  it('hashes the objects referenced by media rows and returns the rows whose file has a listed hash', async () => {
    const f = fakes()
    const found = await findFaceRows(f.client, f.storage, parseRemovalList(list()))
    expect([...found.hashesFound].sort()).toEqual([SHA_A, SHA_B].sort())
    expect(found.rows.map((r: any) => [r.table, r.sha256 === SHA_A ? 'A' : 'B', r.experience_id ?? r.provider_id]).sort()).toEqual([
      ['profile_media', 'A', E1], ['profile_media', 'A', E2], ['profile_media', 'B', P1], ['provider_version_media', 'B', P1]].sort())
    expect(f.reads).toHaveLength(5) // every referenced image object, once
    expect(f.log.every(s => /^SELECT/i.test(s))).toBe(true) // read only
  })
})

describe('removeFaceRows', () => {
  it('deletes the listed rows, keeps the retained row, and returns the rows it really deleted (full rows, for the undo file)', async () => {
    const f = fakes()
    const doc = parseRemovalList(list()), found = await findFaceRows(f.client, f.storage, doc)
    const removed = await removeFaceRows(f.client, found.rows, doc)
    expect(removed.profile_media.map((r: any) => r.profile_media_id).sort()).toEqual([U(101), U(102)])
    expect(removed.provider_version_media).toHaveLength(1)
    expect(f.pm.map(r => r.profile_media_id).sort()).toEqual([U(103), U(104)]) // retained (E2) and the non-face row stay
    expect(f.pvm).toHaveLength(0)
  })
  it('tolerates rows the importer already unlinked in the same transaction', async () => {
    const f = fakes()
    const doc = parseRemovalList(list()), found = await findFaceRows(f.client, f.storage, doc)
    f.pm.splice(f.pm.findIndex(r => r.profile_media_id === U(101)), 1) // gone already
    const removed = await removeFaceRows(f.client, found.rows, doc)
    expect(removed.profile_media.map((r: any) => r.profile_media_id)).toEqual([U(102)])
  })
})
