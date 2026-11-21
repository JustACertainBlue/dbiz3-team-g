// Step 2A (human request 2026-11-20): backfill WebP variants for every showcase image already stored. DEV only, dry run
// by default, --apply writes an undo file first, --undo removes what the run created. Pure parts only.
import { describe, expect, it } from 'vitest'
import { DISPLAY_IMAGES_SQL, capReport, parseArgs, summarizeVariants, writeVariant } from '../../scripts/storage/backfill-media-variants.mjs'

describe('parseArgs', () => {
  it('is a dry run by default; --apply writes; --undo <file> writes unless --dry-run', () => {
    expect(parseArgs([])).toMatchObject({ apply: false })
    expect(parseArgs(['--apply'])).toMatchObject({ apply: true })
    expect(parseArgs(['--undo', 'x/undo.json'])).toMatchObject({ apply: true, undo: 'x/undo.json' })
    expect(parseArgs(['--undo', 'x/undo.json', '--dry-run'])).toMatchObject({ apply: false, undo: 'x/undo.json' })
    expect(() => parseArgs(['--dry-run', '--apply'])).toThrow()
    expect(() => parseArgs(['--force'])).toThrow() // was '--target-prod' while the script was DEV only; allowed since 2026-11-21
    expect(() => parseArgs(['--undo'])).toThrow()
  })
  it('--only-oversize redoes only the variants over their cap (dry run unless --apply); not with --undo', () => {
    expect(parseArgs(['--only-oversize'])).toMatchObject({ apply: false, onlyOversize: true })
    expect(parseArgs(['--only-oversize', '--apply'])).toMatchObject({ apply: true, onlyOversize: true })
    expect(parseArgs(['--apply'])).toMatchObject({ onlyOversize: false })
    expect(() => parseArgs(['--only-oversize', '--undo', 'x/undo.json'])).toThrow()
  })
})

describe('DISPLAY_IMAGES_SQL', () => {
  it('selects showcase images only: linked as experience/workshop media or village cover, never a provider document', () => {
    expect(DISPLAY_IMAGES_SQL).toMatch(/media_type LIKE 'image\/%'/)
    expect(DISPLAY_IMAGES_SQL).toMatch(/profile_media/)
    expect(DISPLAY_IMAGES_SQL).toMatch(/provider_version_media/)
    expect(DISPLAY_IMAGES_SQL).toMatch(/cover_image_id/)
    expect(DISPLAY_IMAGES_SQL).toMatch(/NOT EXISTS\s*\(\s*SELECT 1 FROM public\.provider_version_documents/)
    expect(DISPLAY_IMAGES_SQL).toMatch(/storage_key\s*=\s*'prf-media\/'\s*\|\|\s*f\.file_id::text/)
  })
})

describe('summarizeVariants', () => {
  it('reports count, average and largest KB per width', () => {
    const results = [
      [{ width: 400, bytes: 20 * 1024 }, { width: 800, bytes: 60 * 1024 }, { width: 1600, bytes: 150 * 1024 }],
      [{ width: 400, bytes: 30 * 1024 }, { width: 800, bytes: 80 * 1024 }, { width: 1600, bytes: 250 * 1024 }],
    ]
    expect(summarizeVariants(results)).toEqual({
      400: { count: 2, averageKB: 25, maxKB: 30 },
      800: { count: 2, averageKB: 70, maxKB: 80 },
      1600: { count: 2, averageKB: 200, maxKB: 250 },
    })
    expect(summarizeVariants([])).toEqual({ 400: { count: 0, averageKB: 0, maxKB: 0 }, 800: { count: 0, averageKB: 0, maxKB: 0 }, 1600: { count: 0, averageKB: 0, maxKB: 0 } })
  })
})

describe('capReport (human request 2026-11-21)', () => {
  it('lists the variants made narrower than their nominal width (real width recorded) and those still over the cap at 75 %', () => {
    const v = (width: number, outputWidth: number, quality: number, kb: number, overCap: boolean, narrowed: boolean) => ({ width, outputWidth, quality, overCap, narrowed, bytes: { length: kb * 1024 } })
    const items = [
      { file_id: 'a', variants: [v(400, 400, 72, 20, false, false), v(800, 800, 62, 110, false, false), v(1600, 1400, 72, 240, false, true)] },
      { file_id: 'b', variants: [v(1600, 1200, 55, 280, true, true)] },
      { file_id: 'c', variants: [v(1600, 1280, 72, 200, false, false)] },
      { file_id: 'd', variants: [v(1600, 1200, 72, 200, false, false)] }, // original only 1200 wide: not narrowed,
    ]
    expect(capReport(items)).toEqual({
      reducedWidth: [
        { file_id: 'a', width: 1600, outputWidth: 1400, quality: 72, KB: 240 },
        { file_id: 'b', width: 1600, outputWidth: 1200, quality: 55, KB: 280 },
      ],
      stillOverCap: [{ file_id: 'b', width: 1600, outputWidth: 1200, quality: 55, KB: 280 }],
    })
  })
})

describe('writeVariant', () => {
  const fakeStorage = (behaviour: { fail?: boolean, existing?: number | null }) => {
    const writes: Array<{ key: string, replace: boolean }> = []
    return { writes, storage: {
      write: async (key: string, _bytes: Buffer, _type: string, options: { replace: boolean }) => { writes.push({ key, replace: options.replace }); if (behaviour.fail) throw new Error('Storage operation failed (400)') },
      size: async () => behaviour.existing ?? null,
    } }
  }
  const key = 'prf-media/0c22e70d-91d7-5347-8c9a-74fa00558912.w400.webp', bytes = Buffer.from('12345')
  it('writes once when Storage accepts it', async () => {
    const { storage, writes } = fakeStorage({})
    await writeVariant(storage, key, bytes, false)
    expect(writes).toEqual([{ key, replace: false }])
  })
  it('treats a refused write as done when the object already holds exactly these bytes (a timed-out first attempt)', async () => {
    const { storage } = fakeStorage({ fail: true, existing: 5 })
    await expect(writeVariant(storage, key, bytes, false)).resolves.toBe('already-stored')
  })
  it('still fails when the object is missing or has another size', async () => {
    await expect(writeVariant(fakeStorage({ fail: true, existing: null }).storage, key, bytes, false)).rejects.toThrow(/400/)
    await expect(writeVariant(fakeStorage({ fail: true, existing: 9 }).storage, key, bytes, false)).rejects.toThrow(/400/)
  })
})
