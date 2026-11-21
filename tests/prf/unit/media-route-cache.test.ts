// Step 2A (human request 2026-11-20): GET /api/prf/media/[fileId] serves the WebP variant for ?w=400|800|1600 (any other
// value: 800; none: the original), falls back to the original when the variant does not exist yet, and caches only public
// images: "public, max-age=31536000, immutable" + ETag when ?v= is the file's current version. Everything else — provider
// documents, registration documents, drafts, unapproved images — stays "private, no-store".
import { beforeEach, describe, expect, it, vi } from 'vitest'

const objects = vi.hoisted(() => new Map<string, Buffer>())
vi.mock('@/lib/storage/object-store', async importOriginal => {
  const actual = await importOriginal<typeof import('@/lib/storage/object-store')>()
  return {
    ...actual,
    readObject: vi.fn(async (key: string) => { actual.validObjectKey(key); return objects.get(key) ?? null }),
    readObjectStream: vi.fn(async (key: string) => {
      actual.validObjectKey(key)
      const bytes = objects.get(key)
      return bytes ? { body: new Blob([new Uint8Array(bytes)]).stream(), size: bytes.length } : null
    }),
    writeObject: vi.fn(async (key: string, bytes: Uint8Array) => { actual.validObjectKey(key); objects.set(key, Buffer.from(bytes)) }),
    removeObject: vi.fn(async (key: string) => { objects.delete(key) }),
    objectExists: vi.fn(async (key: string) => objects.has(key)),
  }
})

import { GET } from '@/app/api/prf/media/[fileId]/route'
import { demoRepository } from '@/lib/demo/json-repository'
import { demoCookie, guestSession, hdtSession, providerSession, SEED_IDS } from '../helpers/mockSession'

const repo = demoRepository()
const ORIGINAL = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3])
const webp = (width: number) => Buffer.from(`RIFF-webp-${width}`)
const call = (id: string, query = '', headers: Record<string, string> = {}) =>
  GET(new Request(`http://localhost/api/prf/media/${id}${query}`, { headers }), { params: { fileId: id } })

function publicImage() {
  const provider = repo.find('provider_profiles', row => row.provider_id === SEED_IDS.provider1Verified)!
  const link = repo.all('provider_version_media').find(row => row.provider_id === provider.provider_id && row.version_no === provider.published_version_no)!
  return repo.find('stored_files', row => row.file_id === link.file_id)!
}

beforeEach(() => {
  repo.reset(); objects.clear()
  // On DEV and PROD every seed file lives at prf-media/<file_id> (storage:catalog); the CSV fixtures still say seed/…
  for (const file of repo.all('stored_files')) repo.update('stored_files', row => row.file_id === file.file_id, { storage_key: `prf-media/${file.file_id}` })
})

describe('?w= variants', () => {
  it('serves the WebP variant of the requested width, 800 for any other value, the original without ?w', async () => {
    const file = publicImage()
    objects.set(file.storage_key, ORIGINAL)
    for (const width of [400, 800, 1600]) objects.set(`prf-media/${file.file_id}.w${width}.webp`, webp(width))
    for (const [query, body, type] of [['?w=400', webp(400), 'image/webp'], ['?w=1600', webp(1600), 'image/webp'], ['?w=1200', webp(800), 'image/webp'],
      ['?w=abc', webp(800), 'image/webp'], ['', ORIGINAL, file.media_type]] as const) {
      const response = await call(file.file_id, query)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe(type)
      expect(Buffer.from(await response.arrayBuffer())).toEqual(body)
    }
  })
  it('falls back to the original when the variant does not exist yet', async () => {
    const file = publicImage()
    objects.set(file.storage_key, ORIGINAL)
    const response = await call(file.file_id, '?w=400')
    expect(response.headers.get('Content-Type')).toBe(file.media_type)
    expect(Buffer.from(await response.arrayBuffer())).toEqual(ORIGINAL)
  })
})

describe('cache headers', () => {
  it('a public image with the current ?v= is immutable for a year and has an ETag; If-None-Match answers 304', async () => {
    const file = publicImage()
    objects.set(file.storage_key, ORIGINAL); objects.set(`prf-media/${file.file_id}.w400.webp`, webp(400))
    const response = await call(file.file_id, `?w=400&v=${file.file_size_bytes}`)
    expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    const etag = response.headers.get('ETag')
    expect(etag).toMatch(/^".+"$/)
    const again = await call(file.file_id, `?w=400&v=${file.file_size_bytes}`, { 'If-None-Match': etag! })
    expect(again.status).toBe(304)
    expect(again.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    expect(await again.arrayBuffer()).toHaveProperty('byteLength', 0)
  })
  it('a public image without ?v= or with an old ?v= must revalidate (a changed image never stays cached for a year)', async () => {
    const file = publicImage()
    objects.set(file.storage_key, ORIGINAL)
    for (const query of ['', '?v=1', '?w=800&v=old']) {
      const response = await call(file.file_id, query)
      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe('public, no-cache')
      expect(response.headers.get('ETag')).toBeTruthy()
    }
  })
  it('an unapproved image is private, no-store for its owner and refused to Guest', async () => {
    const file = publicImage()
    objects.set(file.storage_key, ORIGINAL)
    repo.update('provider_profiles', row => row.provider_id === SEED_IDS.provider1Verified, { verification_status: 'Pending' })
    const owner = await call(file.file_id, `?v=${file.file_size_bytes}`, { Cookie: demoCookie(providerSession()) })
    expect(owner.status).toBe(200)
    expect(owner.headers.get('Cache-Control')).toBe('private, no-store')
    const guest = await call(file.file_id, `?v=${file.file_size_bytes}`)
    expect(guest.status).toBe(403)
    expect(guest.headers.get('Cache-Control')).toBe('private, no-store')
  })
})

describe('registration and provider documents never get a public header', () => {
  it('provider version documents, for every reader, width and version parameter', async () => {
    const documents = repo.all('provider_version_documents')
    expect(documents.length).toBeGreaterThan(0)
    for (const document of documents) {
      const file = repo.find('stored_files', row => row.file_id === document.file_id)
      if (!file) continue
      objects.set(file.storage_key, ORIGINAL)
      for (const session of [guestSession(), providerSession(document.provider_id), hdtSession()]) {
        for (const query of ['', '?w=400', `?v=${file.file_size_bytes}`, `?w=1600&v=${file.file_size_bytes}`]) {
          const response = await call(file.file_id, query, { Cookie: demoCookie(session) })
          expect(response.headers.get('Cache-Control')).toBe('private, no-store')
        }
      }
    }
  })
  it('a document file that is also linked as published media stays private', async () => {
    const file = publicImage()
    objects.set(file.storage_key, ORIGINAL)
    const provider = repo.find('provider_profiles', row => row.provider_id === SEED_IDS.provider1Verified)!
    repo.insert('provider_version_documents', { provider_id: provider.provider_id, version_no: provider.published_version_no, file_id: file.file_id, document_type: 'Business Registration Certificate' })
    for (const cookie of [demoCookie(guestSession()), demoCookie(providerSession())]) {
      const response = await call(file.file_id, `?w=400&v=${file.file_size_bytes}`, { Cookie: cookie })
      expect(response.headers.get('Cache-Control')).toBe('private, no-store')
    }
  })
  it('registration documents are not served here (404, private, no-store)', async () => {
    const id = '11111111-2222-4333-8444-555555555555'
    repo.insert('stored_files', { file_id: id, storage_key: `registration-documents/${id}`, file_name: 'r.pdf', media_type: 'application/pdf', file_size_bytes: '10', width_px: '', height_px: '', uploaded_by: '', created_at: '2026-11-20T00:00:00Z' })
    const response = await call(id, '?v=10', { Cookie: demoCookie(hdtSession()) })
    expect(response.status).toBe(404)
    expect(response.headers.get('Cache-Control')).toBe('private, no-store')
  })
})

describe('variants are made on upload of display images only', () => {
  it('a display image upload stores the three WebP variants; a certificate upload stores none', async () => {
    const sharp = (await import('sharp')).default
    const { uploadProfileMedia } = await import('@/lib/prf/media-store')
    const { toSessionContext } = await import('@/lib/auth/session')
    const owner = await toSessionContext(providerSession())
    const jpeg = await sharp({ create: { width: 1600, height: 900, channels: 3, background: '#88aa66' } }).jpeg().toBuffer()
    const display = await uploadProfileMedia(owner, owner.providerId!, new File([new Uint8Array(jpeg)], 'synthetic.jpg', { type: 'image/jpeg' }))
    expect([...objects.keys()].filter(key => key.startsWith(`prf-media/${display.file_id}`)).sort()).toEqual([
      `prf-media/${display.file_id}`, `prf-media/${display.file_id}.w1600.webp`, `prf-media/${display.file_id}.w400.webp`, `prf-media/${display.file_id}.w800.webp`])
    const certificate = await uploadProfileMedia(owner, owner.providerId!, new File([new Uint8Array(jpeg)], 'certificate.jpg', { type: 'image/jpeg' }), true)
    expect([...objects.keys()].filter(key => key.startsWith(`prf-media/${certificate.file_id}`))).toEqual([`prf-media/${certificate.file_id}`])
  })
})
