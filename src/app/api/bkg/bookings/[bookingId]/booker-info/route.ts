import { NextRequest, NextResponse } from 'next/server'
import { sessionContextFromRequest } from '@/lib/auth/session'
import { confirmBookerInfo } from '@/lib/booking/booker-info'
import { BookingError } from '@/lib/booking/create-booking'

// Screen 06 "Hoàn tất đặt chỗ": save the booker's contact and send "Công ty báo đã thanh toán" (status unchanged).
export async function POST(request: NextRequest, { params }: { params: { bookingId: string } }) {
  let body: unknown
  try { body = await request.json() } catch {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Body must be JSON' } }, { status: 400 })
  }
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Body must be a JSON object' } }, { status: 400 })
  }
  try {
    await confirmBookerInfo(await sessionContextFromRequest(request), params.bookingId, body as Record<string, unknown>)
    return NextResponse.json({ data: { saved: true } })
  } catch (error) {
    if (error instanceof BookingError) return NextResponse.json({ error: { code: error.code, message: error.message } }, { status: error.statusCode })
    return NextResponse.json({ error: { code: 'BOOKING_FAILED', message: 'Thông tin chưa lưu được' } }, { status: 500 })
  }
}
