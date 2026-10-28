import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getAccountDetails } from "@/lib/account-management";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// GET /api/admin/accounts/[userId] — F-AUTH-21, ADM118
export async function GET(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const sessionToken = req.cookies.get("session_token")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error_message: "Unauthorized" }, { status: 401 });
  }

  const session = await verifySession(sessionToken);
  if (!session.valid) {
    return NextResponse.json({ error_message: "Unauthorized" }, { status: 401 });
  }

  if (session.role !== "ADMIN") {
    return NextResponse.json(
      { error_message: "Forbidden: Admin access required" },
      { status: 403 }
    );
  }

  const { userId } = await params;
  if (!userId) {
    return NextResponse.json({ error_message: "Missing userId parameter" }, { status: 400 });
  }

  const result = await getAccountDetails(
    session.userId!,
    session.role,
    session.adminType ?? undefined,
    userId
  );

  if (!result.success) {
    return NextResponse.json(
      { error_message: result.errorMessage },
      { status: result.status }
    );
  }

  return NextResponse.json({ account: result.account });
}
