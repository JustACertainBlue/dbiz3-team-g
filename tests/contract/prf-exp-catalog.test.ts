import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { GET as explore } from '@/app/api/explore/route'
import { POST as createExperienceRoute } from '@/app/api/prf/experience/route'
import { DELETE as deleteExperienceRoute } from '@/app/api/prf/experience/[experienceId]/route'
import { retrieveCandidates } from '@/lib/matching/candidate-repo'
import { demoRepository } from '@/lib/demo/json-repository'

// Integration contract §4 "PRF → EXP: catalog eligibility" (docs/test/integration-contract.md). The Provider
// writes through the PRF routes; Explore (and AIT, which reads the same tables) must show exactly the
// eligible records: PRF BR-007 / #32 (published Verified version), PRF BR-019 (archive), EXP BR-001
// (only eligible Providers/Experiences), EXP BR-003 (Guest sees no price), EXP FR-002 provider_name.
const PROVIDER = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374' // Xưởng thủ công Bát Tràng (demo provider)
const repo = () => demoRepository()
const image = (category: string) => ({ url: `https://img.test/${category}.jpg`, category, media_type: 'image/jpeg', file_size_bytes: 1000000, width_px: 1920, height_px: 1080 })
const experienceBody = (category = 'Workshop/Hands-on') => ({
  name: 'Contract PRF→EXP trải nghiệm', description: 'Trải nghiệm dùng cho contract test PRF → EXP.', category,
  duration_minutes: 90, price_per_person: 180000, max_participants: 8, notice_period_hours: 12,
  experience_location_address: 'Bát Tràng, Gia Lâm, Hà Nội', images: [image('Activity'), image('Space'), image('Product')],
})
const asProvider = (method: string, url: string, body?: unknown) => new Request(`http://localhost:3000${url}`, {
  method, headers: { cookie: 'hab_demo_account=provider', 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body),
})

async function exploreCards(cookie?: string) {
  const cards: any[] = []
  for (let page = 1; ; page++) {
    const response = await explore(new NextRequest(`http://localhost:3000/api/explore?page=${page}&page_size=50`, { headers: cookie ? { cookie } : {} }))
    expect(response.status).toBe(200)
    const body = await response.json()
    cards.push(...body.experience_cards)
    if (page * 50 >= body.pagination.total_count) return cards
  }
}
const publishedName = () => {
  const profile = repo().find('provider_profiles', row => row.provider_id === PROVIDER)!
  return repo().find('provider_profile_versions', row => row.provider_id === PROVIDER && row.version_no === profile.published_version_no)!.business_name
}
async function createViaPrf() {
  const response = await createExperienceRoute(asProvider('POST', '/api/prf/experience', experienceBody()))
  expect(response.status).toBe(201)
  return (await response.json()).experience_id as string
}

describe('Contract PRF → EXP | catalog eligibility (integration-contract §4)', () => {
  beforeEach(() => repo().reset())

  it('PRF FR-006 → EXP BR-001 / FR-002 / BR-003 (normal): an Experience saved through PRF is listed with the published Provider name, no price for Guest', async () => {
    const id = await createViaPrf()
    const card = (await exploreCards()).find(c => c.id === id)
    expect(card).toMatchObject({ provider_id: PROVIDER, provider_name: publishedName(), type: 'Workshop/Hands-on' })
    expect(card.price ?? null).toBeNull()
    expect((await retrieveCandidates()).some(c => c.experience_id === id)).toBe(true) // AIT reads the same record
  })

  it('PRF BR-019 (boundary): archiving through PRF removes the Experience from Explore and from AIT candidates', async () => {
    const id = await createViaPrf()
    repo().insert('bookings', { ...repo().all('bookings').find(b => b.status === 'Cancelled')!, booking_id: '00000000-0000-4000-8000-0000000000b1', experience_id: id, provider_id: PROVIDER })
    const response = await deleteExperienceRoute(asProvider('DELETE', `/api/prf/experience/${id}`), { params: { experienceId: id } })
    expect(await response.json()).toMatchObject({ action: 'archived' })
    expect((await exploreCards()).some(c => c.id === id)).toBe(false)
    expect((await retrieveCandidates()).some(c => c.experience_id === id)).toBe(false)
  })

  it('PRF #32 / AC-PRF-REVISION (boundary): a pending revision keeps the published version and its name on Explore', async () => {
    const id = await createViaPrf()
    const name = publishedName()
    const published = repo().find('provider_profile_versions', row => row.provider_id === PROVIDER && row.business_name === name)!
    repo().insert('provider_profile_versions', { ...published, version_no: String(Number(published.version_no) + 1), version_status: 'Pending Verification', business_name: 'Tên đang chờ duyệt' })
    const card = (await exploreCards()).find(c => c.id === id)
    expect(card?.provider_name).toBe(name)
    expect(JSON.stringify(await exploreCards())).not.toContain('Tên đang chờ duyệt')
  })

  it('PRF FR-006 / #88 → EXP (error): a category outside the spec enum is refused by PRF (400) and never reaches Explore', async () => {
    const before = (await exploreCards()).length
    const response = await createExperienceRoute(asProvider('POST', '/api/prf/experience', experienceBody('Ceramics')))
    expect(response.status).toBe(400)
    expect((await exploreCards()).length).toBe(before)
  })
})
