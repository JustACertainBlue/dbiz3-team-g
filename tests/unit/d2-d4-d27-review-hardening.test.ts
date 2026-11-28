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
  it('rejects path traversal and unsafe characters', () => {
    for (const key of ['seed/../x', 'seed/2026/09/../../x', `seed/2026/09/${UUID}.jpg/../x`, 'seed/a/..', 'seed/..', 'seed/..hidden', 'seed/', 'seed//x', 'seed/a//b', `seed/2026/09/..%2f${UUID}.jpg`, 'seed/a b.jpg', 'seed/a\\b.jpg', 'seed/a%2fb.jpg', 'seed/é.jpg', 'seed/a\u0000b', 'seed/x/'])
      expect(() => validObjectKey(key), key).toThrow('Invalid object key')
  })
  it('accepts seed keys made only of [A-Za-z0-9._-] segments', () => {
    for (const key of [`seed/2026/09/${UUID}.jpg`, 'seed/placeholder.jpg', 'seed/a-b_c.D/e.f-1'])
      expect(validObjectKey(key)).toBe(key)
  })
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
  it('a seed image that maps to no craft gets the neutral placeholder, not ceramics', async () => {
    const result = await openProfileMediaObject(factsOf(chatImage), 800)
    expect(result.contentType).toBe('image/svg+xml')
    expect(result.size).toBeGreaterThan(0)
    const text = await new Response(result.body).text()
    expect(text).toContain('<svg')
    expect(text).not.toMatch(/<script|on\w+=/i)
  })
  it('a seed PDF is never answered with a picture: 404', async () => {
    await expect(openProfileMediaObject(factsOf(pdf), null)).rejects.toMatchObject({ status: 404 })
  })
})

describe('errors are logged without credentials', () => {
  it('the media route logs a failure (no URL, token or key in the log) and answers 500', async () => {
    const { GET } = await import('@/app/api/prf/media/[fileId]/route')
    const { vi } = await import('vitest')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const broken = new Proxy({}, { get: () => async () => { throw new Error('connect failed postgres://user:pw123@db.example.supabase.co:5432/postgres apikey=sk_live_abc Bearer eyJhbGciOi') } }) as unknown as ApplicationStore
    const response = await withApplicationStore(broken, () => GET(new Request(`http://localhost/api/prf/media/${known.file_id}`), { params: { fileId: known.file_id } }))
    expect(response.status).toBe(500)
    const logged = log.mock.calls.flat().map(String).join(' ')
    log.mockRestore()
    expect(logged).toContain('connect failed')
    for (const secret of ['pw123', 'user:', 'sk_live_abc', 'eyJhbGciOi', 'supabase.co']) expect(logged).not.toContain(secret)
  })
})
