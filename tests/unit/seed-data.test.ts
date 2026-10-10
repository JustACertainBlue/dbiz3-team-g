/**
 * T004 — Seed data loader verification
 * Loads data/seed/ and validates real values from the Session 5 data package.
 *
 * CONSTITUTION I/IV: Data only from data/. Tests must check real seed values, not invented ones.
 * Workshop 3.1: At least one test loads seed data and checks a value the data package states.
 */
import { describe, it, expect } from 'vitest'
import { loadVillages, loadExperiences } from '@/lib/db/seed-loader'

describe('T004 | Seed Data Loader Verification', () => {
  // villages.csv has 8 rows
  it('loads exactly 8 Hanoi craft villages from data/seed/villages.csv', async () => {
    const villages = await loadVillages()
    expect(villages).toHaveLength(8)
  })

  it('includes active villages Bát Tràng, Vạn Phúc, Chuông, Quất Động, Phú Vinh', async () => {
    const villages = await loadVillages()
    const names = villages.map(v => v.name)
    expect(names).toContain('Bát Tràng')
    expect(names).toContain('Vạn Phúc')
    expect(names).toContain('Chuông')
    expect(names).toContain('Quất Động')
    expect(names).toContain('Phú Vinh')
  })

  it('Hạ Thái is inactive (is_active === false) as stated in seed', async () => {
    const villages = await loadVillages()
    const haThai = villages.find(v => v.name === 'Hạ Thái')
    expect(haThai).toBeDefined()
    expect(haThai!.is_active).toBe(false)
  })

  it('does NOT contain fabricated Đường Lâm village (not in seed)', async () => {
    const villages = await loadVillages()
    const names = villages.map(v => v.name)
    expect(names).not.toContain('Đường Lâm')
  })

  it('loads experiences with numeric price_per_person from data/seed/experiences.csv', async () => {
    const experiences = await loadExperiences()
    expect(experiences.length).toBeGreaterThan(0)
    for (const exp of experiences) {
      expect(typeof exp.price_per_person).toBe('number')
      expect(exp.price_per_person).toBeGreaterThan(0)
    }
  })

  it('all loaded experiences belong to providers with Verified status + published profile', async () => {
    const experiences = await loadExperiences()
    for (const exp of experiences) {
      expect(exp.provider_verification_status).toBe('Approved')
      expect(exp.has_published_profile_version).toBe(true)
    }
  })

  it('seed has 5 verified providers → at most 5 eligible non-archived experiences', async () => {
    // provider_profiles.csv: 5 rows have verification_status=Verified AND published_version_no set
    // (Phú Vinh, Quất Động, Bát Tràng, Vạn Phúc, Chuông); archived Hạ Thái exp excluded
    const experiences = await loadExperiences()
    expect(experiences.length).toBeLessThanOrEqual(5)
    expect(experiences.length).toBeGreaterThanOrEqual(4)
  })

  it('Bát Tràng "Nặn gốm" has max_participants=12 as in seed', async () => {
    const experiences = await loadExperiences()
    const exp = experiences.find(e => e.experience_id === 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69')
    expect(exp).toBeDefined()
    expect(exp!.max_participants).toBe(12)
  })

  it('Vạn Phúc "Dệt lụa" has max_participants=13 as in seed', async () => {
    const experiences = await loadExperiences()
    const exp = experiences.find(e => e.experience_id === 'c8281688-2dc1-5cb1-9ff6-139df04ba562')
    expect(exp).toBeDefined()
    expect(exp!.max_participants).toBe(13)
  })

  it('Chuông "Làm nón lá" has max_participants=15 as in seed', async () => {
    const experiences = await loadExperiences()
    const exp = experiences.find(e => e.experience_id === 'b70bd0fa-6a81-5aec-9ff6-5303210b2fad')
    expect(exp).toBeDefined()
    expect(exp!.max_participants).toBe(15)
  })
})
