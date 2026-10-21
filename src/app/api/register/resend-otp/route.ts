import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { resendOtp } from "@/lib/otp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { registration_request_id } = body;

    if (!registration_request_id) {
      return NextResponse.json(
        { resent: false, error_message: "Missing registration_request_id" },
        { status: 400 }
      );
    }

    const reqRes = await query<{ email: string }>(
      "SELECT email FROM agency_registration_requests WHERE registration_request_id = $1",
      [registration_request_id]
    );

    if (reqRes.rows.length === 0) {
      return NextResponse.json(
        { resent: false, error_message: "Registration request not found" },
        { status: 404 }
      );
    }

    const email = reqRes.rows[0].email;

    try {
      await resendOtp(registration_request_id, email);
    } catch (err: any) {
      if (err.message === "Resend Limit Exceeded") {
        return NextResponse.json(
          { resent: false, error_message: "Resend Limit Exceeded" },
          { status: 429 }
        );
      }
      throw err;
    }

    return NextResponse.json({ resent: true }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { resent: false, error_message: err.message || "Failed to resend OTP" },
      { status: 500 }
    );
  }
}
