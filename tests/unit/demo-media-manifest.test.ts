/**
 * assets/demo-media (human request 2026-11-19): the six CC BY-SA catalog photos are replaced by Pexels / Pixabay photos;
 * embroidery.jpg and lacquer.jpg (CC0) stay. Every manifest row must match its file exactly (bytes, width, height), as
 * scripts/storage/bootstrap-catalog.mjs requires, and only licences without attribution-share-alike terms remain.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { imageSize } from 'image-size'

type Photo = { slug: string; file: string; bytes: number; width: number; height: number; license: string; license_url: string; source: string; author: string; title: string }
const manifest = JSON.parse(readFileSync('assets/demo-media/manifest.json', 'utf8')) as Photo[]

describe('demo media manifest', () => {
  it('keeps the eight slugs and file names', () => {
    expect(manifest.map(photo => `${photo.slug}:${photo.file}`).sort()).toEqual([
      'bamboo:bamboo.jpg', 'ceramics:ceramics.jpg', 'conical-hats:conical-hats.jpg', 'embroidery:embroidery.jpg',
      'lacquer:lacquer.jpg', 'silk:silk.jpg', 'water-puppets:water-puppets.jpg', 'wood-carving:wood-carving.jpg'])
  })
  it.each(manifest.map(photo => [photo.slug, photo] as const))('%s matches its file and has its source and licence', (_slug, photo) => {
    const bytes = readFileSync(join('assets/demo-media', photo.file))
    const size = imageSize(bytes)
    expect({ bytes: bytes.length, width: size.width, height: size.height }).toEqual({ bytes: photo.bytes, width: photo.width, height: photo.height })
    expect(photo.width).toBeGreaterThanOrEqual(1280)
    expect(photo.height).toBeGreaterThanOrEqual(720)
    expect(photo.source).toMatch(/^https:\/\/(www\.pexels\.com|pixabay\.com|commons\.wikimedia\.org)\//)
    expect(photo.author.trim()).not.toBe('')
  })
  it('has no CC BY / CC BY-SA photo left (only Pexels, Pixabay or CC0)', () => {
    expect(manifest.map(photo => photo.license).filter(license => !['Pexels License', 'Pixabay Content License', 'CC0'].includes(license))).toEqual([])
  })
})
