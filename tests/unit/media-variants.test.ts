// Step 2A image delivery (human request 2026-11-20): WebP display variants 400/800/1600 px wide, quality ~72, no
// metadata, never enlarged, stored next to the original under a fixed key; the media route's ?w parameter.
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { VARIANT_WIDTHS, WEBP_QUALITY, isVariantKey, makeVariants, parseVariantWidth, variantKey } from '../../scripts/storage/media-variants.mjs'
import { validObjectKey } from '@/lib/storage/object-store'

const FILE = '0c22e70d-91d7-5347-8c9a-74fa00558912'

describe('variant keys', () => {
  it('uses prf-media/<file_id>.w<width>.webp for the three widths only', () => {
    expect(VARIANT_WIDTHS).toEqual([400, 800, 1600])
    expect(VARIANT_WIDTHS.map(width => variantKey(FILE, width))).toEqual([
      `prf-media/${FILE}.w400.webp`, `prf-media/${FILE}.w800.webp`, `prf-media/${FILE}.w1600.webp`])
    expect(() => variantKey(FILE, 500)).toThrow()
    expect(() => variantKey('../x', 400)).toThrow()
    expect(isVariantKey(`prf-media/${FILE}.w800.webp`)).toBe(true)
    expect(isVariantKey(`prf-media/${FILE}`)).toBe(false)
  })
  it('is accepted by the object store key check, while other suffixes stay refused', () => {
    expect(validObjectKey(`prf-media/${FILE}.w400.webp`)).toBe(`prf-media/${FILE}.w400.webp`)
    expect(() => validObjectKey(`prf-media/${FILE}.w500.webp`)).toThrow()
    expect(() => validObjectKey(`registration-documents/${FILE}.w400.webp`)).toThrow()
  })
})

describe('parseVariantWidth (?w=)', () => {
  it('accepts exactly 400, 800 and 1600; any other value becomes 800; no value means the original', () => {
    expect(parseVariantWidth('400')).toBe(400)
    expect(parseVariantWidth('800')).toBe(800)
    expect(parseVariantWidth('1600')).toBe(1600)
    for (const other of ['', '0', '401', '1200', 'abc', '400px', '-400', '1600.0']) expect(parseVariantWidth(other)).toBe(800)
    expect(parseVariantWidth(null)).toBeNull()
    expect(parseVariantWidth(undefined)).toBeNull()
  })
})

describe('makeVariants (sharp)', () => {
  it('writes WebP at 400/800/1600 px wide, keeps the ratio, never enlarges and drops metadata', async () => {
    const input = await sharp({ create: { width: 1280, height: 1920, channels: 3, background: '#557744' } })
      .withMetadata({ exif: { IFD0: { Artist: 'someone' } } }).jpeg().toBuffer()
    const variants = await makeVariants(input)
    expect(variants.map(variant => [variant.width, variant.outputWidth, variant.outputHeight])).toEqual([[400, 400, 600], [800, 800, 1200], [1600, 1280, 1920]])
    for (const variant of variants) {
      const meta = await sharp(variant.bytes).metadata()
      expect(meta.format).toBe('webp')
      expect(meta.exif).toBeUndefined()
      expect(meta.icc).toBeUndefined()
      expect(variant.bytes.length).toBe(variant.bytes.byteLength)
    }
    expect(WEBP_QUALITY).toBe(72)
  })
  it('turns by EXIF orientation before resizing', async () => {
    const input = await sharp({ create: { width: 1600, height: 1000, channels: 3, background: '#000' } }).withMetadata({ orientation: 6 }).jpeg().toBuffer()
    const [small] = await makeVariants(input)
    expect([small.outputWidth, small.outputHeight]).toEqual([400, 640])
  })
})
