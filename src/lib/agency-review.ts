import { query as defaultQuery } from "./db";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs";
import type pg from "pg";

const repoRoot = path.resolve(process.cwd());
const outboxDir = path.join(repoRoot, "var", "outbox");

function ensureOutboxDir() {
  if (!fs.existsSync(outboxDir)) {
    fs.mkdirSync(outboxDir, { recursive: true });
  }
}

export interface ReviewAgencyInput {
  agencyId: string;
  hdtUserId: string;
  decision: "Approve" | "Request More Information" | "Reject";
  reviewComment?: string;
}

export interface ReviewAgencyResult {
  success: boolean;
  status: number;
  errorMessage?: string;
  accountStatus?: "Pending Approval" | "Approved" | "Rejected";
  decisionRecord?: {
    decision: string;
    hdtUserId: string;
    decidedAt: string;
  };
  reviewHistoryEntry?: {
    decision: string;
    comments?: string;
    decidedAt: string;
  };
  resubmissionToken?: string;
}

export async function getAgencyReviewDetails(
  agencyId: string,
  pool?: pg.Pool
) {
  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  const res = await queryFn(
    `SELECT a.agency_id, a.user_id, a.registration_request_id, a.company_name, a.company_type,
            a.tax_id, a.location, a.contact_info, a.team_size, a.tour_types,
            u.account_status, u.role_code, u.email, u.created_at as created_date, u.last_login,
            r.current_version_no
     FROM agency_profiles a
     JOIN user_accounts u ON a.user_id = u.user_id
     JOIN agency_registration_requests r ON a.registration_request_id = r.registration_request_id
     WHERE a.agency_id = $1`,
    [agencyId]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];

  // Documents
  const docRes = await queryFn(
    `SELECT d.document_type, f.file_name, f.storage_key
     FROM registration_documents d
     JOIN stored_files f ON d.file_id = f.file_id
     WHERE d.registration_request_id = $1 AND d.version_no = $2`,
    [row.registration_request_id, row.current_version_no]
  );

  // Review history
  const historyRes = await queryFn(
    `SELECT review_id, decision, comments, decided_at, hdt_user_id
     FROM agency_review_records
     WHERE registration_request_id = $1
     ORDER BY decided_at DESC`,
    [row.registration_request_id]
  );

  return {
    agency_id: row.agency_id,
    user_id: row.user_id,
    registration_request_id: row.registration_request_id,
    version_no: row.current_version_no,
    role: row.role_code,
    status: row.account_status,
    organization: row.company_name,
    created_date: row.created_date,
    last_login: row.last_login,
    submitted_profile: {
      company_name: row.company_name,
      company_type: row.company_type,
      tax_id: row.tax_id,
      location: typeof row.location === "string" ? JSON.parse(row.location) : row.location,
      contact_information: typeof row.contact_info === "string" ? JSON.parse(row.contact_info) : row.contact_info,
      team_size: row.team_size,
      tour_types: typeof row.tour_types === "string" ? JSON.parse(row.tour_types) : row.tour_types,
    },
    documents: docRes.rows,
    review_history: historyRes.rows,
  };
}

export async function reviewAgencyRegistration(
  input: ReviewAgencyInput,
  pool?: pg.Pool
): Promise<ReviewAgencyResult> {
  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  if (
    (input.decision === "Request More Information" || input.decision === "Reject") &&
    (!input.reviewComment || input.reviewComment.trim() === "")
  ) {
    return {
      success: false,
      status: 400,
      errorMessage: "Review comment is required for this decision",
    };
  }

  const agencyRes = await queryFn(
    `SELECT a.agency_id, a.user_id, a.registration_request_id, r.current_version_no, u.email, u.account_status
     FROM agency_profiles a
     JOIN agency_registration_requests r ON a.registration_request_id = r.registration_request_id
     JOIN user_accounts u ON a.user_id = u.user_id
     WHERE a.agency_id = $1`,
    [input.agencyId]
  );

  if (agencyRes.rows.length === 0) {
    return {
      success: false,
      status: 404,
      errorMessage: "Agency registration not found",
    };
  }

  const agency = agencyRes.rows[0];
  const decidedAt = new Date().toISOString();

  // 1. Record review record
  await queryFn(
    `INSERT INTO agency_review_records (
      review_id, registration_request_id, registration_version_no,
      hdt_user_id, decision, comments, decided_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, $4, $5, CURRENT_TIMESTAMP
    )`,
    [
      agency.registration_request_id,
      agency.current_version_no,
      input.hdtUserId,
      input.decision,
      input.reviewComment || null,
    ]
  );

  let newAccountStatus: "Pending Approval" | "Approved" | "Rejected" = "Pending Approval";
  let tokenString: string | undefined = undefined;

  if (input.decision === "Approve") {
    newAccountStatus = "Approved";

    await queryFn(
      `UPDATE user_accounts
       SET account_status = 'Approved', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [agency.user_id]
    );

    await queryFn(
      `UPDATE agency_registration_requests
       SET current_status = 'Approved', updated_at = CURRENT_TIMESTAMP
       WHERE registration_request_id = $1`,
      [agency.registration_request_id]
    );

    // Outbox notification
    ensureOutboxDir();
    fs.writeFileSync(
      path.join(outboxDir, `agency_approved_${agency.agency_id}_${Date.now()}.json`),
      JSON.stringify({
        to: agency.email,
        subject: "Your Tour Agency registration has been approved",
        decision: "Approve",
        decided_at: decidedAt,
      }, null, 2)
    );
  } else if (input.decision === "Request More Information") {
    // BR-014: Account remains Pending Approval
    newAccountStatus = "Pending Approval";

    await queryFn(
      `UPDATE agency_registration_requests
       SET current_status = 'Request More Information', updated_at = CURRENT_TIMESTAMP
       WHERE registration_request_id = $1`,
      [agency.registration_request_id]
    );

    // Invalidate previous resubmission tokens
    await queryFn(
      `UPDATE registration_resubmission_tokens
       SET invalidated_at = CURRENT_TIMESTAMP
       WHERE registration_request_id = $1 AND used_at IS NULL AND invalidated_at IS NULL`,
      [agency.registration_request_id]
    );

    // Create 24h single-use resubmission token (BR-016)
    tokenString = randomUUID();
    await queryFn(
      `INSERT INTO registration_resubmission_tokens (
        token_id, registration_request_id, token_verifier, issued_at, expires_at
      ) VALUES (
        gen_random_uuid(), $1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + interval '24 hours'
      )`,
      [agency.registration_request_id, tokenString]
    );

    // Outbox notification
    ensureOutboxDir();
    fs.writeFileSync(
      path.join(outboxDir, `agency_request_more_info_${agency.agency_id}_${Date.now()}.json`),
      JSON.stringify({
        to: agency.email,
        subject: "More information required for your registration",
        decision: "Request More Information",
        comments: input.reviewComment,
        resubmission_token: tokenString,
        edit_url: `/register?token=${tokenString}`,
        decided_at: decidedAt,
      }, null, 2)
    );
  } else if (input.decision === "Reject") {
    newAccountStatus = "Rejected";

    await queryFn(
      `UPDATE user_accounts
       SET account_status = 'Rejected', updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [agency.user_id]
    );

    await queryFn(
      `UPDATE agency_registration_requests
       SET current_status = 'Rejected', updated_at = CURRENT_TIMESTAMP
       WHERE registration_request_id = $1`,
      [agency.registration_request_id]
    );

    // Outbox notification
    ensureOutboxDir();
    fs.writeFileSync(
      path.join(outboxDir, `agency_rejected_${agency.agency_id}_${Date.now()}.json`),
      JSON.stringify({
        to: agency.email,
        subject: "Your Tour Agency registration was rejected",
        decision: "Reject",
        comments: input.reviewComment,
        decided_at: decidedAt,
      }, null, 2)
    );
  }

  return {
    success: true,
    status: 200,
    accountStatus: newAccountStatus,
    decisionRecord: {
      decision: input.decision,
      hdtUserId: input.hdtUserId,
      decidedAt,
    },
    reviewHistoryEntry: {
      decision: input.decision,
      comments: input.reviewComment,
      decidedAt,
    },
    resubmissionToken: tokenString,
  };
}
