import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

;(globalThis as { React?: typeof React }).React = React
const cookie = vi.hoisted(() => ({ account: 'agency' }))
vi.mock('next/headers', () => ({ cookies: () => ({ get: () => ({ value: cookie.account }) }) }))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {}, refresh: () => {} }),
  redirect: () => { throw new Error('redirect') },
  notFound: () => { throw new Error('notFound') },
}))

import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createBooking } from '@/lib/booking/create-booking'
import { changeBookingStatus } from '@/lib/booking/change-status'
import { markGroupArrival } from '@/lib/booking/mark-arrival'
import AgencyDetail from '@/app/agency/[agencyId]/bookings/[bookingId]/page'

const provider = DEMO_IDENTITIES.provider
const AGENCY = DEMO_IDENTITIES.agency.agencyId!
const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const html = async (element: Promise<React.ReactElement>) => renderToStaticMarkup(await element)

async function createTestBooking() {
  const { booking_id } = await createBooking(provider, {
    experience_id: EXPERIENCE,
    agency_id: AGENCY,
    start_at: '2099-01-05T09:00:00+07:00',
    duration: 60,
    group_size: 10,
    agreed_price: 1_425_000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  }, { now: () => new Date('2098-12-31T09:00:00+07:00') })
  return booking_id
}

describe('D15: screen 07 (Booked) displays next steps and ask-more blocks', () => {
  beforeEach(() => {
    demoRepository().reset()
    cookie.account = 'agency'
  })

  it('shows "Việc tiếp theo" and "Cần hỏi gì thêm?" on screen 07 (Booked)', async () => {
    const id = await createTestBooking()
    await changeBookingStatus(provider, id, { target_status: 'Booked' }, { now: () => new Date('2098-12-31T10:00:00+07:00') })

    const markup = await html(AgencyDetail({ params: { agencyId: AGENCY, bookingId: id } }) as never)
    expect(markup).toContain('Đặt chỗ của đoàn đã được xác nhận!')
    expect(markup).toContain('Việc tiếp theo')
    expect(markup).toContain('Báo giờ xe đến cho xưởng')
    expect(markup).toContain('Đến đúng giờ')
    expect(markup).toContain('Cần hỏi gì thêm?')
    expect(markup).toContain('Nhắn trực tiếp cho')
    expect(markup).toContain('href="/messages"')
  })

  it('does not show D15 blocks on screen 06 (On hold)', async () => {
    const id = await createTestBooking()
    const markup = await html(AgencyDetail({ params: { agencyId: AGENCY, bookingId: id } }) as never)
    expect(markup).not.toContain('Việc tiếp theo')
    expect(markup).not.toContain('Cần hỏi gì thêm?')
  })

  it('does not show D15 blocks on Completed or Cancelled bookings', async () => {
    const id = await createTestBooking()
    await changeBookingStatus(provider, id, { target_status: 'Booked' }, { now: () => new Date('2098-12-31T10:00:00+07:00') })
    await markGroupArrival(provider, id, { now: () => new Date('2099-01-05T10:00:00+07:00') })
    const completedMarkup = await html(AgencyDetail({ params: { agencyId: AGENCY, bookingId: id } }) as never)
    expect(completedMarkup).not.toContain('Việc tiếp theo')
    expect(completedMarkup).not.toContain('Cần hỏi gì thêm?')

    const cancelledId = await createTestBooking()
    await changeBookingStatus(provider, cancelledId, { target_status: 'Cancelled', cancellation_reason: 'Đổi lịch' }, { now: () => new Date('2098-12-31T10:00:00+07:00') })
    const cancelledMarkup = await html(AgencyDetail({ params: { agencyId: AGENCY, bookingId: cancelledId } }) as never)
    expect(cancelledMarkup).not.toContain('Việc tiếp theo')
    expect(cancelledMarkup).not.toContain('Cần hỏi gì thêm?')
  })
})
