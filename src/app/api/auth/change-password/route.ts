import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { changePassword } from "@/lib/password-change";

export async function POST(request: Request) {
  try {
    let token = "";
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      const cookieHeader = request.headers.get("cookie") || "";
      const match = cookieHeader.match(/session_token=([^;]+)/);
      if (match) {
        token = match[1];
      }
    }

    if (!token) {
      return NextResponse.json(
        { error_message: "Unauthorized" },
        { status: 401 }
      );
    }

    const session = await verifySession(token);
    if (!session.valid || !session.userId) {
      return NextResponse.json(
        { error_message: session.errorMessage || "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { current_password, new_password, confirm_new_password } = body;

    if (!current_password || !new_password || !confirm_new_password) {
      return NextResponse.json(
        { error_message: "All fields are required" },
        { status: 400 }
      );
    }

    const result = await changePassword({
      userId: session.userId,
      currentPassword: current_password,
      newPassword: new_password,
      confirmNewPassword: confirm_new_password,
    });

    if (!result.success) {
      return NextResponse.json(
        { error_message: result.errorMessage },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        success_message: result.successMessage,
        password_updated_at: result.passwordUpdatedAt,
        audit_log_id: result.auditLogId,
        redirect_url: result.redirectUrl,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Change password route error:", error);
    return NextResponse.json(
      { error_message: "Internal server error" },
      { status: 500 }
    );
  }
}
