/**
 * Review of PR #306: the demo-picture fallback is only for seed placeholder keys, which have no object in storage.
 * A real upload (`prf-media/...`) whose storage read fails must raise the error (or 404 when the object is absent),
 * never be answered with a demo picture of another craft.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const read = vi.hoisted(() => ({ stream: vi.fn(), object: vi.fn() }))
vi.mock('@/lib/storage/object-store', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/storage/object-store')>()),
  readObjectStream: read.stream,
  readObject: read.object,
}))

import { MediaError, openProfileMediaObject } from '@/lib/prf/media-store'
import { loadExploreSeed } from '@/lib/explore/seed-repository'

const known = loadExploreSeed().stored_files.find(f => f.storage_key.startsWith('seed/') && f.media_type === 'image/jpeg' && !f.file_name.includes('chatfile'))!
const upload = { file_id: '22222222-2222-4222-8222-222222222222', storage_key: 'prf-media/22222222-2222-4222-8222-222222222222', file_name: 'a.jpg', media_type: 'image/jpeg', file_size_bytes: '10', uploaded_by: null }
const seedFile = { file_id: known.file_id, storage_key: known.storage_key, file_name: known.file_name, media_type: known.media_type, file_size_bytes: known.file_size_bytes, uploaded_by: null }

beforeEach(() => { read.stream.mockReset(); read.object.mockReset() })

describe('openProfileMediaObject', () => {
  it('a storage error on a real upload is raised, not hidden behind a demo picture', async () => {
    read.stream.mockRejectedValue(new Error('storage 402'))
    await expect(openProfileMediaObject(upload, 800)).rejects.toThrow('storage 402')
    await expect(openProfileMediaObject(upload, null)).rejects.toThrow('storage 402')
  })
  it('a storage failure is logged (status only, no credentials) and raised', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    read.stream.mockRejectedValue(new Error('Storage operation failed (402) https://x.supabase.co/storage/v1/object Bearer eyJhbGciOi'))
    await expect(openProfileMediaObject(upload, null)).rejects.toThrow('Storage operation failed')
    const logged = log.mock.calls.flat().map(String).join(' ')
    log.mockRestore()
    expect(logged).toContain('402')
    expect(logged).not.toContain('supabase.co')
    expect(logged).not.toContain('eyJhbGciOi')
  })
  it('a real upload that is absent from storage is a 404, not a demo picture', async () => {
    read.stream.mockResolvedValue(null)
    await expect(openProfileMediaObject(upload, 800)).rejects.toMatchObject({ status: 404 })
    await expect(openProfileMediaObject(upload, 800)).rejects.toBeInstanceOf(MediaError)
  })
  it('a seed placeholder file gets its demo picture and never touches storage', async () => {
    read.stream.mockRejectedValue(new Error('storage 402'))
    const result = await openProfileMediaObject(seedFile, 800)
    expect(result.contentType).toMatch(/^image\/(webp|jpeg)$/)
    expect(result.size).toBeGreaterThan(0)
    expect(read.stream).not.toHaveBeenCalled()
  })
})
