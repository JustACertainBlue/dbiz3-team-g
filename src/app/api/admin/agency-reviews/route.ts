import { NextResponse } from "next/server";
import { verifySession } from "@/lib/auth";
import { getAgencyReviewDetails, reviewAgencyRegistration } from "@/lib/agency-review";

function extractToken(request: Request): string {
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/session_token=([^;]+)/);
  return match ? match[1] : "";
}

export async function GET(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySession(token);
    if (!session.valid || session.role !== "ADMIN" || session.adminType !== "HDT") {
      return NextResponse.json({ error: "Forbidden: HDT Admin only" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const agencyId = searchParams.get("agencyId");
    if (!agencyId) {
      return NextResponse.json({ error: "Missing agencyId parameter" }, { status: 400 });
    }

    const details = await getAgencyReviewDetails(agencyId);
    if (!details) {
      return NextResponse.json({ error: "Agency not found" }, { status: 404 });
    }

    return NextResponse.json(details, { status: 200 });
  } catch (error) {
    console.error("GET /api/admin/agency-reviews error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = extractToken(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const session = await verifySession(token);
    if (!session.valid || session.role !== "ADMIN" || session.adminType !== "HDT" || !session.userId) {
      return NextResponse.json({ error: "Forbidden: HDT Admin only" }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { agency_id, decision, review_comment } = body;

    if (!agency_id || !decision) {
      return NextResponse.json({ error: "agency_id and decision are required" }, { status: 400 });
    }

    const result = await reviewAgencyRegistration({
      agencyId: agency_id,
      hdtUserId: session.userId,
      decision,
      reviewComment: review_comment,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.errorMessage }, { status: result.status });
    }

    return NextResponse.json(
      {
        decision_record: result.decisionRecord,
        account_status: result.accountStatus,
        major_change_review_status: "Not Applicable",
        review_history_entry: result.reviewHistoryEntry,
        notification_status: {
          in_app: "Success",
          email: "Success",
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/admin/agency-reviews error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
