import { query as defaultQuery } from "./db";
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

export interface ValidateTokenResult {
  valid: boolean;
  registrationRequestId?: string;
  errorMessage?: string;
}

export async function validateResubmissionToken(
  token: string,
  pool?: pg.Pool
): Promise<ValidateTokenResult> {
  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  if (!token) {
    return { valid: false, errorMessage: "Resubmission token is required" };
  }

  const res = await queryFn(
    `SELECT token_id, registration_request_id, expires_at, used_at, invalidated_at
     FROM registration_resubmission_tokens
     WHERE token_verifier = $1`,
    [token]
  );

  if (res.rows.length === 0) {
    return { valid: false, errorMessage: "Resubmission token is invalid or expired" };
  }

  const row = res.rows[0];

  if (row.used_at || row.invalidated_at || new Date(row.expires_at) < new Date()) {
    return { valid: false, errorMessage: "Resubmission token is invalid or expired" };
  }

  return { valid: true, registrationRequestId: row.registration_request_id };
}

export async function getResubmissionData(
  token: string,
  pool?: pg.Pool
) {
  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  const tokenVal = await validateResubmissionToken(token, pool);
  if (!tokenVal.valid || !tokenVal.registrationRequestId) {
    return null;
  }

  const res = await queryFn(
    `SELECT v.*, r.email
     FROM agency_registration_requests r
     JOIN registration_submission_versions v
       ON r.registration_request_id = v.registration_request_id
      AND r.current_version_no = v.version_no
     WHERE r.registration_request_id = $1`,
    [tokenVal.registrationRequestId]
  );

  if (res.rows.length === 0) {
    return null;
  }

  const row = res.rows[0];
  return {
    registration_request_id: row.registration_request_id,
    version_no: row.version_no,
    email: row.email,
    full_name: row.full_name,
    company_name: row.company_name,
    company_type: row.company_type,
    tax_id: row.tax_id,
    location: typeof row.location === "string" ? JSON.parse(row.location) : row.location,
    contact_information: typeof row.contact_information === "string" ? JSON.parse(row.contact_information) : row.contact_information,
    team_size: row.team_size,
    tour_types: typeof row.tour_types === "string" ? JSON.parse(row.tour_types) : row.tour_types,
  };
}

export interface ResubmitInput {
  resubmissionToken: string;
  updatedRegistrationData: {
    full_name: string;
    company_name: string;
    company_type: string;
    tax_id: string;
    location: any;
    contact_information: any;
    team_size: number;
    tour_types: string[];
  };
}

export async function resubmitRegistration(
  input: ResubmitInput,
  pool?: pg.Pool
) {
  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  const tokenVal = await validateResubmissionToken(input.resubmissionToken, pool);
  if (!tokenVal.valid || !tokenVal.registrationRequestId) {
    return {
      success: false,
      status: 400,
      errorMessage: tokenVal.errorMessage || "Invalid token",
    };
  }

  const reqId = tokenVal.registrationRequestId;

  // Get current version number
  const reqRes = await queryFn(
    `SELECT current_version_no, agency_user_id
     FROM agency_registration_requests
     WHERE registration_request_id = $1`,
    [reqId]
  );

  if (reqRes.rows.length === 0) {
    return { success: false, status: 404, errorMessage: "Registration request not found" };
  }

  const currentVersion = reqRes.rows[0].current_version_no;
  const newVersion = currentVersion + 1;
  const userId = reqRes.rows[0].agency_user_id;
  const data = input.updatedRegistrationData;

  // 1. Insert new version in registration_submission_versions
  await queryFn(
    `INSERT INTO registration_submission_versions (
      registration_request_id, version_no, submitted_at, submitted_by,
      full_name, company_name, company_type, tax_id, location,
      contact_information, team_size, tour_types
    ) VALUES (
      $1, $2, CURRENT_TIMESTAMP, $3,
      $4, $5, $6, $7, $8,
      $9, $10, $11
    )`,
    [
      reqId,
      newVersion,
      userId,
      data.full_name,
      data.company_name,
      data.company_type,
      data.tax_id,
      typeof data.location === "string" ? data.location : JSON.stringify(data.location),
      typeof data.contact_information === "string" ? data.contact_information : JSON.stringify(data.contact_information),
      data.team_size,
      typeof data.tour_types === "string" ? data.tour_types : JSON.stringify(data.tour_types),
    ]
  );

  // 2. Update agency_registration_requests to new version and Pending Approval
  await queryFn(
    `UPDATE agency_registration_requests
     SET current_version_no = $1,
         current_status = 'Pending Approval',
         updated_at = CURRENT_TIMESTAMP
     WHERE registration_request_id = $2`,
    [newVersion, reqId]
  );

  // 3. Update agency_profiles with revised details
  await queryFn(
    `UPDATE agency_profiles
     SET company_name = $1,
         company_type = $2,
         tax_id = $3,
         location = $4,
         contact_info = $5,
         team_size = $6,
         tour_types = $7,
         updated_at = CURRENT_TIMESTAMP
     WHERE registration_request_id = $8`,
    [
      data.company_name,
      data.company_type,
      data.tax_id,
      typeof data.location === "string" ? data.location : JSON.stringify(data.location),
      typeof data.contact_information === "string" ? data.contact_information : JSON.stringify(data.contact_information),
      data.team_size,
      typeof data.tour_types === "string" ? data.tour_types : JSON.stringify(data.tour_types),
      reqId,
    ]
  );

  // 4. Mark token used and invalidate older active tokens (BR-016)
  await queryFn(
    `UPDATE registration_resubmission_tokens
     SET used_at = CURRENT_TIMESTAMP
     WHERE token_verifier = $1`,
    [input.resubmissionToken]
  );

  await queryFn(
    `UPDATE registration_resubmission_tokens
     SET invalidated_at = CURRENT_TIMESTAMP
     WHERE registration_request_id = $1 AND token_verifier != $2 AND used_at IS NULL AND invalidated_at IS NULL`,
    [reqId, input.resubmissionToken]
  );

  // 5. Write notification outbox
  ensureOutboxDir();
  fs.writeFileSync(
    path.join(outboxDir, `resubmission_received_${reqId}_v${newVersion}_${Date.now()}.json`),
    JSON.stringify({
      registration_request_id: reqId,
      submission_version: newVersion,
      status: "Pending Approval",
      submitted_at: new Date().toISOString(),
    }, null, 2)
  );

  return {
    success: true,
    status: 200,
    registrationRequestId: reqId,
    submissionVersion: newVersion,
    reviewStatus: "Pending Approval",
    successMessage: "Registration resubmitted successfully",
    notificationStatus: {
      in_app: "Success",
      email: "Success",
    },
  };
}
