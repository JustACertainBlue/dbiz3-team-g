import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool, getPool } from "@/lib/db";
import { createAgencyAccount } from "@/lib/registration";

const TEST_DB_NAME = "test_fr004_create_account";

describe("T016: FR-004 Create Pending Approval Account (BR-001, BR-002, AC-US1-1/2/3)", () => {
  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("creates account with Tour_Agency role and Pending Approval status (BR-001, BR-002, AC-US1-1)", async () => {
    const requestId = "11111111-1111-1111-1111-111111111111";
    const email = "valid.agency@example.com";

    // Setup request and verified submission version
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
        $1, 1, now(), 'Agency Owner', 'Agency Co', 'Tour Operator', '0109998888',
        '{"street":"1 Pho Hue","ward":"Hang Bai","district":"Hoan Kiem","city_province":"Ha Noi"}',
        '{"contact_person_name":"Agency Owner","phone_number":"+84988776655"}',
        10, '["Cultural/Heritage"]'
      )`,
      [requestId]
    );

    const result = await createAgencyAccount(requestId, getPool());
    expect(result.userId).toBeDefined();

    // Verify BR-001 and BR-002 on user_accounts
    const userRes = await query<{ role_code: string; account_status: string }>(
      "SELECT role_code, account_status FROM user_accounts WHERE user_id = $1",
      [result.userId]
    );
    expect(userRes.rows.length).toBe(1);
    expect(userRes.rows[0].role_code).toBe("Tour_Agency"); // BR-001
    expect(userRes.rows[0].account_status).toBe("Pending Approval"); // BR-002

    // AC-US1-1: Idempotency - Calling twice with same registration_request_id fails
    await expect(createAgencyAccount(requestId, getPool())).rejects.toThrow();
  });
});
