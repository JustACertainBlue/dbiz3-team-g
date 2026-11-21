import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as { React?: typeof React }).React = React
const cookie = vi.hoisted(() => ({ account: 'agency' }))
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: cookie.account }) }) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: () => {}, refresh: () => {} }), redirect: () => { throw new Error('redirect') }, notFound: () => { throw new Error('notFound') } }))

import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createBooking } from '@/lib/booking/create-booking'
import { groupPrice, rulesOf } from '@/lib/booking/group-price'
import AgencyDetail from '@/app/agency/[agencyId]/bookings/[bookingId]/page'
import ProviderDetail from '@/app/provider/[providerId]/bookings/[bookingId]/page'
import AgencyList from '@/app/agency/[agencyId]/bookings/page'

// Price display on 05, 06/07 and 10c/10: the group discount follows the rules; "Điều chỉnh theo thoả thuận" appears
// when the agreed price differs from the rule price; the list price is struck out only when the final price is below it.
const provider = DEMO_IDENTITIES.provider
const AGENCY = DEMO_IDENTITIES.agency.agencyId!
const PROVIDER = provider.providerId!
const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const html = async (element: Promise<React.ReactElement>) => renderToStaticMarkup(await element)

async function book(delta: number) {
  const repo = demoRepository()
  const experience = repo.find('experiences', r => r.experience_id === EXPERIENCE)!
  const list = Number(experience.price_per_person) * 10
  const rule = groupPrice(Number(experience.price_per_person), 10, rulesOf(repo.all('experience_discount_rules') as never, EXPERIENCE))
  const agreed = rule.total + delta
  const { booking_id } = await createBooking(provider, {
    experience_id: EXPERIENCE, agency_id: AGENCY, start_at: '2099-01-05T09:00:00+07:00', duration: 60, group_size: 10, agreed_price: agreed,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  }, { now: () => new Date('2098-12-31T09:00:00+07:00') })
  return { booking_id, list, rule, agreed }
}
const pages = async (id: string) => {
  cookie.account = 'agency'
  const agency = await html(AgencyDetail({ params: { agencyId: AGENCY, bookingId: id } }) as never)
  const list = await html(AgencyList({ params: { agencyId: AGENCY }, searchParams: { tab: 'all', q: `HAB-${id.slice(0, 6)}` } }) as never)
  cookie.account = 'provider'
  const prov = await html(ProviderDetail({ params: { providerId: PROVIDER, bookingId: id } }) as never)
  return { agency, list, prov }
}

describe('price display on the booking screens', () => {
  beforeEach(() => demoRepository().reset())

  it('equal to the rule price: group discount shown, no adjustment line, list price struck out', async () => {
    const { booking_id, list, rule } = await book(0)
    expect(rule.old).not.toBeNull() // the fixture experience has a discount rule for 10 guests
    for (const markup of Object.values(await pages(booking_id))) {
      expect(markup).not.toContain('Điều chỉnh theo thoả thuận')
      expect(markup).toContain(list.toLocaleString('vi-VN'))
    }
    expect((await pages(booking_id)).agency).toContain('v3a-old')
  })
  it('lower than the rule price: "−X ₫" line on every screen, list price struck out', async () => {
    const { booking_id } = await book(-25000)
    const result = await pages(booking_id)
    for (const markup of Object.values(result)) expect(markup).toContain('Điều chỉnh theo thoả thuận: −25.000 ₫')
    expect(result.agency).toContain('v3a-old'); expect(result.list).toContain('v3g-old')
  })
  it('higher than the rule price: "+X ₫" line; struck out only while the final price is below the list price', async () => {
    const { booking_id, list, agreed } = await book(10000)
    const below = await pages(booking_id)
    for (const markup of Object.values(below)) expect(markup).toContain('Điều chỉnh theo thoả thuận: +10.000 ₫')
    expect(agreed < list).toBe(true)
    expect(below.agency).toContain('v3a-old')
    // price above the list price: no strike
    demoRepository().update('bookings', r => r.booking_id === booking_id, { agreed_price_total: String(list + 50000) })
    const above = await pages(booking_id)
    expect(above.agency).not.toContain('v3a-old'); expect(above.list).not.toContain('v3g-old')
    for (const markup of Object.values(above)) expect(markup).toMatch(/Điều chỉnh theo thoả thuận: \+\d/)
  })
})
