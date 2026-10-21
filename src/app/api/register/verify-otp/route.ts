import { NextResponse } from "next/server";
import { otpVerifySchema } from "@/lib/validation";
import { verifyOtp, writeConfirmationOutboxFile } from "@/lib/otp";
import { createAgencyAccount } from "@/lib/registration";
import { query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const parseResult = otpVerifySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          otp_verified: false,
          error_message: "Invalid OTP",
        },
        { status: 400 }
      );
    }

    const { registration_request_id, otp_code } = parseResult.data;

    // 1. Verify OTP code
    const otpResult = await verifyOtp(registration_request_id, otp_code);
    if (!otpResult.valid) {
      let status = 400;
      if (
        otpResult.error === "Maximum Attempts Exceeded" ||
        otpResult.error === "Resend Limit Exceeded"
      ) {
        status = 429;
      } else if (otpResult.error === "Verification Failed") {
        status = 422;
      }

      return NextResponse.json(
        {
          otp_verified: false,
          error_message: otpResult.error,
        },
        { status }
      );
    }

    // 2. Create Agency Account, Agency Profile, and Audit Log in single atomic transaction
    let accountResult: { userId: string; agencyAccountId: string };
    try {
      accountResult = await createAgencyAccount(registration_request_id);
    } catch (err: any) {
      if (err.field === "tax_id" || err.message === "Tax ID already registered") {
        return NextResponse.json(
          {
            otp_verified: false,
            error_message: "Tax ID already registered",
          },
          { status: 422 }
        );
      }
      throw err;
    }

    // 3. Lookup user email for confirmation outbox
    const emailRes = await query<{ email: string }>(
      "SELECT email FROM user_accounts WHERE user_id = $1",
      [accountResult.userId]
    );
    const email = emailRes.rows[0]?.email || "";

    // 4. Attempt confirmation outbox write (non-transactional, Fail does not roll back account)
    let confirmationEmailStatus: "Success" | "Fail" = "Success";
    try {
      writeConfirmationOutboxFile(
        email,
        accountResult.userId,
        accountResult.agencyAccountId
      );
    } catch {
      confirmationEmailStatus = "Fail";
    }

    return NextResponse.json(
      {
        otp_verified: true,
        user_id: accountResult.userId,
        agency_account_id: accountResult.agencyAccountId,
        account_status: "Pending Approval",
        confirmation_email_status: confirmationEmailStatus,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        otp_verified: false,
        error_message: error.message || "Verification Failed",
      },
      { status: 500 }
    );
  }
}
