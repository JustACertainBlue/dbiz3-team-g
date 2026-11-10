/**
 * #242 adopted (spec PR #251): spec-ADM OQ #21 reopened and closed 2026-11-10 — the four metric cards follow the time,
 * village, Agency and Provider filters (BR-005; Agency and Provider combine with AND, BR-014).
 * Total Agencies = selected Agencies, or (Provider filter only) Agencies with a Booking with the selected Providers;
 * Total Providers the same in reverse; Total Bookings / Active Collaborations count only matching Bookings.
 * Expected values are computed here from the fixture, independently of metrics-service.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { calculateMetricCards } from '@/lib/adm/metrics-service'
import { createHdtSession } from '../helpers/mock-session'

const session = createHdtSession()
const P1 = { preset: 'Custom' as const, startDate: '2026-09-20T00:00:00+07:00', endDate: '2026-09-25T23:59:59+07:00' }
const value = (cards: { label: string; value: number }[], label: string) => cards.find(c => c.label === label)!.value
const inP1 = (createdAt: string) => Date.parse(createdAt) >= Date.parse(P1.startDate) && Date.parse(createdAt) <= Date.parse(P1.endDate)

describe('#242 / spec-ADM OQ #21 (2026-11-10) | metric cards follow Agency and Provider filters', () => {
  beforeEach(() => demoRepository().reset())

  it('an Agency filter narrows all four cards', async () => {
    const bookings = demoRepository().all('bookings')
    const agency = bookings.find(b => inP1(b.created_at))!.agency_id
    const own = bookings.filter(b => b.agency_id === agency)
    const unfiltered = await calculateMetricCards(session, P1)
    const cards = await calculateMetricCards(session, { ...P1, agencyIds: [agency] })
    expect(value(cards, 'Total Agencies')).toBe(1)
    expect(value(cards, 'Total Providers')).toBe(new Set(own.map(b => b.provider_id)).size)
    expect(value(cards, 'Total Bookings')).toBe(own.filter(b => inP1(b.created_at)).length)
    expect(value(cards, 'Total Bookings')).toBeLessThan(value(unfiltered, 'Total Bookings'))
    expect(value(cards, 'Active Collaborations')).toBeLessThanOrEqual(value(unfiltered, 'Active Collaborations'))
  })

  it('a Provider filter narrows the cards the other way round', async () => {
    const bookings = demoRepository().all('bookings')
    const provider = bookings.find(b => inP1(b.created_at))!.provider_id
    const own = bookings.filter(b => b.provider_id === provider)
    const cards = await calculateMetricCards(session, { ...P1, providerIds: [provider] })
    expect(value(cards, 'Total Providers')).toBe(1)
    expect(value(cards, 'Total Agencies')).toBe(new Set(own.map(b => b.agency_id)).size)
    expect(value(cards, 'Total Bookings')).toBe(own.filter(b => inP1(b.created_at)).length)
  })

  it('Agency AND Provider: Total Bookings counts only Bookings of that pair (BR-014)', async () => {
    const bookings = demoRepository().all('bookings')
    const pick = bookings.find(b => inP1(b.created_at))!
    const cards = await calculateMetricCards(session, { ...P1, agencyIds: [pick.agency_id], providerIds: [pick.provider_id] })
    expect(value(cards, 'Total Bookings')).toBe(bookings.filter(b => b.agency_id === pick.agency_id && b.provider_id === pick.provider_id && inP1(b.created_at)).length)
  })
})
