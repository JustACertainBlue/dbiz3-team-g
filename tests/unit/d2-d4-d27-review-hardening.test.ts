/**
 * Review of PR #306 (D1, D2-D4, D27): the seed-image fallback must stay narrow.
 * - an object key `seed/...` is accepted only in its exact seed form (no `..`, no free-form tail);
 * - only the seed image files that have a demo picture become images; chat files and PDFs never do,
 *   and nothing is ever served as a stand-in "ceramics" picture;
 * - a database error is never answered from the JSON fixtures (AGENTS.md: live failures never fall back to JSON).
 */
import { describe, expect, it } from 'vitest'
import { validObjectKey } from '@/lib/storage/object-store'
import { imageRef } from '@/lib/prf/media-urls'
import { loadMediaFacts } from '@/lib/prf/media-access'
import { MediaError, openProfileMediaObject } from '@/lib/prf/media-store'
import { demoRepository, withApplicationStore, type ApplicationStore } from '@/lib/db/application-store'
import { loadExploreSeed } from '@/lib/explore/seed-repository'

const seed = loadExploreSeed()
const seedFiles = seed.stored_files.filter(f => f.storage_key.startsWith('seed/'))
const known = seedFiles.find(f => f.media_type === 'image/jpeg' && !f.file_name.includes('chatfile'))!
const chatImage = seedFiles.find(f => f.media_type === 'image/jpeg' && f.file_name.includes('chatfile'))!
const pdf = seedFiles.find(f => f.media_type === 'application/pdf')!
const UUID = '0b0a4ca0-7493-54d2-aa86-36da0eae7ca5'
const factsOf = (f: Record<string, string>) => ({ file_id: f.file_id, storage_key: f.storage_key, file_name: f.file_name, media_type: f.media_type, file_size_bytes: f.file_size_bytes, uploaded_by: null })
const ref = (f: Record<string, string>) => imageRef({ file_size_bytes: '1', width_px: '10', height_px: '10', storage_key: f.storage_key, file_id: f.file_id })

describe('validObjectKey: seed keys only in their exact form', () => {
  it('rejects path traversal and free-form seed keys', () => {
    for (const key of ['seed/../x', 'seed/2026/09/../../x', `seed/2026/09/${UUID}.jpg/../x`, 'seed/x', 'seed/', `seed/2026/09/${UUID}.jpg/extra`, `seed/2026/09/..%2f${UUID}.jpg`])
      expect(() => validObjectKey(key), key).toThrow('Invalid object key')
  })
  it('accepts the exact seed form', () => expect(validObjectKey(`seed/2026/09/${UUID}.jpg`)).toBe(`seed/2026/09/${UUID}.jpg`))
  it('still accepts the existing prefixes', () => expect(validObjectKey(`prf-media/${UUID}`)).toBe(`prf-media/${UUID}`))
})

describe('imageRef: only seed image files with a demo picture are images', () => {
  it('a known seed image file is servable', () => expect(ref(known)?.url).toContain(`/api/prf/media/${known.file_id}`))
  it('a traversal key, or a key whose id is not the file id, is not an image', () => {
    expect(ref({ file_id: known.file_id, storage_key: 'seed/../../x' })).toBeNull()
    expect(ref({ file_id: known.file_id, storage_key: 'seed/2026/09/33333333-3333-4333-8333-333333333333.jpg' })).toBeNull()
  })
  it('a chat file or a PDF in the seed is not an image (no stand-in picture)', () => {
    expect(ref(chatImage)).toBeNull()
    expect(ref(pdf)).toBeNull()
  })
})

describe('loadMediaFacts', () => {
  it('does not accept a seed key outside the exact form', async () => {
    const id = '11111111-1111-4111-8111-111111111111'
    await demoRepository().insert('stored_files', { file_id: id, storage_key: 'seed/../../x', file_name: 'x.jpg', media_type: 'image/jpeg', file_size_bytes: '1', width_px: '1', height_px: '1', uploaded_by: '', created_at: '2026-01-01T00:00:00Z' })
    expect(await loadMediaFacts(id)).toBeNull()
  })
  it('a database error is thrown, never answered from the JSON fixtures', async () => {
    const broken = new Proxy({}, { get: () => async () => { throw new Error('db down') } }) as unknown as ApplicationStore
    await expect(withApplicationStore(broken, () => loadMediaFacts(known.file_id))).rejects.toThrow('db down')
  })
})

describe('openProfileMediaObject: no stand-in picture', () => {
  it('a seed chat image has no demo picture: 404, not ceramics', async () => {
    await expect(openProfileMediaObject(factsOf(chatImage), 800)).rejects.toMatchObject({ status: 404 })
    await expect(openProfileMediaObject(factsOf(chatImage), 800)).rejects.toBeInstanceOf(MediaError)
  })
  it('a seed PDF is never answered with a picture', async () => {
    await expect(openProfileMediaObject(factsOf(pdf), null)).rejects.toMatchObject({ status: 404 })
  })
})
