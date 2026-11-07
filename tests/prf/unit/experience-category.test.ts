import { beforeEach, describe, expect, it } from 'vitest'
import { POST as postExperienceRoute } from '@/app/api/prf/experience/route'
import { PATCH as patchExperienceRoute } from '@/app/api/prf/experience/[experienceId]/route'
import { ExperienceCreateSchema, ExperienceUpdateSchema } from '@/lib/prf/validators'
import { demoRepository } from '@/lib/demo/json-repository'
import { providerSession, SEED_IDS, demoCookie } from '../helpers/mockSession'

// Issue #88. spec-PRF FR-006 §5.1: category (Enum[Workshop/Hands-on, Sightseeing, Culinary/Tasting,
// Cultural Show, Combo]; Required for Create; Optional for Update); §10 Q19 Closed. PostgreSQL enforces the
// same list (experience_category_chk), so a value outside it must be a 400 field error, never a 500.
const CATEGORIES = ['Workshop/Hands-on', 'Sightseeing', 'Culinary/Tasting', 'Cultural Show', 'Combo']
const image = (category: string) => ({ url: `https://img.test/${category}.jpg`, category, media_type: 'image/jpeg', file_size_bytes: 1000000, width_px: 1920, height_px: 1080 })
const experience = (category: string) => ({
  name: 'Trải nghiệm thử category', description: 'Mô tả hợp lệ cho trải nghiệm kiểm thử.', category,
  duration_minutes: 90, price_per_person: 180000, max_participants: 8, notice_period_hours: 12,
  experience_location_address: 'Bát Tràng, Gia Lâm, Hà Nội',
  images: [image('Activity'), image('Space'), image('Product')],
})
const owner = providerSession(SEED_IDS.provider1Verified, SEED_IDS.provider1VerifiedUserId)
const request = (method: string, url: string, body: unknown) => new Request(url, {
  method, headers: { cookie: demoCookie(owner), 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})

describe('#88 spec-PRF FR-006 | Experience category is the 5-value enum', () => {
  beforeEach(() => demoRepository().reset())

  it.each(CATEGORIES.map(c => [c]))('FR-006 (normal): accepts %s on Create and Update', category => {
    expect(ExperienceCreateSchema.safeParse(experience(category)).success).toBe(true)
    expect(ExperienceUpdateSchema.safeParse({ category }).success).toBe(true)
  })

  it('FR-006 (boundary): rejects a near miss, a different case and an empty value', () => {
    for (const category of ['Workshop', 'workshop/hands-on', 'Cultural show', '', 'Ceramics']) {
      expect(ExperienceCreateSchema.safeParse(experience(category)).success, category).toBe(false)
      expect(ExperienceUpdateSchema.safeParse({ category }).success, category).toBe(false)
    }
  })

  it('FR-006 (error): POST with category "Ceramics" answers 400 and names the allowed values', async () => {
    const res = await postExperienceRoute(request('POST', 'http://localhost:3000/api/prf/experience', experience('Ceramics')))
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe(`Invalid category: use one of ${CATEGORIES.join(', ')}`)
  })

  it('FR-006 (error): PATCH with category "Ceramics" answers 400 and leaves the Experience unchanged', async () => {
    const before = demoRepository().find('experiences', row => row.experience_id === 'exp-test-001')?.category
    const res = await patchExperienceRoute(
      request('PATCH', 'http://localhost:3000/api/prf/experience/exp-test-001', { category: 'Ceramics' }),
      { params: { experienceId: 'exp-test-001' } },
    )
    expect(res.status).toBe(400)
    expect((await res.json()).error).toBe(`Invalid category: use one of ${CATEGORIES.join(', ')}`)
    expect(demoRepository().find('experiences', row => row.experience_id === 'exp-test-001')?.category).toBe(before)
  })
})
