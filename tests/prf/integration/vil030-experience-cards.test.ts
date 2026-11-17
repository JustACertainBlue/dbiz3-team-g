/**
 * Issue #227 — VIL030 "Featured Experience cards" (screen-spec-VIL030.md §3 #4, data source F-PROFILE-03, F-EXPLORE-02):
 * each card carries the F-EXPLORE-02 card fields — image, provider (workshop) name, and the price only when the viewer is
 * permitted (Tour Agency); a Guest or other actor gets no price (spec-EXP FR-001/FR-002 visibility).
 */
import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { GET as getVillage } from '@/app/api/demo/villages/[id]/route'
import { providerSession, agencyOwnerSession, demoCookie } from '../helpers/mockSession'

const repo = demoRepository()
const owner = providerSession()
const villageOf = () => repo.find('provider_profiles', row => row.provider_id === owner.providerId)!.village_id
const call = async (cookie?: string) =>
  (await getVillage(new Request('http://localhost', cookie ? { headers: { cookie } } : undefined), { params: { id: villageOf() } })).json()

describe('#227 | VIL030 Experience cards follow the F-EXPLORE-02 card', () => {
  beforeEach(() => repo.reset())

  it('an Agency sees image, workshop name and price on each featured Experience', async () => {
    const body = await call(demoCookie(agencyOwnerSession()))
    expect(body.featured_experiences.length).toBeGreaterThan(0)
    for (const card of body.featured_experiences) {
      const row = repo.find('experiences', item => item.experience_id === card.experience_id)!
      expect(card.provider_name).toBe(body.providers.find((p: { provider_id: string }) => p.provider_id === row.provider_id).business_name)
      expect(card).toHaveProperty('image')
      expect(card.image === null || typeof card.image === 'string').toBe(true)
      expect(card.price_per_person).toBe(Number(row.price_per_person))
    }
    const listedProviderIds = new Set(body.providers.map((provider: { provider_id: string }) => provider.provider_id))
    const actualPrices = repo.all('experiences')
      .filter(row => listedProviderIds.has(row.provider_id) && !row.archived_at)
      .map(row => Number(row.price_per_person))
      .filter(Number.isFinite)
    expect(body.starting_price).toBe(Math.min(...actualPrices))
  })

  it('a Guest gets the image and workshop name but no price', async () => {
    const body = await call()
    expect(body.starting_price).toBeNull()
    expect(body.featured_experiences.length).toBeGreaterThan(0)
    for (const card of body.featured_experiences) {
      expect(card).toHaveProperty('provider_name')
      expect(card).toHaveProperty('image')
      expect(card).not.toHaveProperty('price_per_person')
    }
  })

  it('the page renders the image, workshop name and (when present) the price', () => {
    const page = readFileSync('src/app/village/[villageId]/page.tsx', 'utf8')
    expect(page).toContain('<MediaImage src={item.image} alt={item.name} />')
    expect(page).toContain('{item.provider_name}')
    expect(page).toContain('starting_price')
    expect(page).toContain('Giá chỉ từ')
    expect(page).toMatch(/item\.price_per_person !== undefined && .*\/khách/)
  })
})
