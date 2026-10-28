import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import {
  validateResubmissionToken,
  getResubmissionData,
  resubmitRegistration,
} from "@/lib/resubmission";

const TEST_DB_NAME = "test_aut_resubmit_reg";

describe("US-10 Revise and Resubmit Agency Registration (UC-ACC-06, F-AUTH-26, FR-026, screen REG003)", () => {
  const userId = "11111111-1111-1111-1111-111111111111";
  const reqId = "22222222-2222-2222-2222-222222222222";
  const agencyId = "33333333-3333-3333-3333-333333333333";
  const validToken = "valid-resubmit-token-123";
  const expiredToken = "expired-resubmit-token-456";

  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);

    // Seed user account in Pending Approval
    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        $1, 'resubmit_agency@example.com', 'placeholder', 'Tour_Agency', 'Pending Approval', 'Initial Owner', now(), now()
      )`,
      [userId]
    );

    // Seed registration request in Request More Information
    await query(
      `INSERT INTO agency_registration_requests (
        registration_request_id, email, current_status, agency_user_id, current_version_no, created_at, updated_at
      ) VALUES (
        $1, 'resubmit_agency@example.com', 'Request More Information', $2, 1, now(), now()
      )`,
      [reqId, userId]
    );

    // Version 1
    await query(
      `INSERT INTO registration_submission_versions (
        registration_request_id, version_no, submitted_at, full_name, company_name, company_type, tax_id, location, contact_information, team_size, tour_types
      ) VALUES (
        $1, 1, now(), 'Initial Owner', 'Initial Travel Ltd', 'Travel Agency', '0101112222',
        '{"street":"10 Trang Tien","ward":"Trang Tien","district":"Hoan Kiem","city_province":"Ha Noi"}',
        '{"contact_person_name":"Initial Owner","phone_number":"+84912345678"}',
        5, '["Cultural/Heritage"]'
      )`,
      [reqId]
    );

    // Agency Profile
    await query(
      `INSERT INTO agency_profiles (
        agency_id, user_id, registration_request_id, company_name, company_type, tax_id, location, contact_info, team_size, tour_types, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'Initial Travel Ltd', 'Travel Agency', '0101112222',
        '{"street":"10 Trang Tien","ward":"Trang Tien","district":"Hoan Kiem","city_province":"Ha Noi"}',
        '{"contact_person_name":"Initial Owner","phone_number":"+84912345678"}',
        5, '["Cultural/Heritage"]', now(), now()
      )`,
      [agencyId, userId, reqId]
    );

    // Active token
    await query(
      `INSERT INTO registration_resubmission_tokens (
        token_id, registration_request_id, token_verifier, issued_at, expires_at
      ) VALUES (
        gen_random_uuid(), $1, $2, now(), now() + interval '24 hours'
      )`,
      [reqId, validToken]
    );

    // Expired token (marked invalidated_at to respect partial unique index registration_one_active_resubmit_uq)
    await query(
      `INSERT INTO registration_resubmission_tokens (
        token_id, registration_request_id, token_verifier, issued_at, expires_at, invalidated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, now() - interval '25 hours', now() - interval '1 hour', now()
      )`,
      [reqId, expiredToken]
    );
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("AS-1 / FR-026: valid token loads current request data and preserves Pending Approval account status", async () => {
    const tokenVal = await validateResubmissionToken(validToken);
    expect(tokenVal.valid).toBe(true);
    expect(tokenVal.registrationRequestId).toBe(reqId);

    const data = await getResubmissionData(validToken);
    expect(data).toBeDefined();
    expect(data?.company_name).toBe("Initial Travel Ltd");
    expect(data?.full_name).toBe("Initial Owner");

    // Verify user account remains in Pending Approval (BR-014)
    const userRes = await query(`SELECT account_status FROM user_accounts WHERE user_id = $1`, [userId]);
    expect(userRes.rows[0].account_status).toBe("Pending Approval");
  });

  it("AS-3 / BR-016: expired token is rejected and cannot load data or edit", async () => {
    const tokenVal = await validateResubmissionToken(expiredToken);
    expect(tokenVal.valid).toBe(false);
    expect(tokenVal.errorMessage).toBe("Resubmission token is invalid or expired");

    const data = await getResubmissionData(expiredToken);
    expect(data).toBeNull();
  });

  it("AS-2 / FR-026 / BR-016: valid resubmission creates version 2, updates profile, returns to Pending Approval, and consumes token", async () => {
    const res = await resubmitRegistration({
      resubmissionToken: validToken,
      updatedRegistrationData: {
        full_name: "Updated Owner Name",
        company_name: "Updated Travel Ltd",
        company_type: "Tour Operator",
        tax_id: "0101112222",
        location: { street: "12 Trang Tien", ward: "Trang Tien", district: "Hoan Kiem", city_province: "Ha Noi" },
        contact_information: { contact_person_name: "Updated Owner Name", phone_number: "+84987654321" },
        team_size: 8,
        tour_types: ["Cultural/Heritage", "Culinary"],
      },
    });

    expect(res.success).toBe(true);
    expect(res.submissionVersion).toBe(2);
    expect(res.reviewStatus).toBe("Pending Approval");

    // Verify agency_registration_requests updated to version 2 and Pending Approval
    const reqRes = await query(`SELECT current_version_no, current_status FROM agency_registration_requests WHERE registration_request_id = $1`, [reqId]);
    expect(reqRes.rows[0].current_version_no).toBe(2);
    expect(reqRes.rows[0].current_status).toBe("Pending Approval");

    // Verify version 2 row in registration_submission_versions
    const v2Res = await query(`SELECT * FROM registration_submission_versions WHERE registration_request_id = $1 AND version_no = 2`, [reqId]);
    expect(v2Res.rows.length).toBe(1);
    expect(v2Res.rows[0].company_name).toBe("Updated Travel Ltd");
    expect(v2Res.rows[0].team_size).toBe(8);

    // Verify agency_profiles updated
    const profileRes = await query(`SELECT company_name, team_size FROM agency_profiles WHERE agency_id = $1`, [agencyId]);
    expect(profileRes.rows[0].company_name).toBe("Updated Travel Ltd");
    expect(profileRes.rows[0].team_size).toBe(8);

    // Verify token is marked used (BR-016 single-use)
    const tokenRes = await query(`SELECT used_at FROM registration_resubmission_tokens WHERE token_verifier = $1`, [validToken]);
    expect(tokenRes.rows[0].used_at).not.toBeNull();

    // Verify reused token fails
    const reuseCheck = await validateResubmissionToken(validToken);
    expect(reuseCheck.valid).toBe(false);
  });
});
