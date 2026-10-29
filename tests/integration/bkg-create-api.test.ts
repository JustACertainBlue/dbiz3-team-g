import { beforeEach, describe, expect, it } from 'vitest'
import { demoRepository } from '@/lib/demo/json-repository'
import { POST } from '@/app/api/bkg/bookings/route'

// T016: POST /api/bkg/bookings through the route handler, with the demo session cookie.
// Contract: specs/004-bkg-core/contracts/create-booking-api.md. The route uses the wall clock,
// so dates here are a future Monday (2027-01-04) inside the Provider's 08:00–17:00 window.
const body = {
  experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
  agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb',
  start_at: '2027-01-04T09:00:00+07:00',
  duration: 60,
  group_size: 10,
  agreed_price: 2000000,
  booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
}

function request(account: string, payload: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/bkg/bookings', {
    method: 'POST',
    headers: { cookie: `hab_demo_account=${account}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
}

async function call(account: string, payload: Record<string, unknown>) {
  const response = await POST(request(account, payload) as never)
  return { status: response.status, json: await response.json() as { data?: Record<string, unknown>; error?: { code: string } } }
}

const bookingCount = () => demoRepository().all('bookings').length

describe('T016 | POST /api/bkg/bookings', () => {
  beforeEach(() => demoRepository().reset())

  it('creates an On hold Booking for the Provider and returns the FR-003 body', async () => {
    const { status, json } = await call('provider', body)
    expect(status).toBe(201)
    expect(Object.keys(json.data!).sort()).toEqual(['booking_id', 'created_at', 'hold_expires_at', 'private_schedule_synced', 'public_schedule_block', 'status'])
    expect(json.data!.status).toBe('On hold')
  })

  it('rejects the same request twice with SLOT_UNAVAILABLE', async () => {
    await call('provider', body)
    const before = bookingCount()
    const { status, json } = await call('provider', body)
    expect(status).toBe(409)
    expect(json.error?.code).toBe('SLOT_UNAVAILABLE')
    expect(bookingCount()).toBe(before)
  })

  it('forbids a Tour Agency (AS-6)', async () => {
    const before = bookingCount()
    const { status, json } = await call('agency', body)
    expect(status).toBe(403)
    expect(json.error?.code).toBe('FORBIDDEN')
    expect(bookingCount()).toBe(before)
  })

  it('rejects a Disabled Agency with AGENCY_NOT_ELIGIBLE (#39)', async () => {
    const before = bookingCount()
    const { status, json } = await call('provider', { ...body, agency_id: 'ab81de3b-a65e-5f0d-9407-894ac464a0e9' })
    expect(status).toBe(409)
    expect(json.error?.code).toBe('AGENCY_NOT_ELIGIBLE')
    expect(bookingCount()).toBe(before)
  })

  it('rejects group_size above max_participants with VALIDATION_ERROR', async () => {
    const { status, json } = await call('provider', { ...body, group_size: 13 })
    expect(status).toBe(400)
    expect(json.error?.code).toBe('VALIDATION_ERROR')
  })

  it('returns NOT_FOUND for an unknown Experience', async () => {
    const { status, json } = await call('provider', { ...body, experience_id: '00000000-0000-4000-8000-000000000000' })
    expect(status).toBe(404)
    expect(json.error?.code).toBe('NOT_FOUND')
  })
})
