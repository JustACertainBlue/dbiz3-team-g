import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { reviewAgencyRegistration, getAgencyReviewDetails } from "@/lib/agency-review";
import { authenticate } from "@/lib/auth";

const TEST_DB_NAME = "test_aut_verify_agency";

describe("US-6 Verify Agency (UC-ACC-06, F-AUTH-18, FR-018, screens VER119, VER146)", () => {
  const hdtAdminId = "66666666-6666-6666-6666-666666666666";
  const agencyUserId1 = "77777777-7777-7777-7777-777777777771";
  const agencyId1 = "88888888-8888-8888-8888-888888888881";
  const regReqId1 = "99999999-9999-9999-9999-999999999991";

  const agencyUserId2 = "77777777-7777-7777-7777-777777777772";
  const agencyId2 = "88888888-8888-8888-8888-888888888882";
  const regReqId2 = "99999999-9999-9999-9999-999999999992";

  const agencyUserId3 = "77777777-7777-7777-7777-777777777773";
  const agencyId3 = "88888888-8888-8888-8888-888888888883";
  const regReqId3 = "99999999-9999-9999-9999-999999999993";

  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);

    // Create HDT Admin
    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, admin_type, account_status, full_name, created_at, updated_at
      ) VALUES (
        $1, 'hdt_reviewer@example.com', 'placeholder', 'ADMIN', 'HDT', 'Active', 'HDT Reviewer', now(), now()
      )`,
      [hdtAdminId]
    );

    // Helper to seed agency in Pending Approval
    const seedPendingAgency = async (userId: string, agencyId: string, reqId: string, email: string, taxId: string) => {
      await query(
        `INSERT INTO user_accounts (
          user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
        ) VALUES (
          $1, $2, 'placeholder', 'Tour_Agency', 'Pending Approval', 'Pending Agency', now(), now()
        )`,
        [userId, email]
      );

      await query(
        `INSERT INTO agency_registration_requests (
          registration_request_id, email, current_status, agency_user_id, current_version_no, created_at, updated_at
        ) VALUES (
          $1, $2, 'Pending Approval', $3, 1, now(), now()
        )`,
        [reqId, email, userId]
      );

      await query(
        `INSERT INTO registration_submission_versions (
          registration_request_id, version_no, submitted_at, full_name, company_name, company_type, tax_id, location, contact_information, team_size, tour_types
        ) VALUES (
          $1, 1, now(), 'Agency Rep', 'Agency Company', 'Tour Operator', $2,
          '{"street":"10 Hang Gai","ward":"Hang Gai","district":"Hoan Kiem","city_province":"Ha Noi"}',
          '{"contact_person_name":"Agency Rep","phone_number":"+84911111111"}',
          5, '["Cultural/Heritage"]'
        )`,
        [reqId, taxId]
      );

      await query(
        `INSERT INTO agency_profiles (
          agency_id, user_id, registration_request_id, company_name, company_type, tax_id, location, contact_info, team_size, tour_types, created_at, updated_at
        ) VALUES (
          $1, $2, $3, 'Agency Company', 'Tour Operator', $4,
          '{"street":"10 Hang Gai","ward":"Hang Gai","district":"Hoan Kiem","city_province":"Ha Noi"}',
          '{"contact_person_name":"Agency Rep","phone_number":"+84911111111"}',
          5, '["Cultural/Heritage"]', now(), now()
        )`,
        [agencyId, userId, reqId, taxId]
      );
    };

    await seedPendingAgency(agencyUserId1, agencyId1, regReqId1, "agency1@test.com", "0107771111");
    await seedPendingAgency(agencyUserId2, agencyId2, regReqId2, "agency2@test.com", "0107772222");
    await seedPendingAgency(agencyUserId3, agencyId3, regReqId3, "agency3@test.com", "0107773333");
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("AS-1 / FR-018: HDT Approves Agency registration -> status becomes Approved", async () => {
    const details = await getAgencyReviewDetails(agencyId1);
    expect(details).not.toBeNull();
    expect(details!.status).toBe("Pending Approval");

    const res = await reviewAgencyRegistration({
      agencyId: agencyId1,
      hdtUserId: hdtAdminId,
      decision: "Approve",
      reviewComment: "All documents valid and verified",
    });

    expect(res.success).toBe(true);
    expect(res.accountStatus).toBe("Approved");

    // Check DB status
    const userRes = await query(`SELECT account_status FROM user_accounts WHERE user_id = $1`, [agencyUserId1]);
    expect(userRes.rows[0].account_status).toBe("Approved");

    const reqRes = await query(`SELECT current_status FROM agency_registration_requests WHERE registration_request_id = $1`, [regReqId1]);
    expect(reqRes.rows[0].current_status).toBe("Approved");

    // Check review record
    const reviewRes = await query(`SELECT * FROM agency_review_records WHERE registration_request_id = $1`, [regReqId1]);
    expect(reviewRes.rows.length).toBe(1);
    expect(reviewRes.rows[0].decision).toBe("Approve");
  });

  it("AS-2 / BR-014 / BR-016: HDT selects Request More Information -> account remains Pending Approval, token issued", async () => {
    // Missing comment fails
    const failRes = await reviewAgencyRegistration({
      agencyId: agencyId2,
      hdtUserId: hdtAdminId,
      decision: "Request More Information",
      reviewComment: "",
    });
    expect(failRes.success).toBe(false);

    // With comment
    const res = await reviewAgencyRegistration({
      agencyId: agencyId2,
      hdtUserId: hdtAdminId,
      decision: "Request More Information",
      reviewComment: "Please provide a clearer copy of the business license.",
    });

    expect(res.success).toBe(true);
    expect(res.accountStatus).toBe("Pending Approval"); // BR-014

    // Check DB: account status must be Pending Approval
    const userRes = await query(`SELECT account_status FROM user_accounts WHERE user_id = $1`, [agencyUserId2]);
    expect(userRes.rows[0].account_status).toBe("Pending Approval");

    // Check resubmission token created
    const tokenRes = await query(
      `SELECT * FROM registration_resubmission_tokens WHERE registration_request_id = $1 AND used_at IS NULL AND invalidated_at IS NULL`,
      [regReqId2]
    );
    expect(tokenRes.rows.length).toBe(1);
  });

  it("AS-3 / FR-018: HDT selects Reject -> status becomes Rejected", async () => {
    const res = await reviewAgencyRegistration({
      agencyId: agencyId3,
      hdtUserId: hdtAdminId,
      decision: "Reject",
      reviewComment: "Invalid tax registration certificate provided.",
    });

    expect(res.success).toBe(true);
    expect(res.accountStatus).toBe("Rejected");

    const userRes = await query(`SELECT account_status FROM user_accounts WHERE user_id = $1`, [agencyUserId3]);
    expect(userRes.rows[0].account_status).toBe("Rejected");

    const reqRes = await query(`SELECT current_status FROM agency_registration_requests WHERE registration_request_id = $1`, [regReqId3]);
    expect(reqRes.rows[0].current_status).toBe("Rejected");
  });
});
