import { describe, expect, it } from 'vitest'
import { imageRef } from '@/lib/prf/media-urls'
import { loadExploreSeed } from '@/lib/explore/seed-repository'
import { cardImage, listableRows, villageImage, villageTiles } from '@/lib/explore/v3-home'
import { villageView } from '@/lib/explore/v3-village'
import { providerView } from '@/lib/explore/v3-provider'
import { eligibleRows } from '@/lib/explore/catalog'
import { openProfileMediaObject } from '@/lib/prf/media-store'
import type { MediaFacts } from '@/lib/prf/media-access'

const BAT_TRANG_VILLAGE_ID = '20896522-6235-5699-aeaf-f48b8150d895'
const BAT_TRANG_PROVIDER_ID = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const BAT_TRANG_EXP_ID = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const BAT_TRANG_FILE_ID = '6f899cb2-eead-50bc-9dd9-aa96fc36b82b'

describe('Regression test for D2-D4 and D27: seed/ images and storage resilience', () => {
  it('imageRef recognizes seed/ storage_key when file_id is present', () => {
    const seedFile = {
      file_id: BAT_TRANG_FILE_ID,
      storage_key: `seed/2026/09/${BAT_TRANG_FILE_ID}.jpg`,
      file_size_bytes: '1400000',
      width_px: '1920',
      height_px: '1080',
    }
    const ref = imageRef(seedFile)
    expect(ref).not.toBeNull()
    expect(ref?.url).toContain(`/api/prf/media/${BAT_TRANG_FILE_ID}`)
  })

  it('D2: Bát Tràng experience in seed catalog has a card image and is in listableRows', () => {
    const seed = loadExploreSeed()
    const rows = eligibleRows(seed)
    const btRow = rows.find(r => r.experience.experience_id === BAT_TRANG_EXP_ID)
    expect(btRow).toBeDefined()
    const img = cardImage(seed, btRow!)
    expect(img).not.toBeNull()

    const listable = listableRows(seed)
    const inListable = listable.some(r => r.experience.experience_id === BAT_TRANG_EXP_ID)
    expect(inListable).toBe(true)
  })

  it('D3: Bát Tràng village has a village image and villageView has images', () => {
    const seed = loadExploreSeed()
    const img = villageImage(seed, BAT_TRANG_VILLAGE_ID)
    expect(img).not.toBeNull()

    const view = villageView(seed, BAT_TRANG_VILLAGE_ID, { kind: 'guest' }, { date: '', guests: null, ex: '' })
    expect(view).not.toBeNull()
    expect(view?.images.length).toBeGreaterThan(0)
  })

  it('D4: villageTiles includes Bát Tràng in the home grid', () => {
    const seed = loadExploreSeed()
    const tiles = villageTiles(seed)
    const btTile = tiles.find(t => t.village_id === BAT_TRANG_VILLAGE_ID)
    expect(btTile).toBeDefined()
    expect(btTile?.image).not.toBeNull()
  })

  it('D27: providerView for Bát Tràng workshop has images in gallery', () => {
    const seed = loadExploreSeed()
    const view = providerView(seed, BAT_TRANG_PROVIDER_ID, { kind: 'guest' }, new Date(), true)
    expect(view).not.toBeNull()
    expect(view?.images.length).toBeGreaterThan(0)
  })

  it('openProfileMediaObject safely resolves fallback for seed/ file without throwing 500 error', async () => {
    const factsFile: MediaFacts['file'] = {
      file_id: BAT_TRANG_FILE_ID,
      storage_key: `seed/2026/09/${BAT_TRANG_FILE_ID}.jpg`,
      file_name: 'synthetic-bat-trang.jpg',
      media_type: 'image/jpeg',
      file_size_bytes: '1400000',
      uploaded_by: null,
    }
    const result = await openProfileMediaObject(factsFile, 800)
    expect(result).toBeDefined()
    expect(result.body).toBeDefined()
    expect(result.contentType).toMatch(/image\/(jpeg|webp)/)
  })

  it('GET /api/prf/media/[fileId] route returns 200 with fallback image for seed file', async () => {
    const { GET } = await import('@/app/api/prf/media/[fileId]/route')
    const req = new Request(`http://localhost/api/prf/media/${BAT_TRANG_FILE_ID}?w=800&v=1400000`)
    const res = await GET(req, { params: { fileId: BAT_TRANG_FILE_ID } })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toMatch(/image\/(jpeg|webp)/)
    const arrayBuffer = await res.arrayBuffer()
    expect(arrayBuffer.byteLength).toBeGreaterThan(0)
  })
})
