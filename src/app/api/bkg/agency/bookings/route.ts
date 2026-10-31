import { NextRequest, NextResponse } from 'next/server'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { listAgencyBookings } from '@/lib/booking/agency-bookings'
import { BookingError } from '@/lib/booking/create-booking'

// F-SCHED-02 Agency bookings (screens BKG137, SCH141). Contract: specs/013-bkg-schedule/contracts/schedule-api.md
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const query = Object.fromEntries(['status', 'village_id', 'date_from', 'date_to'].map(name => [name, params.get(name) ?? undefined]))
  try {
    const data = await listAgencyBookings(demoSessionFromRequest(request), query)
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.statusCode })
    }
    return NextResponse.json({ error: { code: 'BOOKING_FAILED', message: 'Bookings could not be listed' } }, { status: 500 })
  }
}
