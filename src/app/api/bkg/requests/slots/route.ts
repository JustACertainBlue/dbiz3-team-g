import { NextRequest, NextResponse } from 'next/server'
import { freeSlotsOn } from '@/lib/booking/free-slots'

// Free slots of an experience on a date, for the request form of 04/24. Same data as the public table "Giá & lịch trống".
export async function GET(request: NextRequest) {
  const params = new URL(request.url).searchParams
  const experienceId = params.get('experience_id') ?? ''
  const date = params.get('date') ?? ''
  if (!experienceId || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'experience_id and date (YYYY-MM-DD) are required' } }, { status: 400 })
  }
  return NextResponse.json({ data: { slots: await freeSlotsOn(experienceId, date) } })
}
