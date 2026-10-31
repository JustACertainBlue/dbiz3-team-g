import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { createBooking } from '@/lib/booking/create-booking'
import * as bookingRoute from '@/app/api/bkg/bookings/[bookingId]/route'

// T031: GET /api/bkg/bookings/{id} (F-SCHED-07) and #57 PATCH body; contract manage-booking-api.md.
// Routes use the wall clock, so the fixture is on a future Monday inside 08:00–17:00.
type Handler = (request: never, context: { params: { bookingId: string } }) => Promise<Response>
type Body = { data?: Record<string, unknown> & { actions?: Record<string, boolean> }; error?: { code: string } }
const BOOKED_HONG_HA = '4bf17b30-9819-5c47-b745-06be7171087b'
const routes = bookingRoute as unknown as Record<'GET' | 'PATCH', Handler>

async function call(method: 'GET' | 'PATCH', bookingId: string, account: string, body?: Record<string, unknown>) {
  const request = new Request(`http://localhost:3000/api/bkg/bookings/${bookingId}`, {
    method,
    headers: { cookie: `hab_demo_account=${account}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  const response = await routes[method](request as never, { params: { bookingId } })
  return { status: response.status, json: await response.json() as Body }
}

async function fixture() {
  return (await createBooking(DEMO_IDENTITIES.provider, {
    experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
    start_at: '2027-01-04T09:00:00+07:00', duration: 60, group_size: 10, agreed_price: 2000000,
    booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
  })).booking_id
}

describe('T031 | GET /api/bkg/bookings/{id}', () => {
  beforeEach(() => demoRepository().reset())

  it('provider → 200 with agency_contact and actions', async () => {
    const id = await fixture()
    const result = await call('GET', id, 'provider')
    expect(result.status).toBe(200)
    expect(result.json.data?.agency_contact).toBeTruthy()
    expect(result.json.data?.actions).toEqual({ confirm: true, update: true, cancel: true, mark_arrival: false })
  })

  it('agency (Tràng An) on its own Booking → 200 read-only, all actions false', async () => {
    const id = await fixture()
    const result = await call('GET', id, 'agency')
    expect(result.status).toBe(200)
    expect(result.json.data?.provider_profile_link).toBe('/explore/providers/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374')
    expect(result.json.data?.actions).toEqual({ confirm: false, update: false, cancel: false, mark_arrival: false })
  })

  it('agency on another Agency Booking, ubnd, hdt, guest → 403; unknown → 404', async () => {
    expect((await call('GET', BOOKED_HONG_HA, 'agency')).status).toBe(403)
    for (const account of ['ubnd', 'hdt', 'guest']) expect((await call('GET', BOOKED_HONG_HA, account)).status).toBe(403)
    const unknown = await call('GET', 'no-such-booking', 'provider')
    expect(unknown.status).toBe(404)
    expect(unknown.json.error?.code).toBe('NOT_FOUND')
  })

  it('#57: PATCH updated_booking equals the next GET body, with numeric fields', async () => {
    const id = await fixture()
    const patched = await call('PATCH', id, 'provider', { group_size: 11 })
    expect(patched.status).toBe(200)
    const updated = patched.json.data?.updated_booking as Record<string, unknown>
    expect(typeof updated.group_size).toBe('number')
    expect(typeof updated.agreed_price).toBe('number')
    expect(typeof updated.notice_period).toBe('number')
    expect(updated).toMatchObject({ group_size: 11, agreed_price: 2000000 })
    const read = await call('GET', id, 'provider')
    expect(updated).toEqual(read.json.data)
  })
})
