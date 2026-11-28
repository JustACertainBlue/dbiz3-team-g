/**
 * PR #306 adds a WebP copy of each demo photo. The manifest keeps one row per photograph (source, author, licence of the
 * original) and now also describes the WebP copy, so the credits stay complete and exact.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { imageSize } from 'image-size'

type Row = { slug: string; file: string; license: string; source: string; author: string; webp?: { file: string; bytes: number; width: number; height: number; presentation: string } }
const manifest = JSON.parse(readFileSync('assets/demo-media/manifest.json', 'utf8')) as Row[]

describe('demo media WebP copies in the manifest', () => {
  it.each(manifest.map(row => [row.slug, row] as const))('%s: the WebP copy is described and matches its file; same source and licence as the original', (_slug, row) => {
    expect(row.webp, 'webp entry').toBeDefined()
    expect(row.webp!.file).toBe(row.file.replace(/\.jpg$/, '.webp'))
    const bytes = readFileSync(join('assets/demo-media', row.webp!.file))
    const size = imageSize(bytes)
    expect({ bytes: bytes.length, width: size.width, height: size.height }).toEqual({ bytes: row.webp!.bytes, width: row.webp!.width, height: row.webp!.height })
    expect(row.webp!.presentation).toMatch(/WebP/)
    expect(row.license).toMatch(/^(Pexels License|Pixabay Content License|CC0)$/)
    expect(row.source).toMatch(/^https:\/\//)
  })
})
