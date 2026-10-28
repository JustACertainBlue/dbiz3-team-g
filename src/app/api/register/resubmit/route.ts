import { NextResponse } from "next/server";
import {
  validateResubmissionToken,
  getResubmissionData,
  resubmitRegistration,
} from "@/lib/resubmission";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const data = await getResubmissionData(token);
    if (!data) {
      return NextResponse.json(
        { error: "Resubmission token is invalid or expired" },
        { status: 400 }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("GET /api/register/resubmit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { resubmission_token, updated_registration_data } = body;

    if (!resubmission_token || !updated_registration_data) {
      return NextResponse.json(
        { error: "resubmission_token and updated_registration_data are required" },
        { status: 400 }
      );
    }

    const result = await resubmitRegistration({
      resubmissionToken: resubmission_token,
      updatedRegistrationData: updated_registration_data,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.errorMessage },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        registration_request_id: result.registrationRequestId,
        submission_version: result.submissionVersion,
        review_status: result.reviewStatus,
        success_message: result.successMessage,
        notification_status: result.notificationStatus,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/register/resubmit error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
