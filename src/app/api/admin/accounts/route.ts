import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { listAccounts } from "@/lib/account-management";

// GET /api/admin/accounts — F-AUTH-21, FR-021, FR-016
export async function GET(req: NextRequest): Promise<NextResponse> {
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

  const { searchParams } = new URL(req.url);
  const organizationId = searchParams.get("organization_id") || undefined;
  const role = searchParams.get("role") || undefined;
  const status = searchParams.get("status") || undefined;
  const dateFrom = searchParams.get("date_from") || undefined;
  const dateTo = searchParams.get("date_to") || undefined;
  const pageStr = searchParams.get("page");
  const pageSizeStr = searchParams.get("page_size");

  const page = pageStr ? parseInt(pageStr, 10) : 1;
  const pageSize = pageSizeStr ? parseInt(pageSizeStr, 10) : 50;

  const result = await listAccounts({
    actorUserId: session.userId!,
    actorRole: session.role,
    actorAdminType: session.adminType ?? undefined,
    organizationId,
    role,
    status,
    dateFrom,
    dateTo,
    page,
    pageSize,
  });

  if (!result.success) {
    return NextResponse.json(
      { error_message: result.errorMessage },
      { status: result.status }
    );
  }

  return NextResponse.json({
    users: result.users,
    total_count: result.total_count,
  });
}
