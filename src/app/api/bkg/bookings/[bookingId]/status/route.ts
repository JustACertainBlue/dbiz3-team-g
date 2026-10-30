import { NextRequest, NextResponse } from 'next/server'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { changeBookingStatus } from '@/lib/booking/change-status'
import { BookingError } from '@/lib/booking/create-booking'
import { startExpiryTimer } from '@/lib/booking/expire-holds'

// F-SCHED-05 Booking status change. Contract: specs/011-bkg-manage/contracts/manage-booking-api.md
startExpiryTimer()

type Context = { params: { bookingId: string } }

export async function POST(request: NextRequest, { params }: Context) {
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
    const data = await changeBookingStatus(demoSessionFromRequest(request), params.bookingId, body as Record<string, unknown>)
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.statusCode })
    }
    return NextResponse.json({ error: { code: 'BOOKING_FAILED', message: 'Booking status could not be changed' } }, { status: 500 })
  }
}
