import { NextRequest, NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { createLocalProviderAccount } from "@/lib/account-creation";

// POST /api/admin/accounts/provider — F-AUTH-20, FR-020, FR-016
export async function POST(req: NextRequest): Promise<NextResponse> {
  const sessionToken = req.cookies.get("session_token")?.value;
  if (!sessionToken) {
    return NextResponse.json({ error_message: "Unauthorized" }, { status: 401 });
  }

  const session = await verifySession(sessionToken);
  if (!session.valid) {
    return NextResponse.json({ error_message: "Unauthorized" }, { status: 401 });
  }

  // FR-016 / BR-007: only ADMIN/UBND can create Local Provider accounts
  if (session.role !== "ADMIN" || session.adminType !== "UBND") {
    return NextResponse.json(
      { error_message: "Forbidden: only UBND admins can create Local Provider accounts" },
      { status: 403 }
    );
  }

  let body: {
    provider_name?: string;
    address?: string;
    contact?: {
      contact_person_name?: string;
      phone_number?: string;
    };
    email?: string;
    requested_village_id?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error_message: "Invalid request body" }, { status: 400 });
  }

  const result = await createLocalProviderAccount({
    actorUserId: session.userId!,
    actorAdminType: session.adminType ?? "",
    providerName: body.provider_name ?? "",
    address: body.address ?? "",
    contact: {
      contactPersonName: body.contact?.contact_person_name ?? "",
      phoneNumber: body.contact?.phone_number ?? "",
    },
    email: body.email ?? "",
    requestedVillageId: body.requested_village_id,
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
      success_notification: result.successNotification,
      provider_profile_id: result.providerProfileId,
      profile_verification_status: result.profileVerificationStatus,
    },
    { status: 201 }
  );
}
