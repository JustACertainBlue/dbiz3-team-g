import { NextRequest, NextResponse } from 'next/server'
import { demoSessionFromRequest } from '@/lib/auth/demo-session'
import { BookingError } from '@/lib/booking/create-booking'
import { getProviderSchedule } from '@/lib/booking/provider-schedule'

// F-SCHED-01 Provider Schedule (screens SCH139, SCH140). Contract: specs/013-bkg-schedule/contracts/schedule-api.md
type Context = { params: { providerId: string } }

export async function GET(request: NextRequest, { params }: Context) {
  const search = new URL(request.url).searchParams
  try {
    const data = await getProviderSchedule(demoSessionFromRequest(request), params.providerId, {
      date_from: search.get('date_from') ?? undefined,
      date_to: search.get('date_to') ?? undefined,
    })
    return NextResponse.json({ data })
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.statusCode })
    }
    return NextResponse.json({ error: { code: 'BOOKING_FAILED', message: 'Schedule could not be loaded' } }, { status: 500 })
  }
}
