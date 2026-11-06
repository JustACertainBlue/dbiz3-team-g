import { NextResponse } from 'next/server'
import { RegistrationError, resendRegistrationOtp } from '@/lib/auth/registration-service'
import { registrationDelivery } from '@/lib/auth/registration-delivery'
import { z } from 'zod'
export async function POST(request: Request) {
  try {
    const parsed = z.object({ registration_request_id: z.string().uuid() }).safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ resent: false, error_message: 'Invalid registration request' }, { status: 422 })
    return NextResponse.json(await resendRegistrationOtp(parsed.data.registration_request_id, registrationDelivery()))
  } catch (error) {
    return NextResponse.json({ resent: false, error_message: error instanceof RegistrationError ? error.message : 'Unable to resend OTP' }, { status: error instanceof RegistrationError ? error.status : 500 })
  }
}
