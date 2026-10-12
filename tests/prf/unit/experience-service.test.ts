import { describe, it, expect } from 'vitest'
import {
  createExperience,
  updateExperience,
  deleteExperience,
  getExperienceById,
  type ExperienceInput,
} from '@/lib/prf/experience-service'
import {
  providerSession,
  guestSession,
  SEED_IDS,
} from '../helpers/mockSession'

const VERIFIED_PROVIDER_ID = SEED_IDS.provider1Verified
const OTHER_PROVIDER_ID = SEED_IDS.providerDraft

describe('T024 | Experience Service Unit Tests (US-5)', () => {
  const ownerSession = providerSession(VERIFIED_PROVIDER_ID, SEED_IDS.provider1VerifiedUserId)
  const anotherProviderSession = providerSession(OTHER_PROVIDER_ID, SEED_IDS.providerDraftUserId)

  const validNewExperience: ExperienceInput = {
    name: 'Nặn gốm vuốt tay nâng cao',
    description: 'Trải nghiệm kỹ thuật vuốt gốm thủ công với nghệ nhân ưu tú.',
    category: 'Ceramics',
    duration_minutes: 120,
    price_per_person: 250000,
    max_participants: 10,
    notice_period_hours: 24,
    images: [
      { url: 'https://img.test/artisan.jpg', category: 'artisan_working', caption: 'Nghệ nhân tạo hình' },
      { url: 'https://img.test/workshop.jpg', category: 'workshop_space', caption: 'Xưởng làm gốm' },
      { url: 'https://img.test/product.jpg', category: 'finished_product', caption: 'Sản phẩm hoàn thiện' },
    ],
  }

  // ── BR-002: Ownership enforcement ──────────────────────────────────────────
  describe('BR-002: Ownership enforcement', () => {
    it('rejects createExperience by Guest or unauthenticated actor', async () => {
      try {
        await createExperience(guestSession(), validNewExperience)
        expect.fail('Should have rejected with 401/403')
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        expect([401, 403]).toContain(e.statusCode)
      }
    })

    it('rejects updateExperience by non-owner provider', async () => {
      try {
        await updateExperience('exp-test-001', anotherProviderSession, { price_per_person: 300000 })
        expect.fail('Should have rejected with 403')
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        expect(e.statusCode).toBe(403)
      }
    })

    it('rejects deleteExperience by non-owner provider', async () => {
      try {
        await deleteExperience('exp-test-001', anotherProviderSession)
        expect.fail('Should have rejected with 403')
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        expect(e.statusCode).toBe(403)
      }
    })
  })

  // ── BR-009: 3 required image categories ───────────────────────────────────
  describe('BR-009: Required image categories on creation', () => {
    it('rejects experience creation when missing artisan_working image category', async () => {
      const missingCategoryExp = {
        ...validNewExperience,
        images: [
          { url: 'https://img.test/workshop.jpg', category: 'workshop_space' as const },
          { url: 'https://img.test/product.jpg', category: 'finished_product' as const },
        ],
      }
      try {
        await createExperience(ownerSession, missingCategoryExp)
        expect.fail('Should have rejected missing category')
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        expect([400, 422]).toContain(e.statusCode)
      }
    })

    it('creates experience successfully when all 3 required categories are present', async () => {
      const res = await createExperience(ownerSession, validNewExperience)
      expect(res.experience_id).toBeDefined()
      expect(res.name).toBe(validNewExperience.name)
    })
  })

  // ── BR-010: Numeric bounds ────────────────────────────────────────────────
  describe('BR-010: Numeric bounds validation', () => {
    it('rejects experience with price_per_person <= 0', async () => {
      const invalidPrice = { ...validNewExperience, price_per_person: 0 }
      try {
        await createExperience(ownerSession, invalidPrice)
        expect.fail('Should reject 0 price')
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        expect([400, 422]).toContain(e.statusCode)
      }
    })

    it('rejects experience with max_participants <= 0', async () => {
      const invalidCapacity = { ...validNewExperience, max_participants: -1 }
      try {
        await createExperience(ownerSession, invalidCapacity)
        expect.fail('Should reject non-positive capacity')
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        expect([400, 422]).toContain(e.statusCode)
      }
    })
  })

  // ── BR-014: Locked fields during active bookings ──────────────────────────
  describe('BR-014: Active booking locked fields', () => {
    it('rejects price or duration edit when experience has active bookings', async () => {
      try {
        // exp-active has active bookings
        await updateExperience('exp-with-active-booking', ownerSession, {
          price_per_person: 400000,
        })
        expect.fail('Should reject editing locked field with active booking')
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        expect([400, 409]).toContain(e.statusCode)
      }
    })

    it('allows non-locked fields (description) edit even when active booking exists', async () => {
      const res = await updateExperience('exp-with-active-booking', ownerSession, {
        description: 'Cập nhật thêm lưu ý khi tham gia hoạt động.',
      })
      expect(res.updated).toBe(true)
    })
  })

  // ── BR-019: Deletion logic (block / archive / delete) ───────────────────────
  describe('BR-019: Experience deletion logic', () => {
    it('blocks deletion when active booking exists (returns 409)', async () => {
      try {
        await deleteExperience('exp-with-active-booking', ownerSession)
        expect.fail('Should block delete on active booking')
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        expect(e.statusCode).toBe(409)
      }
    })

    it('archives experience when only historical bookings exist', async () => {
      const res = await deleteExperience('exp-with-historical-booking', ownerSession)
      expect(res.action).toBe('archived')
      expect(res.archived_at).toBeDefined()
    })

    it('hard-deletes experience when zero bookings exist', async () => {
      const res = await deleteExperience('exp-with-no-booking', ownerSession)
      expect(res.action).toBe('deleted')
    })
  })

  // ── BR-020: Verification isolation ─────────────────────────────────────────
  describe('BR-020: Experience edit does not trigger provider re-verification', () => {
    it('preserves provider verification_status after experience update', async () => {
      const res = await updateExperience('exp-test-001', ownerSession, {
        name: 'Tên trải nghiệm mới',
      })
      expect(res.provider_verification_status).toBe('Verified')
      expect(res.reverification_triggered).toBe(false)
    })
  })
})
