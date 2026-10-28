import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { createUbndAccount } from "@/lib/account-creation";

// POST /api/admin/accounts/ubnd  — F-AUTH-19, FR-019, FR-016
export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessionToken = req.cookies.get("session_token")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error_message: "Unauthorized" }, { status: 401 });
  }

  const session = await verifySession(sessionToken);
  if (!session.valid) {
    return NextResponse.json({ error_message: "Unauthorized" }, { status: 401 });
  }

  // FR-016: only ADMIN/HDT can create UBND accounts (AS-3)
  if (session.role !== "ADMIN" || session.adminType !== "HDT") {
    return NextResponse.json(
      { error_message: "Forbidden: only HDT admins can create UBND accounts" },
      { status: 403 }
    );
  }

  let body: { name?: string; email?: string; phone?: string; assigned_village_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error_message: "Invalid request body" }, { status: 400 });
  }

  const result = await createUbndAccount({
    name: body.name ?? "",
    email: body.email ?? "",
    phone: body.phone ?? "",
    assignedVillageId: body.assigned_village_id ?? "",
    assignedByUserId: session.userId!,
    actorAdminType: session.adminType ?? "",
  });

  if (!result.success) {
    return NextResponse.json(
      {
        error_message: result.errorMessage,
        field_errors: result.fieldErrors,
      },
      { status: result.status }
    );
  }

  return NextResponse.json(
    {
      user_id: result.userId,
      account_status: result.accountStatus,
      must_change_password: result.mustChangePassword,
      credential_email_status: result.credentialEmailStatus,
      village_assignment: result.villageAssignment,
      success_notification: result.successNotification,
    },
    { status: 201 }
  );
}
