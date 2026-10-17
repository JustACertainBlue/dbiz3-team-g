/**
 * T008 – PRF seed data smoke test
 * Loads data/seed/ CSV files and verifies values stated by the Session 5 data package.
 *
 * CONSTITUTION I/II/IV: All assertions use real seed values; no invented data.
 * Workshop requirement (§3.1): "Include one test that loads seed data and checks
 * one value that the Session 5 data package already states."
 *
 * These tests MUST FAIL until the seed loader is available (from AIT merge or
 * equivalent implementation). Do NOT write code to make them pass in Step 5.
 *
 * Real seed values verified below (from data/seed/ CSV files):
 *   provider_profiles.csv  — 8 providers, statuses: Verified×5, Pending Verification×1,
 *                            Draft×1, Revision Required×1
 *   experiences.csv        — 8 experiences; Nặn gốm price_per_person=150000 (VND)
 *   provider_operating_hours.csv — 8 rows; Bát Tràng provider weekday=1 local_start=08:00
 */
import { describe, it, expect } from 'vitest'
import { loadProviderProfiles, loadExperiences, loadOperatingHours } from '@/lib/prf/seed-reader'

describe('T008 | PRF Seed Data Smoke Test', () => {
  // ── provider_profiles ────────────────────────────────────────────────────

  describe('provider_profiles.csv', () => {
    it('loads 8 provider profiles from seed', async () => {
      const providers = await loadProviderProfiles()
      expect(providers).toHaveLength(8)
    })

    it('has at least one provider with verification_status = Draft (BR-006)', async () => {
      const providers = await loadProviderProfiles()
      const draft = providers.filter(p => p.verification_status === 'Draft')
      expect(draft.length).toBeGreaterThanOrEqual(1)
    })

    it('has at least one provider with verification_status = Pending Verification', async () => {
      const providers = await loadProviderProfiles()
      const pending = providers.filter(p => p.verification_status === 'Pending Verification')
      expect(pending.length).toBeGreaterThanOrEqual(1)
    })

    it('has at least 5 Verified providers (BR-007: eligible for public display)', async () => {
      const providers = await loadProviderProfiles()
      const verified = providers.filter(p => p.verification_status === 'Verified')
      expect(verified.length).toBeGreaterThanOrEqual(5)
    })

    it('all Verified providers have a non-null published_version_no (BR-007)', async () => {
      const providers = await loadProviderProfiles()
      const verified = providers.filter(p => p.verification_status === 'Verified')
      for (const p of verified) {
        expect(p.published_version_no).not.toBeNull()
        expect(p.published_version_no).not.toBeUndefined()
      }
    })

    it('Draft provider (c8e989d4) has null published_version_no', async () => {
      const providers = await loadProviderProfiles()
      const draft = providers.find(p => p.provider_id === 'c8e989d4-88be-5b00-8382-a41177c4c16d')
      expect(draft).toBeDefined()
      // Draft provider has no published version — BR-007 says only Verified versions are public
      expect(draft!.published_version_no == null || draft!.published_version_no === '').toBe(true)
    })
  })

  // ── experiences ──────────────────────────────────────────────────────────

  describe('experiences.csv', () => {
    it('loads 8 experiences from seed', async () => {
      const experiences = await loadExperiences()
      expect(experiences).toHaveLength(8)
    })

    it('all experiences have price_per_person > 0 (BR-010)', async () => {
      const experiences = await loadExperiences()
      for (const exp of experiences) {
        expect(exp.price_per_person).toBeGreaterThan(0)
      }
    })

    it('all experiences have max_participants > 0 (BR-010)', async () => {
      const experiences = await loadExperiences()
      for (const exp of experiences) {
        expect(exp.max_participants).toBeGreaterThan(0)
      }
    })

    it('all experiences have notice_period_hours >= 0 (BR-010)', async () => {
      const experiences = await loadExperiences()
      for (const exp of experiences) {
        expect(exp.notice_period_hours).toBeGreaterThanOrEqual(0)
      }
    })

    it('"Nặn gốm thủ công" (c9f9faf7) has price_per_person = 150000 VND as stated in seed', async () => {
      const experiences = await loadExperiences()
      const nanGom = experiences.find(e => e.experience_id === 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69')
      expect(nanGom).toBeDefined()
      expect(nanGom!.price_per_person).toBe(150000)
    })

    it('"Nặn gốm thủ công" has max_participants = 12 as stated in seed', async () => {
      const experiences = await loadExperiences()
      const nanGom = experiences.find(e => e.experience_id === 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69')
      expect(nanGom!.max_participants).toBe(12)
    })

    it('"Làm nón lá" (b70bd0fa) has price_per_person = 225000 VND as stated in seed', async () => {
      const experiences = await loadExperiences()
      const nonLa = experiences.find(e => e.experience_id === 'b70bd0fa-6a81-5aec-9ff6-5303210b2fad')
      expect(nonLa).toBeDefined()
      expect(nonLa!.price_per_person).toBe(225000)
    })

    it('"Vẽ sơn mài" (800b5192) is archived (archived_at is not null)', async () => {
      // Seed row has archived_at=2026-09-25 — it is the only archived experience
      const experiences = await loadExperiences()
      const sonMai = experiences.find(e => e.experience_id === '800b5192-03c7-5953-849b-32a321e12a47')
      expect(sonMai).toBeDefined()
      expect(sonMai!.archived_at).toBeTruthy()
    })
  })

  // ── provider_operating_hours ─────────────────────────────────────────────

  describe('provider_operating_hours.csv', () => {
    it('loads 8 operating hour rows from seed (BR-021: recurring weekly hours)', async () => {
      const hours = await loadOperatingHours()
      expect(hours).toHaveLength(8)
    })

    it('Bát Tràng provider (50f2c8fc) has an operating hours row with weekday=1 and local_start=08:00', async () => {
      const hours = await loadOperatingHours()
      const batTrang = hours.find(
        h => h.provider_id === '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374',
      )
      expect(batTrang).toBeDefined()
      expect(batTrang!.weekday).toBe(1)
      expect(batTrang!.local_start).toBe('08:00:00')
    })

    it('every row has local_end > local_start (sanity check)', async () => {
      const hours = await loadOperatingHours()
      for (const h of hours) {
        expect(h.local_end > h.local_start).toBe(true)
      }
    })
  })
})
