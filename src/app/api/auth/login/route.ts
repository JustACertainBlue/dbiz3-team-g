import { NextResponse } from "next/server";
import { authenticate } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    const result = await authenticate(email, password);

    if (!result.success) {
      return NextResponse.json(
        {
          error_message: result.errorMessage,
          ...(result.emptyFieldErrors ? { empty_field_errors: result.emptyFieldErrors } : {}),
        },
        { status: result.status }
      );
    }

    const response = NextResponse.json({
      session_token: result.sessionToken,
      role: result.role,
      admin_type: result.adminType,
      permission_set: result.permissionSet,
      must_change_password: result.mustChangePassword,
      landing_screen_id: result.landingScreenId,
      redirect_url: result.redirectUrl,
    });

    if (result.sessionToken) {
      response.cookies.set("session_token", result.sessionToken, {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error_message: "Internal server error" },
      { status: 500 }
    );
  }
}
