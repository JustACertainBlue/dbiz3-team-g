import crypto from "node:crypto";
import type { Pool, PoolClient } from "pg";
import { getPool } from "./db";
import type { StoredFileRecord } from "@/types/registration";

export async function isDuplicateEmail(email: string, db?: Pool): Promise<boolean> {
  const pool = db || getPool();
  const res = await pool.query(
    "SELECT 1 FROM user_accounts WHERE lower(email) = lower($1) LIMIT 1",
    [email.trim()]
  );
  return res.rows.length > 0;
}

export interface ValidatedRegistrationData {
  full_name: string;
  email: string;
  password?: string;
  company_name: string;
  company_type: "Travel Agency" | "Tour Operator" | "TMC";
  tax_id: string;
  location: {
    street: string;
    ward: string;
    district: string;
    city_province: string;
  };
  contact_information: {
    contact_person_name: string;
    phone_number: string;
    business_email?: string;
  };
  team_size: number;
  tour_types: string[];
}

export async function createRegistrationRequest(
  data: ValidatedRegistrationData,
  passwordHash: string,
  storedFiles: StoredFileRecord[] = [],
  db?: Pool
): Promise<string> {
  const pool = db || getPool();
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    // Double check email uniqueness
    const dupCheck = await client.query(
      "SELECT 1 FROM user_accounts WHERE lower(email) = lower($1) LIMIT 1",
      [data.email.trim()]
    );
    if (dupCheck.rows.length > 0) {
      const err = new Error("Email already exists") as any;
      err.field = "email";
      throw err;
    }

    const registrationRequestId = crypto.randomUUID();

    // 1. Insert agency_registration_requests (status 'Awaiting OTP')
    await client.query(
      `INSERT INTO agency_registration_requests (
        registration_request_id, email, pending_password_hash,
        current_status, current_version_no, created_at, updated_at
      ) VALUES ($1, $2, $3, 'Awaiting OTP', 1, now(), now())`,
      [registrationRequestId, data.email.trim().toLowerCase(), passwordHash]
    );

    // 2. Insert registration_submission_versions (version 1)
    await client.query(
      `INSERT INTO registration_submission_versions (
        registration_request_id, version_no, submitted_at, submitted_by,
        full_name, company_name, company_type, tax_id,
        location, contact_information, team_size, tour_types
      ) VALUES (
        $1, 1, now(), null,
        $2, $3, $4, $5,
        $6, $7, $8, $9
      )`,
      [
        registrationRequestId,
        data.full_name,
        data.company_name,
        data.company_type,
        data.tax_id,
        JSON.stringify(data.location),
        JSON.stringify(data.contact_information),
        data.team_size,
        JSON.stringify(data.tour_types),
      ]
    );

    // 3. Insert stored_files and registration_documents
    for (const file of storedFiles) {
      await client.query(
        `INSERT INTO stored_files (
          file_id, storage_key, file_name, media_type, file_size_bytes,
          width_px, height_px, uploaded_by, created_at
        ) VALUES ($1, $2, $3, $4, $5, null, null, null, now())`,
        [
          file.file_id,
          file.storage_key,
          file.file_name,
          file.media_type,
          file.file_size_bytes,
        ]
      );

      await client.query(
        `INSERT INTO registration_documents (
          registration_request_id, version_no, file_id, document_type
        ) VALUES ($1, 1, $2, 'Business Registration Certificate')`,
        [registrationRequestId, file.file_id]
      );
    }

    await client.query("COMMIT");
    return registrationRequestId;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function createAgencyAccount(
  registrationRequestId: string,
  db?: Pool
): Promise<{ userId: string; agencyAccountId: string }> {
  const pool = db || getPool();
  const client: PoolClient = await pool.connect();

  try {
    await client.query("BEGIN");

    // Load and lock the registration request
    const reqRes = await client.query<{
      registration_request_id: string;
      email: string;
      pending_password_hash: string | null;
      current_status: string;
      current_version_no: number;
      agency_user_id: string | null;
    }>(
      `SELECT registration_request_id, email, pending_password_hash,
              current_status, current_version_no, agency_user_id
       FROM agency_registration_requests
       WHERE registration_request_id = $1
       FOR UPDATE`,
      [registrationRequestId]
    );

    if (reqRes.rows.length === 0) {
      throw new Error(`Registration request ${registrationRequestId} not found`);
    }

    const request = reqRes.rows[0];

    // Idempotency check: Cannot process twice
    if (request.current_status !== "Awaiting OTP" || request.agency_user_id !== null) {
      throw new Error("Registration request has already been processed");
    }

    // Load version 1 submission details
    const versionRes = await client.query<{
      full_name: string;
      company_name: string;
      company_type: string;
      tax_id: string;
      location: any;
      contact_information: any;
      team_size: number;
      tour_types: any;
    }>(
      `SELECT full_name, company_name, company_type, tax_id,
              location, contact_information, team_size, tour_types
       FROM registration_submission_versions
       WHERE registration_request_id = $1 AND version_no = $2`,
      [registrationRequestId, request.current_version_no || 1]
    );

    if (versionRes.rows.length === 0) {
      throw new Error("Submission version record not found");
    }

    const version = versionRes.rows[0];

    // Verify email is not duplicated on user_accounts
    const dupCheck = await client.query(
      "SELECT 1 FROM user_accounts WHERE lower(email) = lower($1)",
      [request.email]
    );
    if (dupCheck.rows.length > 0) {
      throw new Error("Email already exists in user accounts");
    }

    const newUserId = crypto.randomUUID();
    const newAgencyId = crypto.randomUUID();

    // 1. Insert user_accounts (Tour_Agency, Pending Approval)
    await client.query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, admin_type,
        account_status, full_name, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'Tour_Agency', null,
        'Pending Approval', $4, now(), now()
      )`,
      [
        newUserId,
        request.email,
        request.pending_password_hash || "placeholder_hash",
        version.full_name,
      ]
    );

    // 2. Insert agency_profiles (populating from submission version)
    await client.query(
      `INSERT INTO agency_profiles (
        agency_id, user_id, registration_request_id,
        company_name, company_type, tax_id, location,
        description, contact_info, team_size, tour_types,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, $7,
        null, $8, $9, $10,
        now(), now()
      )`,
      [
        newAgencyId,
        newUserId,
        registrationRequestId,
        version.company_name,
        version.company_type,
        version.tax_id,
        typeof version.location === "string" ? version.location : JSON.stringify(version.location),
        typeof version.contact_information === "string" ? version.contact_information : JSON.stringify(version.contact_information),
        version.team_size,
        typeof version.tour_types === "string" ? version.tour_types : JSON.stringify(version.tour_types),
      ]
    );

    // 3. Insert audit_logs inside the same transaction (C3)
    await client.query(
      `INSERT INTO audit_logs (
        audit_id, actor_user_id, action, target_type,
        target_id, occurred_at, change_or_result
      ) VALUES (
        gen_random_uuid(), $1, 'AGENCY_REGISTRATION_COMPLETED', 'UserAccount',
        $1, now(), '{"status":"Pending Approval"}'::jsonb
      )`,
      [newUserId]
    );

    // 4. Update agency_registration_requests to 'Pending Approval' and set agency_user_id
    await client.query(
      `UPDATE agency_registration_requests
       SET current_status = 'Pending Approval', agency_user_id = $1, updated_at = now()
       WHERE registration_request_id = $2`,
      [newUserId, registrationRequestId]
    );

    await client.query("COMMIT");
    return { userId: newUserId, agencyAccountId: newAgencyId };
  } catch (error: any) {
    await client.query("ROLLBACK");

    // Research.md §9.2: Unique constraint violation on agency_profiles_tax_uq
    if (error.code === "23505" && error.constraint === "agency_profiles_tax_uq") {
      const validationError = new Error("Tax ID already registered") as any;
      validationError.field = "tax_id";
      validationError.code = "23505";
      throw validationError;
    }

    throw error;
  } finally {
    client.release();
  }
}
