import { NextResponse } from "next/server";
import { logoutSession } from "@/lib/auth";

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
      const response = NextResponse.json(
        {
          session_terminated: true,
          confirmation_message: "Logged out",
          redirect_url: "/login",
        },
        { status: 200 }
      );
      response.cookies.set("session_token", "", {
        path: "/",
        maxAge: 0,
        httpOnly: true,
        sameSite: "lax",
      });
      return response;
    }

    const result = await logoutSession(token);

    const response = NextResponse.json({
      session_terminated: true,
      confirmation_message: result.confirmationMessage,
      redirect_url: result.redirectUrl || "/login",
    });

    response.cookies.set("session_token", "", {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
