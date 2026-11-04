/**
 * Slice B (linh/prf-fixes-3) – Experience images. Written before the code (Constitution II).
 *
 * - BR-008 + consistency-contract §Images: JPG/JPEG/PNG/WEBP, ≤ 10 MB (10485760 bytes), ≥ 1280×720.
 *   stored_files rows carry the real metadata (data/schema.sql: size > 0, width/height > 0).
 * - Q4 (2026-11-04): image categories are the data/ values Activity, Space, Product
 *   (data/schema.sql profile_media_exp_category_chk).
 * - BR-009: create needs one image of each category ("Required Image Category Missing", FR-006 errors).
 * - BR-015: an update may not remove the last image of a category
 *   ("Last Required Category Image Cannot Be Deleted"). Existing images are kept by `file_id`.
 * - canRemoveImage: the edit screen disables removing the last image of a category.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { createExperience, getExperienceById, updateExperience } from '@/lib/prf/experience-service'
import { ExperienceImageSchema } from '@/lib/prf/validators'
import { EXPERIENCE_IMAGE_CATEGORIES, canRemoveImage, imageMetadataError } from '@/lib/prf/experience-images'
import { providerSession, SEED_IDS } from '../helpers/mockSession'

const owner = providerSession(SEED_IDS.provider1Verified, SEED_IDS.provider1VerifiedUserId)
const BAT_TRANG_EXP = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69' // seed media: Activity 6f899cb2, Space bdfab530, Product 6698a1ac
const SEED_FILES = { Activity: '6f899cb2-eead-50bc-9dd9-aa96fc36b82b', Space: 'bdfab530-2097-5dbd-ad6d-13fca233286c', Product: '6698a1ac-581c-5b1b-9995-79b8c940618c' }

const upload = (category: string, over: Record<string, unknown> = {}) => ({
  url: `upload://test/${category.toLowerCase()}.jpg`, file_name: `${category.toLowerCase()}.jpg`, category,
  media_type: 'image/jpeg', file_size_bytes: 2_000_000, width_px: 1920, height_px: 1080, ...over,
})
const experience = (images: unknown[]) => ({
  name: 'Vẽ men lam', description: 'Trải nghiệm vẽ men lam trên gốm mộc cùng nghệ nhân.', category: 'Workshop/Hands-on',
  duration_minutes: 90, price_per_person: 200000, max_participants: 10, notice_period_hours: 24, images,
})
const mediaOf = (experienceId: string) => demoRepository().all('profile_media').filter(row => row.experience_id === experienceId)

describe('Slice B | BR-008 image metadata (consistency-contract §Images)', () => {
  it('accepts JPG/JPEG/PNG/WEBP at the limits: 10 MB and 1280×720', () => {
    for (const media_type of ['image/jpeg', 'image/png', 'image/webp']) {
      expect(imageMetadataError({ media_type, file_size_bytes: 10_485_760, width_px: 1280, height_px: 720 })).toBeNull()
    }
  })

  it('rejects other formats, more than 10 MB, less than 1280 wide or 720 high, and empty files', () => {
    const ok = { media_type: 'image/jpeg', file_size_bytes: 1000, width_px: 1280, height_px: 720 }
    expect(imageMetadataError({ ...ok, media_type: 'image/gif' })).toMatch(/format/i)
    expect(imageMetadataError({ ...ok, file_size_bytes: 10_485_761 })).toMatch(/10 ?MB/i)
    expect(imageMetadataError({ ...ok, file_size_bytes: 0 })).not.toBeNull()
    expect(imageMetadataError({ ...ok, width_px: 1279 })).toMatch(/1280/)
    expect(imageMetadataError({ ...ok, height_px: 719 })).toMatch(/720/)
  })

  it('the image schema uses the data/ categories and requires the metadata', () => {
    expect(EXPERIENCE_IMAGE_CATEGORIES.map(c => c.value)).toEqual(['Activity', 'Space', 'Product'])
    expect(ExperienceImageSchema.safeParse(upload('Activity')).success).toBe(true)
    expect(ExperienceImageSchema.safeParse(upload('artisan_working')).success).toBe(false)
    expect(ExperienceImageSchema.safeParse({ url: 'upload://x/a.jpg', category: 'Activity' }).success).toBe(false)
    expect(ExperienceImageSchema.safeParse(upload('Activity', { media_type: 'image/gif' })).success).toBe(false)
  })
})

describe('Slice B | create stores real metadata (BR-008, BR-009)', () => {
  beforeEach(() => demoRepository().reset())

  it('writes stored_files with the uploaded metadata and profile_media with Activity/Space/Product', async () => {
    const created = await createExperience(owner, experience([upload('Activity'), upload('Space'), upload('Product', { media_type: 'image/webp', width_px: 1280, height_px: 720 })]) as never)
    const media = mediaOf(created.experience_id)
    expect(media.map(row => row.category).sort()).toEqual(['Activity', 'Product', 'Space'])
    const files = demoRepository().all('stored_files').filter(file => media.some(row => row.file_id === file.file_id))
    expect(files).toHaveLength(3)
    for (const file of files) {
      expect(Number(file.file_size_bytes)).toBeGreaterThan(0)
      expect(Number(file.width_px)).toBeGreaterThanOrEqual(1280)
      expect(Number(file.height_px)).toBeGreaterThanOrEqual(720)
    }
    expect(files.find(file => file.media_type === 'image/webp')?.file_name).toBe('product.jpg')
  })

  it('rejects a create without one image of each category with "Required Image Category Missing"', async () => {
    await expect(createExperience(owner, experience([upload('Activity'), upload('Activity'), upload('Space')]) as never))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('Required Image Category Missing') })
  })

  it('rejects a create with an invalid image (BR-008) and writes nothing', async () => {
    const before = demoRepository().all('experiences').length
    await expect(createExperience(owner, experience([upload('Activity', { width_px: 800 }), upload('Space'), upload('Product')]) as never))
      .rejects.toMatchObject({ statusCode: 400 })
    expect(demoRepository().all('experiences')).toHaveLength(before)
  })
})

describe('Slice B | update keeps the last image of each category (BR-015, BR-009)', () => {
  beforeEach(() => demoRepository().reset())

  it('getExperienceById returns each image with file_id, category and metadata', async () => {
    const detail = await getExperienceById(BAT_TRANG_EXP) as { images: Array<Record<string, unknown>> }
    expect(detail.images).toHaveLength(3)
    expect(detail.images[0]).toMatchObject({ file_id: expect.any(String), category: expect.any(String), file_name: expect.any(String), media_type: 'image/jpeg', file_size_bytes: 1400000, width_px: 1920, height_px: 1080 })
  })

  it('refuses an update that drops the only Product image and changes nothing', async () => {
    await expect(updateExperience(BAT_TRANG_EXP, owner, { images: [{ file_id: SEED_FILES.Activity }, { file_id: SEED_FILES.Space }] } as never))
      .rejects.toMatchObject({ statusCode: 400, message: expect.stringContaining('Last Required Category Image Cannot Be Deleted') })
    expect(mediaOf(BAT_TRANG_EXP).map(row => row.file_id).sort()).toEqual(Object.values(SEED_FILES).sort())
  })

  it('allows replacing the Product image when the new one is uploaded in the same update', async () => {
    await updateExperience(BAT_TRANG_EXP, owner, { images: [{ file_id: SEED_FILES.Activity }, { file_id: SEED_FILES.Space }, upload('Product')] } as never)
    const media = mediaOf(BAT_TRANG_EXP)
    expect(media.map(row => row.category).sort()).toEqual(['Activity', 'Product', 'Space'])
    expect(media.some(row => row.file_id === SEED_FILES.Product)).toBe(false)
    expect(media.filter(row => row.file_id === SEED_FILES.Activity)).toHaveLength(1)
    const product = demoRepository().all('stored_files').find(file => file.file_id === media.find(row => row.category === 'Product')!.file_id)!
    expect(Number(product.file_size_bytes)).toBe(2_000_000)
  })

  it('refuses a kept file_id that does not belong to the Experience', async () => {
    await expect(updateExperience(BAT_TRANG_EXP, owner, { images: [{ file_id: '00000000-0000-0000-0000-000000000000' }, { file_id: SEED_FILES.Space }, { file_id: SEED_FILES.Product }] } as never))
      .rejects.toMatchObject({ statusCode: 400 })
  })
})

describe('Slice B | canRemoveImage (BR-015 on EXP070)', () => {
  const images = [{ category: 'Activity' }, { category: 'Activity' }, { category: 'Space' }, { category: 'Product' }]
  it('allows removing an image only when its category keeps another one', () => {
    expect(canRemoveImage(images, 0)).toBe(true)
    expect(canRemoveImage(images, 2)).toBe(false)
    expect(canRemoveImage(images, 3)).toBe(false)
  })
})
