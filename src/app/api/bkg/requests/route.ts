import { NextRequest, NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { createBookingRequest } from '@/lib/booking/booking-request'
import { BookingError } from '@/lib/booking/create-booking'

// "Gửi yêu cầu đặt chỗ" (screens 04, 24): a chat message with the request attached (UI v3 decision #12).
export async function POST(request: NextRequest) {
  const session = await sessionContextFromRequest(request)
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Body must be JSON' } }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Body must be a JSON object' } }, { status: 400 })
  }
  try {
    return NextResponse.json({ data: await createBookingRequest(session, body as Record<string, unknown>) }, { status: 201 })
  } catch (error) {
    if (error instanceof BookingError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.statusCode })
    return NextResponse.json({ error: { code: 'REQUEST_FAILED', message: 'Yêu cầu chưa gửi được' } }, { status: 500 })
  }
}
