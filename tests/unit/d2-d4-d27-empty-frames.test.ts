/**
 * D2-D4 / D27 (redo of PR #285): public screens never draw an empty image frame.
 * Chain (human decisions 2026-11-18 #7, 2026-11-19, 2026-11-21): the experience's own image, else the village cover,
 * else nothing: the image slot (card media, village tile, gallery) is not rendered at all. Keys `seed/...` are not images.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CoverImage from '@/app/explore/v3/CoverImage'
import { pickImage } from '@/app/explore/v3/cover-chain'
import ExperienceCard from '@/app/explore/v3/ExperienceCard'
import ResultCard from '@/app/explore/v3/ResultCard'
import VillageGrid from '@/app/explore/v3/VillageGrid'
import Gallery from '@/app/explore/v3/Gallery'
import { imageRef } from '@/lib/prf/media-urls'
import { loadExploreSeed } from '@/lib/explore/seed-repository'
import { eligibleRows } from '@/lib/explore/catalog'
import { cardView } from '@/lib/explore/v3-home'
import { resultView } from '@/lib/explore/v3-search'

;(globalThis as { React?: typeof React }).React = React
const html = (el: React.ReactElement) => renderToStaticMarkup(el)
const img = (n: number) => ({ url: `/api/prf/media/f${n}`, width: 1280, height: 960 })
const noFrame = (out: string) => { expect(out).not.toContain('v3-cover--empty'); expect(out).not.toMatch(/<span class="v3-cover/) }

describe('pickImage: own image, then fallback, then nothing', () => {
  it('takes the first candidate that has not failed to load', () => {
    expect(pickImage([img(1), img(2)], [])).toEqual(img(1))
    expect(pickImage([img(1), img(2)], [img(1).url])).toEqual(img(2))
    expect(pickImage([null, img(2)], [])).toEqual(img(2))
    expect(pickImage([img(1), img(2)], [img(1).url, img(2).url])).toBeNull()
    expect(pickImage([null, undefined], [])).toBeNull()
  })
})

describe('CoverImage with hideEmpty', () => {
  const props = { alt: 'x', sizes: '100px' }
  it('image: shows the image', () => expect(html(React.createElement(CoverImage, { ...props, image: img(1), hideEmpty: true }))).toContain('<img'))
  it('no image, fallback (village cover): shows the fallback', () => {
    const out = html(React.createElement(CoverImage, { ...props, image: null, fallback: img(2), hideEmpty: true }))
    expect(out).toContain('f2')
    noFrame(out)
  })
  it('nothing at all: renders nothing, not an empty frame', () => expect(html(React.createElement(CoverImage, { ...props, image: null, fallback: null, hideEmpty: true }))).toBe(''))
  it('keeps the neutral frame for screens that did not opt in (owner/agency screens, human decision 2026-11-18 #7)', () => {
    expect(html(React.createElement(CoverImage, { ...props, image: null }))).toContain('v3-cover--empty')
  })
})

const card = (image: ReturnType<typeof img> | null) => ({ id: 'e1', providerId: 'p1', name: 'Làm gốm', craft: 'Gốm', location: 'Bát Tràng', meta: '90 phút', highlights: [], priceFrom: 100000, image, why: null })
describe('experience card (01/21)', () => {
  it('image: shows it', () => expect(html(React.createElement(ExperienceCard, { card: card(img(1)), showDetailLink: false }))).toContain('<img'))
  it('no image: no image frame at all, the card text stays', () => {
    const out = html(React.createElement(ExperienceCard, { card: card(null), showDetailLink: false }))
    noFrame(out)
    expect(out).not.toContain('v3-xcard__img')
    expect(out).toContain('Làm gốm')
  })
})

const result = (image: ReturnType<typeof img> | null) => ({ id: 'e1', name: 'Làm gốm', image, villageId: 'v1', villageLine: 'Bát Tràng', providerName: 'Xưởng A', distance: '', craft: 'Gốm', tags: [], highlights: [], included: false, availability: null, price: { kind: 'from' as const, perPerson: 100000 } })
describe('result card (02/03/24)', () => {
  it('image: shows it in the media column', () => expect(html(React.createElement(ResultCard, { item: result(img(1)) as never, query: {} }))).toContain('v3r__media'))
  it('no image: no media column, the card text stays', () => {
    const out = html(React.createElement(ResultCard, { item: result(null) as never, query: {} }))
    noFrame(out)
    expect(out).not.toContain('v3r__media')
    expect(out).toContain('Làm gốm')
  })
})

describe('village grid (01/21)', () => {
  const tile = (id: string, image: ReturnType<typeof img> | null) => ({ village_id: id, name: `Làng ${id}`, craft: 'Gốm', area: 'Hà Nội', providers: 2, image: image as never })
  it('a village without a servable image gets no tile', () => {
    const out = html(React.createElement(VillageGrid, { tiles: [tile('a', img(1)), tile('b', null)] }))
    expect(out).toContain('Làng a')
    expect(out).not.toContain('Làng b')
    noFrame(out)
  })
  it('no village has an image: the grid is not rendered', () => expect(html(React.createElement(VillageGrid, { tiles: [tile('a', null)] }))).toBe(''))
})

describe('gallery (03, 04/23, 24)', () => {
  it('no image: no gallery block at all', () => expect(html(React.createElement(Gallery, { images: [], alt: 'x' }))).toBe(''))
  it('one image: one tile, no empty tile', () => {
    const out = html(React.createElement(Gallery, { images: [img(1)], alt: 'x' }))
    expect((out.match(/<img /g) ?? []).length).toBe(1)
    noFrame(out)
  })
})

describe('the data chain: own image, else village cover, else nothing; seed keys are not images', () => {
  const file = (id: string) => ({ file_id: id, storage_key: `prf-media/${id}`, media_type: 'image/jpeg', file_size_bytes: '1000', width_px: '1280', height_px: '960', file_name: 'a.jpg' })
  const UUID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
  function setup() {
    const seed = structuredClone(loadExploreSeed())
    const row = eligibleRows(seed)[0]
    const villageId = row.village.village_id
    const villageExperiences = new Set(eligibleRows(seed).filter(r => r.village.village_id === villageId).map(r => r.experience.experience_id))
    seed.profile_media = seed.profile_media.filter(m => !villageExperiences.has(m.experience_id))
    const village = seed.villages.find(v => v.village_id === villageId)!
    village.cover_image_id = ''
    return { seed, row, villageId, village, experienceId: row.experience.experience_id }
  }
  it('imageRef: a seed/... placeholder key is not an image', () => {
    expect(imageRef({ storage_key: `seed/2026/09/${UUID(1)}.jpg`, file_id: UUID(1), file_size_bytes: '1', width_px: '1', height_px: '1' })).toBeNull()
  })
  it('own image: shown; the village cover is kept as the fallback if it fails to load', () => {
    const { seed, row, village, experienceId } = setup()
    seed.stored_files.push(file(UUID(10)), file(UUID(11)))
    seed.profile_media.push({ experience_id: experienceId, file_id: UUID(10), display_order: '1' } as never)
    village.cover_image_id = UUID(11)
    const view = cardView(seed, row, [])
    expect(view.image?.url).toContain(UUID(10))
    expect(view.fallbackImage?.url).toContain(UUID(11))
    expect(resultView(seed, row, { date: '', guests: null }, false).fallbackImage?.url).toContain(UUID(11))
  })
  it('no own image, village cover: the cover is shown (nothing left to fall back to)', () => {
    const { seed, row, village } = setup()
    seed.stored_files.push(file(UUID(11)))
    village.cover_image_id = UUID(11)
    const view = cardView(seed, row, [])
    expect(view.image?.url).toContain(UUID(11))
    expect(view.fallbackImage).toBeNull()
  })
  it('no own image, no cover: no image (the card is then listed without a frame; see the card tests)', () => {
    const { seed, row } = setup()
    const view = cardView(seed, row, [])
    expect(view.image).toBeNull()
    expect(view.fallbackImage).toBeNull()
  })
})

describe('layout without an image', () => {
  const css = readFileSync('src/app/explore/v3/explore-v3.css', 'utf8')
  it('the workshop hero keeps a full-width side panel when the gallery is absent, also when every tile failed to load', () => {
    expect(css).toMatch(/\.v3d-hero:not\(:has\(\.v3g\)\) \.v3d-side \{ max-width: none; \}/)
  })
  it('a media column that ends up empty is not drawn', () => expect(css).toMatch(/\.v3r__media:empty \{ display: none; \}/))
  it('the hold banner of 21 draws its picture only when there is one', () => {
    expect(readFileSync('src/app/explore/page.tsx', 'utf8')).toMatch(/\{banner\.image && <CoverImage image=\{banner\.image\}/)
  })
})

describe('an image that failed before hydration', () => {
  it('CoverImage re-checks the <img> on mount (complete with naturalWidth 0 = failed), because onError is not replayed after SSR', () => {
    const source = readFileSync('src/app/explore/v3/CoverImage.tsx', 'utf8')
    expect(source).toMatch(/el\.complete && el\.naturalWidth === 0/)
    expect(source).toMatch(/<img ref=\{ref\}/)
  })
})
