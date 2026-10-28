import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { applyAccountAction } from "@/lib/account-management";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// POST /api/admin/accounts/[userId]/action — F-AUTH-22, FR-022, FR-016
export async function POST(req: NextRequest, { params }: RouteParams): Promise<NextResponse> {
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

  let body: { action_type?: "disable" | "enable" | "reset_password"; reason?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error_message: "Invalid request body" }, { status: 400 });
  }

  if (!body.action_type || !["disable", "enable", "reset_password"].includes(body.action_type)) {
    return NextResponse.json(
      { error_message: "action_type must be one of 'disable', 'enable', 'reset_password'" },
      { status: 400 }
    );
  }

  const result = await applyAccountAction({
    actorUserId: session.userId!,
    actorRole: session.role,
    actorAdminType: session.adminType ?? undefined,
    targetUserId: userId,
    actionType: body.action_type,
    reason: body.reason,
  });

  if (!result.success) {
    return NextResponse.json(
      { error_message: result.errorMessage },
      { status: result.status }
    );
  }

  return NextResponse.json(
    {
      account_status: result.accountStatus,
      sessions_invalidated: result.sessionsInvalidated,
      temporary_password_email_status: result.temporaryPasswordEmailStatus,
      user_notification_status: result.userNotificationStatus,
      audit_log_id: result.auditLogId,
    },
    { status: 200 }
  );
}
