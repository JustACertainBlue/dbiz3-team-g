import { NextResponse } from "next/server";
import { resetPasswordWithToken, validateResetToken } from "@/lib/recovery";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token") || "";

  const check = await validateResetToken(token);
  if (!check.valid) {
    return NextResponse.json(
      { error_message: check.errorMessage },
      { status: 400 }
    );
  }

  return NextResponse.json({ valid: true });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { token, new_password, confirm_password } = body;

    const result = await resetPasswordWithToken(token, new_password, confirm_password);

    if (!result.success) {
      return NextResponse.json(
        { error_message: result.errorMessage },
        { status: result.status }
      );
    }

    return NextResponse.json({
      success_message: result.successMessage,
      redirect_url: result.redirectUrl,
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error_message: "Internal server error" },
      { status: 500 }
    );
  }
}
