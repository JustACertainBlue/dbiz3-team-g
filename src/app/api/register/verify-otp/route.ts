import { NextResponse } from 'next/server'
import { RegistrationError, verifyRegistration } from '@/lib/auth/registration-service'
import { otpVerifySchema } from '@/lib/auth/registration-validation'
export async function POST(request: Request) {
  try {
    const parsed = otpVerifySchema.safeParse(await request.json())
    if (!parsed.success) return NextResponse.json({ otp_verified: false, error_message: 'Invalid OTP request' }, { status: 422 })
    return NextResponse.json((await verifyRegistration(parsed.data.registration_request_id, parsed.data.otp_code)))
  } catch (error) {
    return NextResponse.json({ otp_verified: false, error_message: error instanceof RegistrationError ? error.message : 'Verification Failed' }, { status: error instanceof RegistrationError ? error.status : 500 })
  }
}
