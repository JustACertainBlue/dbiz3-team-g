// Step 2A image delivery (human request 2026-11-20): WebP display variants 400/800/1600 px wide, quality ~72, no
// metadata, never enlarged, stored next to the original under a fixed key; the media route's ?w parameter.
import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { QUALITY_STEPS, VARIANT_CAPS, WIDTH_STEPS, VARIANT_WIDTHS, WEBP_QUALITY, isVariantKey, makeVariants, oversizeWidths, parseVariantWidth, variantKey } from '../../scripts/storage/media-variants.mjs'
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

describe('makeVariants (sharp)', { timeout: 20_000 }, () => {
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

describe('size caps (human request 2026-11-20, 2026-11-21)', { timeout: 20_000 }, () => {
  // random noise does not compress: it forces the quality steps
  const noise = async (width: number, height: number) => {
    const pixels = new Uint8Array(width * height * 3)
    for (let index = 0; index < pixels.length; index += 1) pixels[index] = (index * 2654435761) % 251
    return sharp(pixels, { raw: { width, height, channels: 3 } }).jpeg({ quality: 95 }).toBuffer()
  }
  it('caps each width: 400 ≤ 50 KB, 800 ≤ 120 KB, 1600 ≤ 250 KB; quality 72 → 62 → 55, never below 55 (human request 2026-11-21)', () => {
    expect(VARIANT_CAPS).toEqual({ 400: 50 * 1024, 800: 120 * 1024, 1600: 250 * 1024 })
    expect(QUALITY_STEPS).toEqual([72, 62, 55])
  })
  it('then narrows in 12.5 % steps down to 75 % of the nominal width (1600 → 1400 → 1200)', () => {
    expect(WIDTH_STEPS).toEqual([1, 0.875, 0.75])
  })
  it('keeps quality 72 when the first encoding is under the cap', async () => {
    const smooth = await sharp({ create: { width: 1600, height: 1200, channels: 3, background: '#557744' } }).jpeg().toBuffer()
    for (const variant of await makeVariants(smooth)) expect(variant).toMatchObject({ quality: 72, overCap: false })
  })
  const at = async (input: Buffer, width: number, quality: number) => (await sharp(input).resize({ width }).webp({ quality }).toBuffer()).length
  it('steps the quality down until a variant fits, and stops at the first quality that fits', async () => {
    const input = await noise(800, 600)
    const caps = { 400: await at(input, 400, 62), 800: 10 ** 9, 1600: 10 ** 9 }
    const [small] = await makeVariants(input, { caps })
    expect(small).toMatchObject({ width: 400, outputWidth: 400, quality: 62, overCap: false, narrowed: false })
    expect(small.bytes.length).toBeLessThanOrEqual(caps[400])
  })
  it('narrows the width when quality 55 at full width is still over the cap; the variant keeps its nominal width (key name)', async () => {
    const input = await noise(800, 600)
    const caps = { 400: await at(input, 350, 55), 800: 10 ** 9, 1600: 10 ** 9 }
    expect(await at(input, 400, 55)).toBeGreaterThan(caps[400])
    const [small] = await makeVariants(input, { caps })
    expect(small).toMatchObject({ width: 400, outputWidth: 350, outputHeight: 263, overCap: false, narrowed: true })
    expect(small.quality).toBeGreaterThanOrEqual(55)
    expect(variantKey(FILE, small.width)).toBe(`prf-media/${FILE}.w400.webp`)
  })
  it('keeps the 75 % width, quality 55 result and flags it when even that is over the cap', async () => {
    const [small, medium] = await makeVariants(await noise(800, 600), { caps: { 400: 1000, 800: 1000, 1600: 1000 } })
    expect(small).toMatchObject({ width: 400, outputWidth: 300, quality: 55, overCap: true, narrowed: true })
    expect(medium).toMatchObject({ width: 800, outputWidth: 600, quality: 55, overCap: true })
  })
  it('measures the steps from the nominal width even when the original is narrower (never enlarged)', async () => {
    const input = await noise(1300, 400) // 1600 and 1400 both give 1300 px: tried once
    const [, , large] = await makeVariants(input, { caps: { 400: 10 ** 9, 800: 10 ** 9, 1600: 1000 } })
    expect(large).toMatchObject({ width: 1600, outputWidth: 1200, quality: 55, overCap: true })
  })
  it('oversizeWidths lists the widths whose stored size is over the cap (missing sizes are not oversize)', () => {
    expect(oversizeWidths({ 400: 50 * 1024, 800: 120 * 1024 + 1, 1600: null })).toEqual([800])
    expect(oversizeWidths({ 400: 60 * 1024, 800: 1, 1600: 300 * 1024 })).toEqual([400, 1600])
  })
})
