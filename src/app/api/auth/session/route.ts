import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";

export async function GET(request: Request) {
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
        {
          validation_result: "Role Revoked",
          force_logout: true,
          error_message: "No session token provided",
        },
        { status: 401 }
      );
    }

    const result = await verifySession(token);

    if (!result.valid) {
      return NextResponse.json(
        {
          validation_result: result.validationResult,
          force_logout: result.forceLogout,
          error_message: result.errorMessage,
        },
        { status: result.validationResult === "Account Disabled" ? 403 : 401 }
      );
    }

    return NextResponse.json({
      validation_result: result.validationResult,
      force_logout: result.forceLogout,
      user_id: result.userId,
      email: result.email,
      role: result.role,
      admin_type: result.adminType,
      permission_set: result.permissionSet,
    });
  } catch (error) {
    console.error("Session verification error:", error);
    return NextResponse.json(
      { error_message: "Internal server error" },
      { status: 500 }
    );
  }
}
