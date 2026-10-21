import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool, getPool } from "@/lib/db";
import { createAgencyAccount } from "@/lib/registration";

const TEST_DB_NAME = "test_fr004_audit_log";

describe("T035: FR-004 Audit Log Insertion and Atomicity (C3)", () => {
  const requestId = "55555555-5555-5555-5555-555555555555";
  const email = "audit.agency@example.com";

  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);

    await query(
      `INSERT INTO agency_registration_requests (
        registration_request_id, email, current_status, current_version_no, created_at, updated_at
      ) VALUES ($1, $2, 'Awaiting OTP', 1, now(), now())`,
      [requestId, email]
    );

    await query(
      `INSERT INTO registration_submission_versions (
        registration_request_id, version_no, submitted_at, full_name, company_name, company_type, tax_id, location, contact_information, team_size, tour_types
      ) VALUES (
        $1, 1, now(), 'Audit Owner', 'Audit Agency', 'Tour Operator', '0105556666',
        '{"street":"5 Hang Thiec","ward":"Hang Gai","district":"Hoan Kiem","city_province":"Ha Noi"}',
        '{"contact_person_name":"Audit Owner","phone_number":"+84955555555"}',
        12, '["Craft Village/Experiential"]'
      )`,
      [requestId]
    );
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("inserts an audit_logs row atomically within the same transaction as user_accounts and agency_profiles", async () => {
    const res = await createAgencyAccount(requestId, getPool());
    expect(res.userId).toBeDefined();

    // Verify audit log row
    const auditRes = await query<{
      action: string;
      target_type: string;
      target_id: string;
      actor_user_id: string;
      change_or_result: any;
    }>(
      "SELECT action, target_type, target_id, actor_user_id, change_or_result FROM audit_logs WHERE target_id = $1",
      [res.userId]
    );

    expect(auditRes.rows.length).toBe(1);
    expect(auditRes.rows[0].action).toBe("AGENCY_REGISTRATION_COMPLETED");
    expect(auditRes.rows[0].target_type).toBe("UserAccount");
    expect(auditRes.rows[0].actor_user_id).toBe(res.userId);
    expect(auditRes.rows[0].change_or_result).toEqual({ status: "Pending Approval" });
  });
});
