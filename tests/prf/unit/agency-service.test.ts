import { describe, it, expect } from 'vitest'
import {
  getAgencyProfile,
  updateAgencyProfile,
} from '@/lib/prf/agency-service'
import {
  agencyOwnerSession,
  guestSession,
  providerSession,
  ubndSession,
  hdtSession,
  SEED_IDS,
} from '../helpers/mockSession'

const AGENCY_ID = SEED_IDS.agency1
const OTHER_AGENCY_ID = '99999999-9999-9999-9999-999999999999'

describe('T040 | Agency Service Unit Tests (US-1)', () => {
  const owner = agencyOwnerSession(AGENCY_ID)
  const anotherAgency = agencyOwnerSession(OTHER_AGENCY_ID)

  // ── GET section ────────────────────────────────────────────────────────────
  describe('GET getAgencyProfile', () => {
    it('returns public fields for Guest without sensitive tax_id (BR-004)', async () => {
      const res = await getAgencyProfile(AGENCY_ID, guestSession())
      expect(res.agency_name).toBeDefined()
      expect(res.company_type).toBeDefined()
      expect((res as Record<string, unknown>).tax_id).toBeUndefined()
    })

    it('returns full fields including tax_id for owning Agency', async () => {
      const res = await getAgencyProfile(AGENCY_ID, owner)
      expect(res.tax_id).toBeDefined()
      expect(res.account_status).toBe('Approved')
    })
  })

  // ── PATCH section (US-1 / BR-001 / BR-017) ─────────────────────────────────
  describe('PATCH updateAgencyProfile', () => {
    it('rejects update by another Agency with 403 (BR-001, US-1 AC3)', async () => {
      try {
        await updateAgencyProfile(AGENCY_ID, anotherAgency, { description: 'Unauthorized edit' })
        expect.fail('Should reject with 403')
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        expect(e.statusCode).toBe(403)
      }
    })

    it('rejects update by unauthenticated Guest with 401/403', async () => {
      try {
        await updateAgencyProfile(AGENCY_ID, guestSession(), { description: 'Guest edit' })
        expect.fail('Should reject')
      } catch (err: unknown) {
        const e = err as { statusCode?: number }
        expect([401, 403]).toContain(e.statusCode)
      }
    })

    it('updates non-major fields immediately without HDT review (US-1 AC1)', async () => {
      const res = await updateAgencyProfile(AGENCY_ID, owner, {
        description: 'Mô tả công ty được cập nhật mới.',
        team_size: 20,
      }) as {
        success: boolean
        requires_hdt_rereview: boolean
      }
      expect(res.success).toBe(true)
      expect(res.requires_hdt_rereview).toBe(false)
    })

    it('flags major changes (company_name) for HDT re-review while keeping existing account Approved (BR-017, US-1 AC4)', async () => {
      const res = await updateAgencyProfile(AGENCY_ID, owner, {
        company_name: 'Tên Doanh Nghiệp Mới Co.',
      }) as {
        success: boolean
        requires_hdt_rereview: boolean
        account_status: string
      }
      expect(res.success).toBe(true)
      expect(res.requires_hdt_rereview).toBe(true)
      expect(res.account_status).toBe('Approved')
    })
  })

  // ─── T048: getAgencyProfile visibility (US-2 AC1–AC4) ──────────────────────
  describe('T048 | getAgencyProfile visibility – US-2', () => {
    it('Guest sees only basic info without contact or tax_id (AC1)', async () => {
      const res = await getAgencyProfile(AGENCY_ID, guestSession())
      expect(res.agency_name).toBeDefined()
      expect(res.company_type).toBeDefined()
      expect((res as Record<string, unknown>).contact).toBeUndefined()
      expect((res as Record<string, unknown>).tax_id).toBeUndefined()
    })

    it('HDT sees full details including tax_id and account_status (AC2)', async () => {
      const res = await getAgencyProfile(AGENCY_ID, hdtSession())
      expect(res.tax_id).toBeDefined()
      expect(res.account_status).toBe('Approved')
    })

    it('Local Provider / UBND sees contact but not tax_id (AC3)', async () => {
      const res = await getAgencyProfile(AGENCY_ID, ubndSession())
      expect(res.contact).toBeDefined()
      expect((res as Record<string, unknown>).tax_id).toBeUndefined()
    })

    it('Own agency sees full editable profile (AC4)', async () => {
      const res = await getAgencyProfile(AGENCY_ID, owner)
      expect(res.tax_id).toBeDefined()
      expect(res.tour_types).toBeDefined()
    })
  })
})

