/**
 * T014 – Provider service unit tests: getProviderProfile
 * Tests FR-003 (View Local Provider Profile) for all actor types.
 *
 * CONSTITUTION II: Written BEFORE src/lib/prf/provider-service.ts exists.
 * These tests MUST FAIL until T016 (getProviderProfile implementation) is done.
 *
 * Covers US-3 AC1–AC4 and BR-004 (visibility rules).
 *
 * Also covers BR-007: only the published version of a Verified provider is shown
 * publicly; a pending revision does not replace the public version.
 */
import { beforeEach, describe, it, expect } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import assert from 'node:assert'
import {
  getProviderProfile,
  updateProviderProfile,
  reviewProvider,
} from '@/lib/prf/provider-service'
import {
  guestSession,
  agencyOwnerSession,
  providerSession,
  ubndSession,
  hdtSession,
  SEED_IDS,
} from '../helpers/mockSession'

// ── Fixture representing a Verified provider from the seed ────────────────────

const VERIFIED_PROVIDER_ID = SEED_IDS.provider1Verified  // 50f2c8fc — Bát Tràng, Verified
const DRAFT_PROVIDER_ID = SEED_IDS.providerDraft          // c8e989d4 — Draft

// ─── US-3 AC1: Tour Agency sees permitted collaboration detail ────────────────

describe('T014 | getProviderProfile – US-3 (View Local Provider Profile)', () => {

  describe('AC1: Tour Agency sees full permitted collaboration fields', () => {
    it('returns provider_name and craft_type for a Tour Agency', async () => {
      const result = await getProviderProfile(VERIFIED_PROVIDER_ID, agencyOwnerSession())
      expect(result).not.toBeNull()
      assert(result)
      expect(result.provider_name).toBeDefined()
      expect(result.craft_type).toBeDefined()
    })

    it('returns pricing for a Tour Agency (collaboration detail)', async () => {
      const result = await getProviderProfile(VERIFIED_PROVIDER_ID, agencyOwnerSession())
      expect(result).not.toBeNull()
      assert(result)
      expect(result.pricing).toBeDefined()
      expect(typeof result.pricing).toBe('number')
    })

    it('returns contact for a Tour Agency (collaboration detail)', async () => {
      const result = await getProviderProfile(VERIFIED_PROVIDER_ID, agencyOwnerSession())
      expect(result).not.toBeNull()
      assert(result)
      expect(result.contact).toBeDefined()
    })

    it('does NOT return quality_metrics to Tour Agency (HDT-only field)', async () => {
      const result = await getProviderProfile(VERIFIED_PROVIDER_ID, agencyOwnerSession())
      expect(result).not.toBeNull()
      assert(result)
      expect((result as Record<string, unknown>).quality_metrics).toBeUndefined()
    })
  })

  // ── AC2: Provider sees own profile in full ──────────────────────────────

  describe('AC2: Local Provider sees own profile with verification_status', () => {
    it('returns verification_status to own Provider', async () => {
      const session = providerSession(VERIFIED_PROVIDER_ID, SEED_IDS.provider1VerifiedUserId)
      const result = await getProviderProfile(VERIFIED_PROVIDER_ID, session)
      expect(result).not.toBeNull()
      assert(result)
      expect(result.verification_status).toBe('Verified')
    })

    it('returns full editable info to own Provider', async () => {
      const session = providerSession(VERIFIED_PROVIDER_ID, SEED_IDS.provider1VerifiedUserId)
      const result = await getProviderProfile(VERIFIED_PROVIDER_ID, session)
      expect(result).not.toBeNull()
      assert(result)
      expect(result.booking_conditions).toBeDefined()
    })
  })

  // ── AC3: Another Provider does not see pricing/contact ──────────────────

  describe('AC3: Another Local Provider sees restricted information only', () => {
    it('does NOT expose pricing to another Local Provider', async () => {
      // providerDraft viewing providerVerified
      const session = providerSession(SEED_IDS.providerDraft, SEED_IDS.providerDraftUserId)
      const result = await getProviderProfile(VERIFIED_PROVIDER_ID, session)
      expect(result).not.toBeNull()
      assert(result)
      // Another provider should see public info only — no pricing
      expect((result as Record<string, unknown>).pricing).toBeUndefined()
    })
  })

  // ── AC4: Guest sees only public/basic information ───────────────────────

  describe('AC4: Guest sees only public/basic information', () => {
    it('returns provider_name, craft_type, general_description for Guest', async () => {
      const result = await getProviderProfile(VERIFIED_PROVIDER_ID, guestSession())
      expect(result).not.toBeNull()
      assert(result)
      expect(result.provider_name).toBeDefined()
      expect(result.craft_type).toBeDefined()
      expect(result.general_description).toBeDefined()
    })

    it('does NOT return pricing to Guest', async () => {
      const result = await getProviderProfile(VERIFIED_PROVIDER_ID, guestSession())
      expect(result).not.toBeNull()
      assert(result)
      expect((result as Record<string, unknown>).pricing).toBeUndefined()
    })

    it('does NOT return contact to Guest', async () => {
      const result = await getProviderProfile(VERIFIED_PROVIDER_ID, guestSession())
      expect(result).not.toBeNull()
      assert(result)
      expect((result as Record<string, unknown>).contact).toBeUndefined()
    })

    it('does NOT return verification_status to Guest', async () => {
      const result = await getProviderProfile(VERIFIED_PROVIDER_ID, guestSession())
      expect(result).not.toBeNull()
      assert(result)
      expect((result as Record<string, unknown>).verification_status).toBeUndefined()
    })
  })

  // ── BR-004 HDT full monitoring access ──────────────────────────────────

  describe('HDT actor: full-detail monitoring access', () => {
    it('returns quality_metrics to HDT', async () => {
      const result = await getProviderProfile(VERIFIED_PROVIDER_ID, hdtSession())
      expect(result).not.toBeNull()
      assert(result)
      expect(result.quality_metrics).toBeDefined()
      assert(result.quality_metrics)
      expect(typeof result.quality_metrics.total_bookings).toBe('number')
    })

    it('returns verification_status to HDT', async () => {
      const result = await getProviderProfile(VERIFIED_PROVIDER_ID, hdtSession())
      expect(result).not.toBeNull()
      assert(result)
      expect(result.verification_status).toBe('Verified')
    })
  })

  // ── BR-007: Only published version shown publicly ────────────────────────

  describe('BR-007: Draft provider not visible publicly', () => {
    it('Guest cannot see a Draft provider profile (returns null or throws 404)', async () => {
      // The Draft provider has no published_version_no — should not be publicly visible
      try {
        const result = await getProviderProfile(DRAFT_PROVIDER_ID, guestSession())
        // If it returns, the result should have no public content
        expect(result).toBeNull()
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        expect(e.statusCode).toBe(404)
      }
    })

    it('Tour Agency cannot see a Draft provider profile publicly', async () => {
      try {
        const result = await getProviderProfile(DRAFT_PROVIDER_ID, agencyOwnerSession())
        expect(result).toBeNull()
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        expect(e.statusCode).toBe(404)
      }
    })
  })

  // ── Not found ────────────────────────────────────────────────────────────

  describe('Provider not found', () => {
    it('throws 404 for a non-existent provider_id', async () => {
      try {
        await getProviderProfile('00000000-0000-0000-0000-000000000000', guestSession())
        expect.fail('Should have thrown')
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        expect(e.statusCode).toBe(404)
      }
    })
  })
})

// ─── updateProviderProfile section (T019) ───────────────────────────────────

describe('T019 | updateProviderProfile – US-4 (Manage Provider Profile)', () => {
  beforeEach(() => demoRepository().reset())
  const verifiedSession = providerSession(VERIFIED_PROVIDER_ID, SEED_IDS.provider1VerifiedUserId)
  const draftSession = providerSession(DRAFT_PROVIDER_ID, SEED_IDS.providerDraftUserId)
  const anotherProviderSession = providerSession(DRAFT_PROVIDER_ID, SEED_IDS.providerDraftUserId)

  // ── BR-002: Ownership enforcement ──────────────────────────────────────────
  it('rejects update by another provider with 403 (BR-002)', async () => {
    try {
      await updateProviderProfile(VERIFIED_PROVIDER_ID, anotherProviderSession, {
        general_description: 'Malicious update attempt',
      })
      expect.fail('Should have rejected with 403')
    } catch (err: unknown) {
      const e = err as { statusCode?: number }
      expect(e.statusCode).toBe(403)
    }
  })

  it('rejects update by Guest or unauthorized actor with 401/403', async () => {
    try {
      await updateProviderProfile(VERIFIED_PROVIDER_ID, guestSession(), {
        general_description: 'Guest update attempt',
      })
      expect.fail('Should have rejected')
    } catch (err: unknown) {
      const e = err as { statusCode?: number }
      expect([401, 403]).toContain(e.statusCode)
    }
  })

  // ── BR-006: Lifecycle transitions ──────────────────────────────────────────
  it('keeps Draft status if submission is incomplete (BR-006)', async () => {
    const res = await updateProviderProfile(DRAFT_PROVIDER_ID, draftSession, {
      general_description: 'Short draft description without other required fields',
    }) as { verification_status: string }
    expect(res.verification_status).toBe('Draft')
  })

  it('transitions Draft to Pending Verification on first complete submission (BR-006)', async () => {
    const completeDraftPayload = {
      business_name: 'Xưởng thủ công Hạ Thái Mới',
      craft_type: 'Lacquer',
      business_registration: 'HKD-HN-20269999',
      artisan_names: ['Nghệ nhân Nguyễn Văn A'],
      location_address: 'Hạ Thái, Thường Tín, Hà Nội',
      general_description: 'Nghề sơn mài truyền thống với quy trình khép kín.',
      phone_number: '0987654321',
      business_email: 'hathai@artisan.vn',
      operating_hours: [
        { weekday: 1, local_start: '08:00', local_end: '17:00', is_closed: false },
      ],
    }
    const res = await updateProviderProfile(DRAFT_PROVIDER_ID, draftSession, completeDraftPayload) as {
      verification_status: string
    }
    expect(res.verification_status).toBe('Pending Verification')
  })

  // ── BR-007 & BR-018: Major field change on Verified provider ────────────────
  it('creates a new Pending version when Verified provider edits a major field (BR-007, BR-018)', async () => {
    const majorChangePayload = {
      business_name: 'Xưởng gốm Bát Tràng Đổi Tên', // Major field
    }
    const res = await updateProviderProfile(VERIFIED_PROVIDER_ID, verifiedSession, majorChangePayload) as {
      verification_status: string
      new_version_pending: boolean
      published_version_intact: boolean
    }
    expect(res.new_version_pending).toBe(true)
    expect(res.published_version_intact).toBe(true)
    const publicProfile = await getProviderProfile(VERIFIED_PROVIDER_ID, guestSession())
    const ownerProfile = await getProviderProfile(VERIFIED_PROVIDER_ID, verifiedSession)
    expect(publicProfile?.provider_name).not.toBe(majorChangePayload.business_name)
    expect(ownerProfile?.provider_name).toBe(majorChangePayload.business_name)
  })

  it('updates immediately without pending status when editing non-major fields (BR-018)', async () => {
    const nonMajorPayload = {
      general_description: 'Cập nhật mô tả hoạt động mới nhất.',
      booking_conditions: { cancellation_notice_hours: 48 },
    }
    const res = await updateProviderProfile(VERIFIED_PROVIDER_ID, verifiedSession, nonMajorPayload) as {
      verification_status: string
      new_version_pending: boolean
    }
    expect(res.new_version_pending).toBe(false)
    expect(res.verification_status).toBe('Verified')
    const saved = await getProviderProfile(VERIFIED_PROVIDER_ID, verifiedSession)
    expect(saved?.general_description).toBe(nonMajorPayload.general_description)
  })

  // ── BR-021: Operating hours saved to provider_operating_hours ───────────────
  it('saves operating hours correctly per BR-021', async () => {
    const hoursPayload = {
      operating_hours: [
        { weekday: 2, local_start: '09:00', local_end: '18:00', is_closed: false },
      ],
    }
    const res = await updateProviderProfile(VERIFIED_PROVIDER_ID, verifiedSession, hoursPayload) as {
      operating_hours_updated: boolean
    }
    expect(res.operating_hours_updated).toBe(true)
  })
})

// ─── T035: reviewProvider section (US-6) ─────────────────────────────────────

describe('T035 | reviewProvider – US-6 (Verify Provider Profile)', () => {
  const assignedUbndSession = ubndSession(SEED_IDS.village1)
  const crossVillageUbndSession = ubndSession(SEED_IDS.village2)

  // ── BR-005: Village scope check ───────────────────────────────────────────
  it('rejects review when UBND is not assigned to the provider village (BR-005)', async () => {
    try {
      await reviewProvider(VERIFIED_PROVIDER_ID, crossVillageUbndSession, 'Approve')
      expect.fail('Should reject cross-village review')
    } catch (err: unknown) {
      const e = err as { statusCode?: number }
      expect(e.statusCode).toBe(403)
    }
  })

  it('rejects review by non-UBND actor (BR-005)', async () => {
    try {
      await reviewProvider(VERIFIED_PROVIDER_ID, guestSession(), 'Approve')
      expect.fail('Should reject non-UBND actor')
    } catch (err: unknown) {
      const e = err as { statusCode?: number }
      expect([401, 403]).toContain(e.statusCode)
    }
  })

  // ── US-6 AC2: Approve → Verified ──────────────────────────────────────────
  it('approves provider profile and sets verification_status = Verified (AC2, BR-007)', async () => {
    const res = await reviewProvider(VERIFIED_PROVIDER_ID, assignedUbndSession, 'Approve') as {
      verification_status: string
      published_version_no: number
    }
    expect(res.verification_status).toBe('Verified')
    expect(res.published_version_no).toBeDefined()
  })

  // ── US-6 AC3: Request Revision ────────────────────────────────────────────
  it('sets status to Revision Required when requesting revision with comments (AC3)', async () => {
    const res = await reviewProvider(
      VERIFIED_PROVIDER_ID,
      assignedUbndSession,
      'Request Revision',
      'Cần bổ sung thêm ảnh chứng thực quy trình dập phôi gốm.',
    ) as {
      verification_status: string
      revision_comments: string
    }
    expect(res.verification_status).toBe('Revision Required')
    expect(res.revision_comments).toBeDefined()
  })

  it('rejects Request Revision if comments are empty (AC3)', async () => {
    try {
      await reviewProvider(VERIFIED_PROVIDER_ID, assignedUbndSession, 'Request Revision', '')
      expect.fail('Should reject empty comments on revision request')
    } catch (err: unknown) {
      const e = err as { statusCode?: number }
      expect(e.statusCode).toBe(400)
    }
  })
})


