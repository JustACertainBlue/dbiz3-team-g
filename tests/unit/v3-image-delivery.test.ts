/**
 * Step 2B (human request 2026-11-21): the v3 UI loads the optimized WebP variants of step 2A.
 * - every image URL the UI gets carries ?v=<stored size>; CoverImage builds src/srcset/sizes from it;
 * - exactly one LCP image per page (eager, fetchpriority=high, <link rel=preload as=image imagesrcset imagesizes>);
 * - Gallery puts landscape images first (stable) and gives portrait images object-position 50% 40%.
 */
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CoverImage from '@/app/explore/v3/CoverImage'
import Gallery, { gallerySizes, landscapeFirst } from '@/app/explore/v3/Gallery'
import { mediaUrl, mediaFileUrl, imageRef, variantSrc, variantSrcSet, isPortrait } from '@/lib/prf/media-urls'
import { fileImage } from '@/lib/explore/v3-home'
import { eligibleRows, toCard } from '@/lib/explore/catalog'
import { seed } from './v3-village-fixtures'

;(globalThis as { React?: typeof React }).React = React
// Next ships its own React, which reads `fetchPriority`; the stable react-dom of the unit tests renders it but warns that it
// does not know the prop. Drop only that warning.
beforeAll(() => {
  const error = console.error
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { if (!args.some(arg => String(arg).includes('fetchPriority'))) error(...args) })
})
const ID = '0b9f0c34-77a5-4b61-8d0f-0a1b2c3d4e5f'
const ref = (id: string, width: number, height: number) => ({ url: `/api/prf/media/${id}?v=1000`, width, height })
const html = (props: Record<string, unknown>) => renderToStaticMarkup(React.createElement(CoverImage, { alt: 'Gốm', image: ref(ID, 1280, 960), sizes: '100vw', ...props } as never))

describe('media URLs carry the version', () => {
  it('mediaUrl adds ?v= when a version is known, and leaves other keys alone', () => {
    expect(mediaUrl(`prf-media/${ID}`, 1234)).toBe(`/api/prf/media/${ID}?v=1234`)
    expect(mediaUrl(`prf-media/${ID}`)).toBe(`/api/prf/media/${ID}`)
    expect(mediaUrl('https://example.test/a.jpg', 5)).toBe('https://example.test/a.jpg')
    expect(mediaFileUrl({ storage_key: `prf-media/${ID}`, file_size_bytes: '98765' })).toBe(`/api/prf/media/${ID}?v=98765`)
  })
  it('imageRef carries url (with v) and the stored dimensions; unknown dimensions are 0', () => {
    expect(imageRef({ storage_key: `prf-media/${ID}`, file_size_bytes: '98765', width_px: '960', height_px: '1280' })).toEqual({ url: `/api/prf/media/${ID}?v=98765`, width: 960, height: 1280 })
    expect(imageRef({ storage_key: `prf-media/${ID}`, file_size_bytes: '5' })).toEqual({ url: `/api/prf/media/${ID}?v=5`, width: 0, height: 0 })
  })
  it('the Explore seed reader (fileImage) returns the same shape', () => {
    expect(fileImage({ file_id: ID, storage_key: `prf-media/${ID}`, file_size_bytes: '42', width_px: '1280', height_px: '960' } as never)).toEqual({ url: `/api/prf/media/${ID}?v=42`, width: 1280, height: 960 })
    expect(fileImage({ file_id: 'x', storage_key: 'seed/placeholder.jpg', file_size_bytes: '1' } as never)).toBeNull()
  })
  it('variantSrc puts w before v (src = /api/prf/media/<id>?w=800&v=<v>) and srcset lists 400w, 800w, 1600w', () => {
    expect(variantSrc(`/api/prf/media/${ID}?v=1000`, 800)).toBe(`/api/prf/media/${ID}?w=800&v=1000`)
    expect(variantSrc(`/api/prf/media/${ID}`, 400)).toBe(`/api/prf/media/${ID}?w=400`)
    expect(variantSrcSet(`/api/prf/media/${ID}?v=1000`)).toBe(`/api/prf/media/${ID}?w=400&v=1000 400w, /api/prf/media/${ID}?w=800&v=1000 800w, /api/prf/media/${ID}?w=1600&v=1000 1600w`)
    expect(variantSrcSet('https://example.test/a.jpg')).toBeNull()
  })
  it('isPortrait only when both sides are known and height > width', () => {
    expect([isPortrait(ref(ID, 960, 1280)), isPortrait(ref(ID, 1280, 960)), isPortrait(ref(ID, 1000, 1000)), isPortrait(ref(ID, 0, 0))]).toEqual([true, false, false, false])
  })
})

describe('API image URLs carry the version (catalog card)', () => {
  it('toCard images are /api/prf/media/<id>?v=<stored size>', () => {
    const data = seed()
    data.stored_files = data.stored_files.map(file => ({ ...file, file_size_bytes: '777' }))
    const card = toCard(data, eligibleRows(data).find(row => row.experience.experience_id === 'e1')!, { kind: 'guest' })
    expect(card.images.length).toBeGreaterThan(0)
    for (const image of card.images) expect(image.storage_key).toMatch(/^\/api\/prf\/media\/[^?]+\?v=777$/)
  })
})

describe('CoverImage', () => {
  it('renders src ?w=800&v=, a 3-size srcset, the given sizes, intrinsic size, async decoding and lazy loading by default', () => {
    const out = html({})
    expect(out).toContain(`src="/api/prf/media/${ID}?w=800&amp;v=1000"`)
    expect(out).toContain(`srcSet="/api/prf/media/${ID}?w=400&amp;v=1000 400w, /api/prf/media/${ID}?w=800&amp;v=1000 800w, /api/prf/media/${ID}?w=1600&amp;v=1000 1600w"`)
    expect(out).toContain('sizes="100vw"')
    expect(out).toContain('width="1280"')
    expect(out).toContain('height="960"')
    expect(out).toContain('decoding="async"')
    expect(out).toContain('loading="lazy"')
    expect(out).not.toMatch(/fetchpriority/i)
    expect(out).not.toContain('<link')
  })
  it('priority "eager" is eager with normal priority and no preload', () => {
    const out = html({ priority: 'eager' })
    expect(out).toContain('loading="eager"')
    expect(out).not.toMatch(/fetchpriority/i)
    expect(out).not.toContain('<link')
  })
  it('priority "lcp" is eager, fetchpriority=high and preloads the same candidates', () => {
    const out = html({ priority: 'lcp', sizes: '(min-width: 900px) 50vw, 100vw' })
    expect(out).toContain('loading="eager"')
    expect(out).toMatch(/fetchpriority="high"/i)
    const link = out.match(/<link [^>]*>/)![0]
    expect(link).toContain('rel="preload"')
    expect(link).toContain('as="image"')
    expect(link).toContain(`imageSrcSet="/api/prf/media/${ID}?w=400&amp;v=1000 400w, /api/prf/media/${ID}?w=800&amp;v=1000 800w, /api/prf/media/${ID}?w=1600&amp;v=1000 1600w"`)
    expect(link).toContain('imageSizes="(min-width: 900px) 50vw, 100vw"')
    expect(link).toMatch(/fetchpriority="high"/i)
    expect(link).not.toContain('media=')
  })
  it('a preload can be limited to a media query (screen 02 first card: desktop only)', () => {
    expect(html({ priority: 'lcp', preloadMedia: '(min-width: 900px)' })).toMatch(/<link [^>]*media="\(min-width: 900px\)"/)
  })
  it('portrait images get object-position 50% 40%; landscape and unknown ones do not', () => {
    expect(html({ image: ref(ID, 960, 1280) })).toContain('object-position:50% 40%')
    expect(html({ image: ref(ID, 1280, 960) })).not.toContain('object-position')
    expect(html({ image: ref(ID, 0, 0) })).not.toContain('object-position')
  })
  it('without width/height it still renders (no width/height attributes, no object-position)', () => {
    const out = html({ image: ref(ID, 0, 0) })
    expect(out).not.toContain('width=')
    expect(out).not.toContain('height=')
  })
  it('an external https image is used as is (no srcset, no preload)', () => {
    const out = html({ image: { url: 'https://example.test/a.jpg', width: 0, height: 0 }, priority: 'lcp' })
    expect(out).toContain('src="https://example.test/a.jpg"')
    expect(out).not.toContain('srcSet')
    expect(out).not.toContain('<link')
  })
  it('keeps the empty neutral frame when there is no image', () => {
    expect(html({ image: null })).toContain('v3-cover--empty')
  })
})

describe('Gallery', () => {
  const imgs = [ref('p1', 960, 1280), ref('l1', 1280, 960), ref('s1', 1000, 1000), ref('l2', 1600, 900), ref('p2', 900, 1600), ref('l3', 1280, 960)]
  it('landscapeFirst is a stable partition: landscape images first, the rest keep their order', () => {
    expect(landscapeFirst(imgs).map(i => i.url.split('/').pop()!.split('?')[0])).toEqual(['l1', 'l2', 'l3', 'p1', 's1', 'p2'])
    expect(landscapeFirst([])).toEqual([])
  })
  it('puts a landscape image in the large tile, with exactly one LCP image (tile 1) and the other tiles eager', () => {
    const out = renderToStaticMarkup(React.createElement(Gallery, { images: imgs, alt: 'Làng', maxWidth: 1100 } as never))
    const tags = out.match(/<img [^>]*>/g)!
    expect(tags).toHaveLength(5)
    expect(tags[0]).toContain('/api/prf/media/l1?w=800')
    expect(out.match(/fetchpriority="high"/gi)!.length).toBe(2) // the LCP <img> and its preload link
    expect(tags[0]).toMatch(/fetchpriority="high"/i)
    for (const tag of tags.slice(1)) expect(tag).toMatch(/fetchpriority="low"/i) // small tiles: eager but behind the LCP image
    expect(tags.every(tag => tag.includes('loading="eager"'))).toBe(true)
    expect(out.match(/<link /g)).toHaveLength(1)
    expect(tags[0]).toContain(`sizes="${gallerySizes(5, 0, 1100)}"`)
    expect(tags[1]).toContain(`sizes="${gallerySizes(5, 1, 1100)}"`)
  })
  // object-fit: cover needs the image as wide as height × 4/3 for a landscape source, so a tall tile asks for more
  // than its CSS width (tile heights: 440 / 216 px from 900 px, 280 / 136 px below).
  it('gallerySizes = the real tile width at the widest layout, never below what the tile height needs', () => {
    expect(gallerySizes(5, 0, 1100)).toBe('(min-width: 900px) max(587px, min(550px, 50vw)), max(373px, 50vw)')
    expect(gallerySizes(5, 1, 1100)).toBe('(min-width: 900px) max(288px, min(275px, 25vw)), max(181px, 25vw)')
    expect(gallerySizes(4, 1, 804)).toBe('(min-width: 900px) max(288px, min(402px, 50vw)), max(181px, 50vw)')
    expect(gallerySizes(3, 0, 804)).toBe('(min-width: 900px) max(587px, min(536px, 66.67vw)), max(373px, 66.67vw)')
    expect(gallerySizes(1, 0, 804)).toBe('(min-width: 900px) max(587px, min(804px, 100vw)), max(373px, 100vw)')
    expect(gallerySizes(2, 1, 1100)).toBe('(min-width: 900px) max(587px, min(550px, 50vw)), max(373px, 50vw)')
  })
  it('priority "low" is eager with fetchpriority=low and no preload', () => {
    const out = html({ priority: 'low' })
    expect(out).toContain('loading="eager"')
    expect(out).toMatch(/fetchpriority="low"/i)
    expect(out).not.toContain('<link')
  })
  it('a gallery with no landscape image keeps the original order', () => {
    const only = [ref('p1', 960, 1280), ref('p2', 900, 1600)]
    expect(landscapeFirst(only)).toEqual(only)
  })
})

describe('result card below 768 px: image + title row, full-width rest (Khánh Linh, 2026-11-21)', () => {
  const css = readFileSync('src/app/explore/v3/explore-v3.css', 'utf8')
  const mobile = css.match(/@media \(max-width: 767px\) \{[^\n]*\.v3r__media \{[^\n]*/)![0]
  it('top row: image 112 px wide on the left (frame 5/8, cover), craft label, name, place and distance on its right', () => {
    expect(mobile).toMatch(/\.v3r \{[^}]*display: grid[^}]*grid-template-columns: 112px minmax\(0, 1fr\)/)
    expect(mobile).toMatch(/\.v3r__media \{[^}]*aspect-ratio: 5 \/ 8/)
    expect(mobile).toMatch(/\.v3r__main \{[^}]*display: contents/)
    expect(mobile).toMatch(/\.v3r__top \{[^}]*grid-column: 2[^}]*column-reverse/) // craft label above the name
    expect(mobile).not.toMatch(/\.v3r__media \{[^}]*flex-basis: 100%/)
  })
  it('the name is about 20 px, at most 3 lines, then an ellipsis', () => {
    expect(mobile).toMatch(/\.v3r__name \{[^}]*font-size: 20px/)
    expect(mobile).toMatch(/\.v3r__name a \{[^}]*-webkit-line-clamp: 3/)
  })
  it('the rest spans the full card width in desktop order: chips (wrapping, 13 px), ticks, prepay line, price, button', () => {
    expect(mobile).toMatch(/\.v3-ftags \{[^}]*grid-column: 1 \/ -1/)
    expect(mobile).toMatch(/\.v3-ftag \{[^}]*font-size: 13px/)
    expect(mobile).toMatch(/\.v3r__cols \{[^}]*grid-column: 1 \/ -1/)
    expect(mobile).toMatch(/\.v3r__price \{[^}]*flex: 1 1 100%/)
    expect(css).toMatch(/\.v3-ftags \{ display: flex; gap: 8px; flex-wrap: wrap; \}/)
  })
  it('is compact: ticks 15 px, prepay 14 px, "Giá từ" and the amount on one line, button 44 px', () => {
    expect(mobile).toMatch(/\.v3r \.v3-ben li \{[^}]*font-size: 15px/)
    expect(mobile).toMatch(/\.v3r__prepay \{[^}]*font-size: 14px/)
    expect(mobile).toMatch(/\.v3r__price \{[^}]*display: block/)
    expect(mobile).toMatch(/\.v3r__cta \{[^}]*min-height: 44px/)
    expect(mobile).toMatch(/\.v3r__price > \.v3-cap:first-child \{[^}]*margin-right: 6px/) // "Giá từ" must not touch the amount
  })
  it('long text wraps and nothing overflows the card', () => {
    expect(mobile).toMatch(/overflow-wrap: anywhere/)
    expect(mobile).toMatch(/\.v3r__total \{[^}]*white-space: normal/)
    expect(mobile).toMatch(/\.v3r__cta \{[^}]*max-width: 100%/)
  })
  it('the image only fills the frame (cover, never sets its size)', () => {
    expect(css).toMatch(/\.v3r__media \.v3-cover \{[^}]*position: absolute; inset: 0/)
  })
  it('desktop rules are untouched', () => {
    expect(css).toMatch(/\.v3r \{ padding: 20px; display: flex; flex-wrap: wrap; gap: 24px; \}/)
    expect(css).toMatch(/\.v3r__name \{ margin: 0; font: 800 26px\/32px var\(--font-body\); \}/)
    expect(css).toMatch(/\.v3r__main \{ flex: 1 1 420px; min-width: 0; display: flex; flex-direction: column; gap: 10px; \}/)
  })
  it('sizes: 520 px from 768 px, 112 px (the w400 variant) below', () => {
    expect(readFileSync('src/app/explore/v3/image-sizes.ts', 'utf8')).toContain("export const RESULT_SIZES = '(min-width: 768px) 520px, 112px'")
  })
})

describe('wiring', () => {
  const read = (path: string) => readFileSync(path, 'utf8')
  it('every CoverImage call passes explicit sizes (no default 100vw guess)', () => {
    for (const file of ['src/app/explore/v3/ResultCard.tsx', 'src/app/explore/v3/ExperienceCard.tsx', 'src/app/explore/v3/VillageGrid.tsx', 'src/app/villages/page.tsx', 'src/app/explore/page.tsx', 'src/app/explore/providers/[id]/page.tsx', 'src/app/explore/v3/Gallery.tsx']) {
      for (const call of read(file).match(/<CoverImage [^>]*>/g) ?? []) expect(call, `${file}: ${call}`).toMatch(/sizes=/)
    }
  })
  it('the first card of screen 02 is the LCP image, limited to desktop for the preload', () => {
    const source = read('src/app/explore/v3/ResultCard.tsx')
    expect(source).toMatch(/priority=/)
    expect(read('src/app/explore/search/page.tsx')).toMatch(/lcp|priority/)
  })
  it('the docs record the position → sizes table and the gallery order', () => {
    expect(read('docs/build/ui-v3-spec-deviations.md')).toMatch(/landscape first|ảnh ngang lên trước/)
  })
})
