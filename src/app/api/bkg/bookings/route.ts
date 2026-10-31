import { NextRequest, NextResponse } from 'next/server'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { BookingError, createBooking } from '@/lib/booking/create-booking'
import { listProviderBookings } from '@/lib/booking/list-bookings'

// F-SCHED-03 Create Booking (screen BKG134). Contract: specs/004-bkg-core/contracts/create-booking-api.md
export async function POST(request: NextRequest) {
  const session = demoSessionFromRequest(request)
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Body must be JSON' } }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Body must be a JSON object' } }, { status: 400 })
  }
  try {
    const data = await createBooking(session, body as Record<string, unknown>)
    return NextResponse.json({ data }, { status: 201 })
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.statusCode })
    }
    return NextResponse.json({ error: { code: 'BOOKING_FAILED', message: 'Booking could not be created' } }, { status: 500 })
  }
}

// F-SCHED-10 List Bookings (screen BKG133). Contract: specs/012-bkg-list/contracts/list-bookings-api.md
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const query = Object.fromEntries(['provider_id', 'status', 'date_from', 'date_to', 'page', 'page_size'].map(name => [name, params.get(name) ?? undefined]))
  try {
    const data = await listProviderBookings(demoSessionFromRequest(request), query)
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.statusCode })
    }
    return NextResponse.json({ error: { code: 'BOOKING_FAILED', message: 'Bookings could not be listed' } }, { status: 500 })
  }
}
