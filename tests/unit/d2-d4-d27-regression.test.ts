/**
 * Regression test for bug group D2-D4 and D27:
 * Verifies that images actually load and display across all 4 key positions:
 * 1. Search results card (D2)
 * 2. Bát Tràng village page cover and gallery (D3)
 * 3. Bát Tràng village tile on explore home page (D4)
 * 4. Workshop profile gallery (D27)
 * And verifies that GET /api/prf/media/[fileId] returns 200 with image bytes,
 * never failing with 500 when storage is offline or seed files are requested.
 */
import { describe, expect, it } from 'vitest'
import { imageRef } from '@/lib/prf/media-urls'
import { loadExploreSeed } from '@/lib/explore/seed-repository'
import { cardImage, listableRows, villageImage, villageTiles } from '@/lib/explore/v3-home'
import { villageView } from '@/lib/explore/v3-village'
import { providerView } from '@/lib/explore/v3-provider'
import { eligibleRows } from '@/lib/explore/catalog'
import { openProfileMediaObject } from '@/lib/prf/media-store'
import type { MediaFacts } from '@/lib/prf/media-access'
import { GET } from '@/app/api/prf/media/[fileId]/route'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import ResultCard from '@/app/explore/v3/ResultCard'
import VillageGrid from '@/app/explore/v3/VillageGrid'
import Gallery from '@/app/explore/v3/Gallery'
import CoverImage from '@/app/explore/v3/CoverImage'
import { resultView } from '@/lib/explore/v3-search'

const BAT_TRANG_VILLAGE_ID = '20896522-6235-5699-aeaf-f48b8150d895'
const BAT_TRANG_PROVIDER_ID = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const BAT_TRANG_EXP_ID = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const BAT_TRANG_FILE_ID = '6f899cb2-eead-50bc-9dd9-aa96fc36b82b'

describe('Regression test for D2-D4 and D27: image loading and display across 4 locations', () => {
  it('imageRef: recognizes seed files with a file_id so they get an API URL', () => {
    const seedFile = {
      file_id: BAT_TRANG_FILE_ID,
      storage_key: `seed/2026/09/${BAT_TRANG_FILE_ID}.jpg`,
      file_size_bytes: '76499',
      width_px: '1280',
      height_px: '960',
    }
    const ref = imageRef(seedFile)
    expect(ref).not.toBeNull()
    expect(ref?.url).toContain(`/api/prf/media/${BAT_TRANG_FILE_ID}`)
  })

  it('Location 1 (D2): Bát Tràng experience has a card image and is listed in listableRows', () => {
    const seed = loadExploreSeed()
    const rows = eligibleRows(seed)
    const btRow = rows.find(r => r.experience.experience_id === BAT_TRANG_EXP_ID)
    expect(btRow).toBeDefined()
    const img = cardImage(seed, btRow!)
    expect(img).not.toBeNull()
    expect(img?.url).toContain('/api/prf/media/')

    const listable = listableRows(seed)
    const inListable = listable.some(r => r.experience.experience_id === BAT_TRANG_EXP_ID)
    expect(inListable).toBe(true)
  })

  it('Location 2 (D3): Bát Tràng village has a cover image and villageView has images', () => {
    const seed = loadExploreSeed()
    const img = villageImage(seed, BAT_TRANG_VILLAGE_ID)
    expect(img).not.toBeNull()
    expect(img?.url).toContain('/api/prf/media/')

    const view = villageView(seed, BAT_TRANG_VILLAGE_ID, { kind: 'guest' }, { date: '', guests: null, ex: '' })
    expect(view).not.toBeNull()
    expect(view?.images.length).toBeGreaterThan(0)
    expect(view?.images[0].url).toContain('/api/prf/media/')
  })

  it('Location 3 (D4): villageTiles includes Bát Tràng in the home grid with its image', () => {
    const seed = loadExploreSeed()
    const tiles = villageTiles(seed)
    const btTile = tiles.find(t => t.village_id === BAT_TRANG_VILLAGE_ID)
    expect(btTile).toBeDefined()
    expect(btTile?.image).not.toBeNull()
    expect(btTile?.image.url).toContain('/api/prf/media/')
  })

  it('Location 4 (D27): providerView for Bát Tràng workshop has images in its gallery', () => {
    const seed = loadExploreSeed()
    const view = providerView(seed, BAT_TRANG_PROVIDER_ID, { kind: 'guest' }, new Date(), true)
    expect(view).not.toBeNull()
    expect(view?.images.length).toBeGreaterThan(0)
    expect(view?.images[0].url).toContain('/api/prf/media/')
  })

  it('Media API: openProfileMediaObject resolves image stream for seed file without throwing error', async () => {
    const factsFile: MediaFacts['file'] = {
      file_id: BAT_TRANG_FILE_ID,
      storage_key: `seed/2026/09/${BAT_TRANG_FILE_ID}.jpg`,
      file_name: 'synthetic-bat-trang.jpg',
      media_type: 'image/jpeg',
      file_size_bytes: '76499',
      uploaded_by: null,
    }
    const result = await openProfileMediaObject(factsFile, 800)
    expect(result).toBeDefined()
    expect(result.body).toBeDefined()
    expect(result.contentType).toMatch(/image\/(jpeg|webp)/)
  })

  it('Media API: GET /api/prf/media/[fileId] returns 200 with image bytes for Bát Tràng file', async () => {
    const req = new Request(`http://localhost/api/prf/media/${BAT_TRANG_FILE_ID}?w=800&v=76499`)
    const res = await GET(req, { params: { fileId: BAT_TRANG_FILE_ID } })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toMatch(/image\/(jpeg|webp)/)
    const arrayBuffer = await res.arrayBuffer()
    expect(arrayBuffer.byteLength).toBeGreaterThan(0)
  })

  it('UI Component Rendering: confirms <img> elements are present for all 4 locations', () => {
    const seed = loadExploreSeed()
    // 1. Search Result Card (D2)
    const rows = eligibleRows(seed)
    const btRow = rows.find(r => r.experience.experience_id === BAT_TRANG_EXP_ID)!
    const resItem = resultView(seed, btRow, { date: '', guests: null }, false)
    const resHtml = renderToStaticMarkup(React.createElement(ResultCard, { item: resItem as never, query: {} }))
    expect(resHtml).toContain('v3r__media')
    expect(resHtml).toContain('/api/prf/media/')

    // 2. Village cover & gallery (D3)
    const vView = villageView(seed, BAT_TRANG_VILLAGE_ID, { kind: 'guest' }, { date: '', guests: null, ex: '' })!
    const vHtml = renderToStaticMarkup(React.createElement(Gallery, { images: vView.images, alt: vView.name }))
    expect(vHtml).toContain('<img')
    expect(vHtml).toContain('/api/prf/media/')

    // 3. Home Explore Grid (D4)
    const tiles = villageTiles(seed)
    const gridHtml = renderToStaticMarkup(React.createElement(VillageGrid, { tiles }))
    expect(gridHtml).toContain('Bát Tràng')
    expect(gridHtml).toContain('/api/prf/media/')

    // 4. Workshop Gallery (D27)
    const pView = providerView(seed, BAT_TRANG_PROVIDER_ID, { kind: 'guest' }, new Date(), true)!
    const pGalleryHtml = renderToStaticMarkup(React.createElement(Gallery, { images: pView.images, alt: 'Xưởng' }))
    expect(pGalleryHtml).toContain('<img')
    expect(pGalleryHtml).toContain('/api/prf/media/')
  })

  it('All eligible villages on /villages have valid images that resolve via Media API (200 OK)', async () => {
    const seed = loadExploreSeed()
    const { villageCards } = await import('@/lib/explore/v3-village')
    const cards = villageCards(seed)
    expect(cards.length).toBeGreaterThanOrEqual(5)
    for (const card of cards) {
      expect(card.image).not.toBeNull()
      expect(card.image.url).toMatch(/^\/api\/prf\/media\/[0-9a-f-]{36}/)
      const fileId = card.image.url.split('/')[4].split('?')[0]
      const req = new Request(`http://localhost${card.image.url}`)
      const res = await GET(req, { params: { fileId } })
      expect(res.status).toBe(200)
      expect(res.headers.get('Content-Type')).toMatch(/image\/(jpeg|webp)/)
      const buffer = await res.arrayBuffer()
      expect(buffer.byteLength).toBeGreaterThan(0)
    }
  })

  it('All 32 seed image files resolve via openProfileMediaObject (stream with bytes)', async () => {
    const seed = loadExploreSeed()
    const imageFiles = seed.stored_files.filter(f => f.media_type.startsWith('image/') && !f.file_name.includes('chatfile'))
    expect(imageFiles.length).toBe(32)
    for (const f of imageFiles) {
      const factsFile: MediaFacts['file'] = {
        file_id: f.file_id,
        storage_key: f.storage_key,
        file_name: f.file_name,
        media_type: f.media_type,
        file_size_bytes: f.file_size_bytes,
        uploaded_by: null,
      }
      const result = await openProfileMediaObject(factsFile, 800)
      expect(result, `Failed to open file ${f.file_id} (${f.file_name})`).toBeDefined()
      expect(result.body).toBeDefined()
      expect(result.contentType).toMatch(/image\/(jpeg|webp)/)
    }
  })

  it('All verified providers have images in providerView that resolve via Media API (200 OK)', async () => {
    const seed = loadExploreSeed()
    const verifiedProviders = seed.provider_profiles.filter(p => p.verification_status === 'Verified')
    expect(verifiedProviders.length).toBeGreaterThan(0)
    for (const p of verifiedProviders) {
      const view = providerView(seed, p.provider_id, { kind: 'guest' }, new Date(), true)
      if (!view) continue
      expect(view.images.length).toBeGreaterThan(0)
      for (const img of view.images) {
        expect(img.url).toMatch(/^\/api\/prf\/media\/[0-9a-f-]{36}/)
        const fileId = img.url.split('/')[4].split('?')[0]
        const req = new Request(`http://localhost${img.url}`)
        const res = await GET(req, { params: { fileId } })
        expect(res.status, `Failed for provider ${p.provider_id} image ${fileId}`).toBe(200)
        expect(res.headers.get('Content-Type')).toMatch(/image\/(jpeg|webp)/)
      }
    }
  })
})
