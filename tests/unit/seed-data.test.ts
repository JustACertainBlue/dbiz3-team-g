/**
 * T004 — Seed data loader verification
 * Loads data/seed/ and validates 4 Hanoi craft villages and
 * experience pricing fixtures from Session 5 data package.
 *
 * CONSTITUTION II: This test must FAIL before T005 (seed-loader.ts) is implemented.
 */
import { describe, it, expect } from 'vitest'
import { loadVillages, loadExperiences } from '@/lib/db/seed-loader'

describe('T004 | Seed Data Loader Verification', () => {
  it('loads exactly 4 Hanoi craft villages from data/seed/', async () => {
    const villages = await loadVillages()
    expect(villages).toHaveLength(4)
  })

  it('returns the 4 canonical Hanoi craft villages by name', async () => {
    const villages = await loadVillages()
    const names = villages.map((v: { village_name: string }) => v.village_name)
    expect(names).toContain('Bat Trang Ceramic Village')
    expect(names).toContain('Van Phuc Silk Village')
    expect(names).toContain('Duong Lam Ancient Village')
    expect(names).toContain('Chuong Conical Hat Village')
  })

  it('loads experiences with numeric price_per_person from data/seed/', async () => {
    const experiences = await loadExperiences()
    expect(experiences.length).toBeGreaterThan(0)
    for (const exp of experiences) {
      expect(typeof (exp as { price_per_person: number }).price_per_person).toBe('number')
      expect((exp as { price_per_person: number }).price_per_person).toBeGreaterThan(0)
    }
  })

  it('all seed experiences belong to providers with a verified profile', async () => {
    const experiences = await loadExperiences()
    for (const exp of experiences) {
      expect(
        (exp as { provider_verification_status: string }).provider_verification_status
      ).toBe('Approved')
    }
  })
})
