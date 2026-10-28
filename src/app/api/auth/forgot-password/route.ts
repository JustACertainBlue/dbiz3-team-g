import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/recovery";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email } = body;

    const ip = request.headers.get("x-forwarded-for") || undefined;
    const result = await requestPasswordReset(email, ip);

    if (!result.success) {
      return NextResponse.json(
        { error_message: result.errorMessage },
        { status: result.status }
      );
    }

    return NextResponse.json({
      result_message: result.resultMessage,
      email_delivery_status: result.emailDeliveryStatus,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error_message: "Internal server error" },
      { status: 500 }
    );
  }
}
