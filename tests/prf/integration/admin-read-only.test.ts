/**
 * Slice B (linh/prf-fixes-3) – BR-003 / SC-008 / US-6 AC5: HDT and UBND have read-only access to
 * profile content. Supplementary tests (the API already refuses); proven by a mutation check
 * (build-log Entry 41). Uses the demo cookies through the real route handlers.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { PATCH as patchProvider } from '@/app/api/prf/provider/[providerId]/route'
import { POST as postExperience } from '@/app/api/prf/experience/route'
import { PATCH as patchExperience } from '@/app/api/prf/experience/[experienceId]/route'

const BAT_TRANG = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
const HA_THAI = '3a5d2ffc-79fa-5b75-a1e6-82beea3bed59' // the demo UBND's own village
const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const request = (url: string, method: string, account: string, body: unknown) => new Request(url, {
  method, headers: { cookie: `hab_demo_account=${account}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
})
const snapshot = () => JSON.stringify(['provider_profiles', 'provider_profile_versions', 'experiences', 'profile_media', 'stored_files'].map(t => demoRepository().all(t)))
const newExperience = {
  name: 'Admin thử tạo', description: 'Không được phép tạo trải nghiệm từ tài khoản quản trị.', category: 'Workshop/Hands-on',
  duration_minutes: 60, price_per_person: 100000, max_participants: 5, notice_period_hours: 24,
  images: ['Activity', 'Space', 'Product'].map(category => ({ url: `upload://t/${category}.jpg`, file_name: `${category}.jpg`, category, media_type: 'image/jpeg', file_size_bytes: 1000, width_px: 1280, height_px: 720 })),
}

describe('Slice B | BR-003 HDT and UBND cannot modify profile content', () => {
  beforeEach(() => demoRepository().reset())

  for (const account of ['ubnd', 'hdt']) {
    it(`${account}: PATCH provider (own village for UBND) → 403, nothing written`, async () => {
      const before = snapshot()
      for (const provider of [BAT_TRANG, HA_THAI]) {
        const res = await patchProvider(request(`http://localhost:3000/api/prf/provider/${provider}`, 'PATCH', account, { general_description: 'Admin sửa mô tả' }), { params: { providerId: provider } })
        expect(res.status).toBe(403)
      }
      expect(snapshot()).toBe(before)
    })

    it(`${account}: PATCH and POST experience → 403, nothing written`, async () => {
      const before = snapshot()
      const patched = await patchExperience(request(`http://localhost:3000/api/prf/experience/${EXPERIENCE}`, 'PATCH', account, { description: 'Admin sửa trải nghiệm này.' }), { params: { experienceId: EXPERIENCE } })
      expect(patched.status).toBe(403)
      const created = await postExperience(request('http://localhost:3000/api/prf/experience', 'POST', account, newExperience))
      expect(created.status).toBe(403)
      expect(snapshot()).toBe(before)
    })
  }
})
