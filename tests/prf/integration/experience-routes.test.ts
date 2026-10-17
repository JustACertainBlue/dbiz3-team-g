import { describe, it, expect } from 'vitest'
import {
  POST as postExperienceRoute,
} from '@/app/api/prf/experience/route'
import {
  GET as getExperienceRoute,
  PATCH as patchExperienceRoute,
  DELETE as deleteExperienceRoute,
} from '@/app/api/prf/experience/[experienceId]/route'
import {
  providerSession,
  guestSession,
  SEED_IDS,
} from '../helpers/mockSession'

const VERIFIED_PROVIDER_ID = SEED_IDS.provider1Verified

describe('T025 | Experience Routes Integration Tests (US-5)', () => {
  const owner = providerSession(VERIFIED_PROVIDER_ID, SEED_IDS.provider1VerifiedUserId)

  function makeRequest(
    method: string,
    url: string,
    session: ReturnType<typeof guestSession>,
    body?: unknown,
  ): Request {
    return new Request(url, {
      method,
      headers: {
        'x-mock-session': JSON.stringify(session),
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  // ── POST /api/prf/experience ───────────────────────────────────────────────
  describe('POST /api/prf/experience', () => {
    it('creates a new experience and returns 201', async () => {
      const payload = {
        name: 'Trải nghiệm nặn gốm mới',
        description: 'Tự tay nhào đất và tạo hình chiếc bình gốm đầu tiên.',
        category: 'Ceramics',
        duration_minutes: 90,
        price_per_person: 180000,
        max_participants: 8,
        notice_period_hours: 12,
        images: [
          { url: 'https://img.test/artisan.jpg', category: 'artisan_working' },
          { url: 'https://img.test/space.jpg', category: 'workshop_space' },
          { url: 'https://img.test/prod.jpg', category: 'finished_product' },
        ],
      }
      const req = makeRequest('POST', 'http://localhost:3000/api/prf/experience', owner, payload)
      const res = await postExperienceRoute(req)
      expect(res.status).toBe(201)
      const data = await res.json()
      expect(data.experience_id).toBeDefined()
    })

    it('returns 400 when price_per_person is zero or negative', async () => {
      const payload = {
        name: 'Trải nghiệm giá 0 đồng',
        description: 'Mô tả hợp lệ cho trải nghiệm kiểm thử.',
        category: 'Ceramics',
        duration_minutes: 60,
        price_per_person: 0,
        max_participants: 5,
        notice_period_hours: 12,
        images: [
          { url: 'https://img.test/1.jpg', category: 'artisan_working' },
          { url: 'https://img.test/2.jpg', category: 'workshop_space' },
          { url: 'https://img.test/3.jpg', category: 'finished_product' },
        ],
      }
      const req = makeRequest('POST', 'http://localhost:3000/api/prf/experience', owner, payload)
      const res = await postExperienceRoute(req)
      expect(res.status).toBe(400)
    })
  })

  // ── PATCH /api/prf/experience/:id ──────────────────────────────────────────
  describe('PATCH /api/prf/experience/:id', () => {
    it('updates experience and returns 200', async () => {
      const req = makeRequest(
        'PATCH',
        'http://localhost:3000/api/prf/experience/exp-test-001',
        owner,
        { description: 'Mô tả được cập nhật.' },
      )
      const res = await patchExperienceRoute(req, { params: { experienceId: 'exp-test-001' } })
      expect(res.status).toBe(200)
    })

    it('returns 409 when attempting to edit locked field with active booking', async () => {
      const req = makeRequest(
        'PATCH',
        'http://localhost:3000/api/prf/experience/exp-with-active-booking',
        owner,
        { price_per_person: 350000 },
      )
      const res = await patchExperienceRoute(req, { params: { experienceId: 'exp-with-active-booking' } })
      expect([400, 409]).toContain(res.status)
    })
  })

  // ── DELETE /api/prf/experience/:id ─────────────────────────────────────────
  describe('DELETE /api/prf/experience/:id', () => {
    it('returns 409 when deleting experience with active bookings', async () => {
      const req = makeRequest(
        'DELETE',
        'http://localhost:3000/api/prf/experience/exp-with-active-booking',
        owner,
      )
      const res = await deleteExperienceRoute(req, { params: { experienceId: 'exp-with-active-booking' } })
      expect(res.status).toBe(409)
    })

    it('returns 200 when deleting experience without active bookings', async () => {
      const req = makeRequest(
        'DELETE',
        'http://localhost:3000/api/prf/experience/exp-with-no-booking',
        owner,
      )
      const res = await deleteExperienceRoute(req, { params: { experienceId: 'exp-with-no-booking' } })
      expect(res.status).toBe(200)
    })
  })
})
