import { NextRequest, NextResponse } from 'next/server'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { BookingError } from '@/lib/booking/create-booking'
import { startExpiryTimer } from '@/lib/booking/expire-holds'
import { markGroupArrival } from '@/lib/booking/mark-arrival'

// F-SCHED-06 Mark Group Arrival. A rejected arrival is 200 with transition_applied = false (FR-006).
// Contract: specs/011-bkg-manage/contracts/manage-booking-api.md
startExpiryTimer()

type Context = { params: { bookingId: string } }

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const data = await markGroupArrival(demoSessionFromRequest(request), params.bookingId)
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.statusCode })
    }
    return NextResponse.json({ error: { code: 'BOOKING_FAILED', message: 'Arrival could not be recorded' } }, { status: 500 })
  }
}
