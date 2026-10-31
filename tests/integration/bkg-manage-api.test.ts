import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createBooking } from '@/lib/booking/create-booking'
import { PATCH } from '@/app/api/bkg/bookings/[bookingId]/route'
import { POST as POST_STATUS } from '@/app/api/bkg/bookings/[bookingId]/status/route'
import { POST as POST_ARRIVAL } from '@/app/api/bkg/bookings/[bookingId]/arrival/route'

// T016: US-5 routes with the demo session cookie; contract specs/011-bkg-manage/contracts/manage-booking-api.md.
// Routes use the wall clock, so fixtures are on future Mondays inside 08:00–17:00.
type Handler = (request: never, context: { params: { bookingId: string } }) => Promise<Response>
const BOOKED_PAST = '4bf17b30-9819-5c47-b745-06be7171087b' // started 2026-10-05

async function call(handler: Handler, method: string, bookingId: string, account: string, body?: Record<string, unknown>) {
  const request = new Request(`http://localhost:3000/api/bkg/bookings/${bookingId}`, {
    method,
    headers: { cookie: `hab_demo_account=${account}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const response = await handler(request as never, { params: { bookingId } })
  return { status: response.status, json: await response.json() as Record<string, unknown> & { data?: Record<string, unknown>; error?: { code: string } } }
}

async function fixture(startAt = '2027-01-04T09:00:00+07:00') {
  return (await createBooking(DEMO_IDENTITIES.provider, {
    experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
    start_at: startAt, duration: 60, group_size: 10, agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  })).booking_id
}

describe('T016 | US-5 API', () => {
  beforeEach(() => demoRepository().reset())

  it('PATCH: 200 on change, 200 with null ids on no-op (#52), 409 outside hours, 400 bad field', async () => {
    const id = await fixture()
    const changed = await call(PATCH as Handler, 'PATCH', id, 'provider', { group_size: 11 })
    expect(changed.status).toBe(200)
    expect(changed.json.data?.audit_log_id).toEqual(expect.any(String))
    const noop = await call(PATCH as Handler, 'PATCH', id, 'provider', { group_size: 11 })
    expect(noop.status).toBe(200)
    expect(noop.json.data).toMatchObject({ audit_log_id: null, agency_notification_message_id: null })
    expect((await call(PATCH as Handler, 'PATCH', id, 'provider', { start_at: '2027-01-04T16:30:00+07:00' })).json.error?.code).toBe('SLOT_UNAVAILABLE')
    expect((await call(PATCH as Handler, 'PATCH', id, 'provider', { status: 'Booked' })).status).toBe(400)
  })

  it('PATCH on a Cancelled Booking: 409 BOOKING_TERMINAL', async () => {
    const id = await fixture()
    await call(POST_STATUS as Handler, 'POST', id, 'provider', { target_status: 'Cancelled', cancellation_reason: 'Group postponed' })
    const result = await call(PATCH as Handler, 'PATCH', id, 'provider', { group_size: 9 })
    expect(result.status).toBe(409)
    expect(result.json.error?.code).toBe('BOOKING_TERMINAL')
  })

  it('POST status: 200 confirm, 409 INVALID_TRANSITION on a second confirm, 400 cancel without reason', async () => {
    const id = await fixture()
    const confirmed = await call(POST_STATUS as Handler, 'POST', id, 'provider', { target_status: 'Booked' })
    expect(confirmed.status).toBe(200)
    expect(confirmed.json.data?.booking_status).toBe('Booked')
    const again = await call(POST_STATUS as Handler, 'POST', id, 'provider', { target_status: 'Booked' })
    expect(again.status).toBe(409)
    expect(again.json.error?.code).toBe('INVALID_TRANSITION')
    expect((await call(POST_STATUS as Handler, 'POST', id, 'provider', { target_status: 'Cancelled' })).status).toBe(400)
  })

  it('POST arrival: applied on a started Booked Booking, not applied before the start', async () => {
    const applied = await call(POST_ARRIVAL as Handler, 'POST', BOOKED_PAST, 'provider')
    expect(applied.status).toBe(200)
    expect(applied.json.data).toMatchObject({ transition_applied: true, booking_status: 'Completed' })

    const id = await fixture()
    await call(POST_STATUS as Handler, 'POST', id, 'provider', { target_status: 'Booked' })
    const early = await call(POST_ARRIVAL as Handler, 'POST', id, 'provider')
    expect(early.status).toBe(200)
    expect(early.json.data).toMatchObject({ transition_applied: false, validation_error: 'Tour Start Time Not Reached' })
  })

  it('every route as the Tour Agency: 403', async () => {
    const id = await fixture()
    expect((await call(PATCH as Handler, 'PATCH', id, 'agency', { group_size: 11 })).status).toBe(403)
    expect((await call(POST_STATUS as Handler, 'POST', id, 'agency', { target_status: 'Booked' })).status).toBe(403)
    expect((await call(POST_ARRIVAL as Handler, 'POST', BOOKED_PAST, 'agency')).status).toBe(403)
  })

  it('unknown Booking: 404', async () => {
    const unknown = '00000000-0000-4000-8000-000000000000'
    expect((await call(PATCH as Handler, 'PATCH', unknown, 'provider', { group_size: 11 })).status).toBe(404)
    expect((await call(POST_STATUS as Handler, 'POST', unknown, 'provider', { target_status: 'Booked' })).status).toBe(404)
    expect((await call(POST_ARRIVAL as Handler, 'POST', unknown, 'provider')).status).toBe(404)
  })
})
