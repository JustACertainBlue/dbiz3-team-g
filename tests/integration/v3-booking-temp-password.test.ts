import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { demoRepository } from '@/lib/demo/json-repository'
import { PRODUCT_SESSION_COOKIE, authenticatePrototype } from '@/lib/auth/product-session'
import { POST as postRequest } from '@/app/api/bkg/requests/route'
import { POST as postBookerInfo } from '@/app/api/bkg/bookings/[bookingId]/booker-info/route'
import { POST as postStatus } from '@/app/api/bkg/bookings/[bookingId]/status/route'
import { POST as postBooking } from '@/app/api/bkg/bookings/route'

// A session that must still change its temporary password may only use the change-password panel:
// every new booking API treats it as a guest (sessionContextFromRequest).
const AGENCY_EMAIL = 'thanhvien13@example.invalid'
const PROVIDER_EMAIL = 'thanhvien19@example.invalid'
const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69'
const BOOKED = '4bf17b30-9819-5c47-b745-06be7171087b'

async function tokenFor(email: string, mustChange: boolean): Promise<string> {
  // The fixture login needs a seed hash; the flag is ignored for seed hashes, so swap in a non-seed hash afterwards.
  const result = await authenticatePrototype(email, 'any-test-value')
  if (!result.ok) throw new Error(`login failed for the fixture: ${result.reason}`)
  demoRepository().update('user_accounts', row => row.email === email, { must_change_password: mustChange ? 'true' : 'false', password_hash: '$2a$10$fixturehashfixturehashfixtu' })
  return result.token
}
const call = (handler: (request: NextRequest, context: { params: { bookingId: string } }) => Promise<Response>, url: string, token: string, body: unknown, bookingId = BOOKED) =>
  handler(new NextRequest(url, { method: 'POST', headers: { cookie: `${PRODUCT_SESSION_COOKIE}=${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }), { params: { bookingId } })

describe('temporary-password session on the new booking APIs', () => {
  beforeEach(() => demoRepository().reset())

  it('agency: request, booker-info and status are refused (403) and nothing is written', async () => {
    const token = await tokenFor(AGENCY_EMAIL, true)
    const messages = demoRepository().all('chat_messages').length
    const sessions = demoRepository().all('sessions').length
    const request = await call(postRequest as never, 'http://localhost/api/bkg/requests', token, { experience_id: EXPERIENCE, date: '2026-12-01', group_size: 5 })
    const info = await call(postBookerInfo as never, 'http://localhost/api/bkg/bookings/x/booker-info', token, { contact_name: 'A', contact_phone: '0912345678' })
    const status = await call(postStatus as never, 'http://localhost/api/bkg/bookings/x/status', token, { target_status: 'Cancelled', cancellation_reason: 'x' })
    expect([request.status, info.status, status.status]).toEqual([403, 403, 403])
    expect(demoRepository().all('chat_messages')).toHaveLength(messages)
    expect(demoRepository().all('sessions')).toHaveLength(sessions)
  })
  it('provider: create booking is refused (403)', async () => {
    const token = await tokenFor(PROVIDER_EMAIL, true)
    const before = demoRepository().all('bookings').length
    const response = await call(postBooking as never, 'http://localhost/api/bkg/bookings', token, { experience_id: EXPERIENCE })
    expect(response.status).toBe(403)
    expect(demoRepository().all('bookings')).toHaveLength(before)
  })
  it('control: the same agency session without the flag can send a request', async () => {
    const token = await tokenFor(AGENCY_EMAIL, false)
    const response = await call(postRequest as never, 'http://localhost/api/bkg/requests', token, { experience_id: EXPERIENCE, date: '2099-12-01', group_size: 5 })
    expect(response.status).toBe(201)
  })
})
