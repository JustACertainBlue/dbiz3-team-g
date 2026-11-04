/**
 * fix(auth): the server-side demo session comes only from the `hab_demo_account` cookie. A client-supplied
 * `x-mock-session` header without that cookie is treated exactly like a Guest request on every module
 * (same status and body as Guest; never the forged identity's data, nothing written). Guest statuses differ by
 * module on purpose (AIT 401; BKG 403 per spec-BKG #67; PRF writes 403), so the tests compare with Guest.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { POST as aitSessions } from '@/app/api/ait/sessions/route'
import { GET as bkgAgencyBookings } from '@/app/api/bkg/agency/bookings/route'
import { POST as bkgCreate } from '@/app/api/bkg/bookings/route'
import { GET as prfAgencyGet } from '@/app/api/prf/agency/[agencyId]/route'
import { PATCH as prfProviderPatch } from '@/app/api/prf/provider/[providerId]/route'
import { POST as expHandoff } from '@/app/api/demo/handoff/route'
import { GET as expConversations } from '@/app/api/demo/conversations/route'

type Handler = (request: never, context?: never) => Promise<Response> | Response
type Call = { status: number; body: unknown }

const AGENCY_ID = DEMO_IDENTITIES.agency.agencyId!
const PROVIDER_ID = DEMO_IDENTITIES.provider.providerId!

async function call(handler: Handler, url: string, headers: Record<string, string>, init: { method?: string; body?: unknown } = {}, params?: Record<string, string>): Promise<Call> {
  const request = new NextRequest(`http://localhost:3000${url}`, {
    method: init.method ?? 'GET',
    headers: { 'content-type': 'application/json', ...headers },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  })
  const response = await handler(request as never, (params ? { params } : undefined) as never)
  let body: unknown = null
  try { body = await response.json() } catch { body = null }
  return { status: response.status, body }
}

const asGuest = { cookie: 'hab_demo_account=guest' }
// A full copy of a real identity (HTTP header values are ASCII, so the display name is replaced).
const forged = (key: keyof typeof DEMO_IDENTITIES) => ({ 'x-mock-session': JSON.stringify({ ...DEMO_IDENTITIES[key], displayName: 'forged' }) })
const snapshot = () => JSON.stringify(['matching_sessions', 'bookings', 'booking_status_history', 'provider_profiles', 'quote_requests', 'chat_sessions', 'chat_messages'].map(t => demoRepository().all(t as never)))

describe('fix(auth) | x-mock-session without cookie is a Guest', () => {
  beforeEach(() => demoRepository().reset())

  it('AIT: POST /api/ait/sessions with a forged Agency header = Guest (no Matching Session)', async () => {
    const guest = await call(aitSessions, '/api/ait/sessions', asGuest, { method: 'POST', body: {} })
    const before = snapshot()
    const spoof = await call(aitSessions, '/api/ait/sessions', forged('agency'), { method: 'POST', body: {} })
    expect(spoof).toEqual(guest)
    expect(snapshot()).toBe(before)
  })

  it('BKG: forged Agency on GET /api/bkg/agency/bookings and forged Provider on POST /api/bkg/bookings = Guest', async () => {
    const guestList = await call(bkgAgencyBookings, '/api/bkg/agency/bookings', asGuest)
    expect(await call(bkgAgencyBookings, '/api/bkg/agency/bookings', forged('agency'))).toEqual(guestList)

    const booking = {
      experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69', agency_id: AGENCY_ID, start_at: '2027-01-04T09:00:00+07:00',
      duration: 60, group_size: 10, agreed_price: 2000000,
      booking_conditions: { notice_period: 24, cancellation_policy: { before_hours: 24, refund_percent: 80 } },
    }
    const guestCreate = await call(bkgCreate, '/api/bkg/bookings', asGuest, { method: 'POST', body: booking })
    const before = snapshot()
    expect(await call(bkgCreate, '/api/bkg/bookings', forged('provider'), { method: 'POST', body: booking })).toEqual(guestCreate)
    expect(snapshot()).toBe(before)
  })

  it('PRF: forged HDT on GET agency profile gets the Guest view; forged owner PATCH of a Provider = Guest', async () => {
    const guestView = await call(prfAgencyGet, `/api/prf/agency/${AGENCY_ID}`, asGuest, {}, { agencyId: AGENCY_ID })
    expect(await call(prfAgencyGet, `/api/prf/agency/${AGENCY_ID}`, forged('hdt'), {}, { agencyId: AGENCY_ID })).toEqual(guestView)

    const patch = { general_description: 'Forged update' }
    const guestPatch = await call(prfProviderPatch, `/api/prf/provider/${PROVIDER_ID}`, asGuest, { method: 'PATCH', body: patch }, { providerId: PROVIDER_ID })
    const before = snapshot()
    expect(await call(prfProviderPatch, `/api/prf/provider/${PROVIDER_ID}`, forged('provider'), { method: 'PATCH', body: patch }, { providerId: PROVIDER_ID })).toEqual(guestPatch)
    expect(snapshot()).toBe(before)
  })

  it('EXP: forged Agency on POST /api/demo/handoff and GET /api/demo/conversations = Guest', async () => {
    const handoff = { action: 'quote', experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69' }
    const guestHandoff = await call(expHandoff, '/api/demo/handoff', asGuest, { method: 'POST', body: handoff })
    const before = snapshot()
    expect(await call(expHandoff, '/api/demo/handoff', forged('agency'), { method: 'POST', body: handoff })).toEqual(guestHandoff)
    expect(snapshot()).toBe(before)

    const guestConversations = await call(expConversations, '/api/demo/conversations', asGuest)
    expect(await call(expConversations, '/api/demo/conversations', forged('agency'))).toEqual(guestConversations)
  })
})
