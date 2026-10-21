import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool, getPool } from "@/lib/db";
import { createAgencyAccount } from "@/lib/registration";

const TEST_DB_NAME = "test_fr004_tax_id_unique";

describe("T034: FR-004 Tax ID Unique Constraint & Transaction Rollback (U2)", () => {
  const req1 = "44444444-4444-4444-4444-444444444441";
  const req2 = "44444444-4444-4444-4444-444444444442";
  const duplicateTaxId = "0109876543";

  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);

    // Setup request 1
    await query(
      `INSERT INTO agency_registration_requests (
        registration_request_id, email, current_status, current_version_no, created_at, updated_at
      ) VALUES ($1, 'agency1@example.com', 'Awaiting OTP', 1, now(), now())`,
      [req1]
    );
    await query(
      `INSERT INTO registration_submission_versions (
        registration_request_id, version_no, submitted_at, full_name, company_name, company_type, tax_id, location, contact_information, team_size, tour_types
      ) VALUES (
        $1, 1, now(), 'Owner One', 'Agency One', 'Travel Agency', $2,
        '{"street":"1 Hang Gai","ward":"Hang Gai","district":"Hoan Kiem","city_province":"Ha Noi"}',
        '{"contact_person_name":"Owner One","phone_number":"+84911111111"}',
        5, '["Cultural/Heritage"]'
      )`,
      [req1, duplicateTaxId]
    );

    // Setup request 2 with duplicate tax_id
    await query(
      `INSERT INTO agency_registration_requests (
        registration_request_id, email, current_status, current_version_no, created_at, updated_at
      ) VALUES ($1, 'agency2@example.com', 'Awaiting OTP', 1, now(), now())`,
      [req2]
    );
    await query(
      `INSERT INTO registration_submission_versions (
        registration_request_id, version_no, submitted_at, full_name, company_name, company_type, tax_id, location, contact_information, team_size, tour_types
      ) VALUES (
        $1, 1, now(), 'Owner Two', 'Agency Two', 'TMC', $2,
        '{"street":"2 Hang Dao","ward":"Hang Dao","district":"Hoan Kiem","city_province":"Ha Noi"}',
        '{"contact_person_name":"Owner Two","phone_number":"+84922222222"}',
        8, '["Culinary"]'
      )`,
      [req2, duplicateTaxId]
    );
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("creates first account successfully", async () => {
    const res1 = await createAgencyAccount(req1, getPool());
    expect(res1.userId).toBeDefined();
  });

  it("rolls back entire transaction on duplicate tax_id and returns validation error (not 500)", async () => {
    // Attempting to create second account with same tax_id
    await expect(createAgencyAccount(req2, getPool())).rejects.toMatchObject({
      field: "tax_id",
      message: "Tax ID already registered",
    });

    // Verify rollback: no user_accounts created for request 2
    const userRes = await query(
      "SELECT * FROM user_accounts WHERE email = 'agency2@example.com'"
    );
    expect(userRes.rows.length).toBe(0);

    // Verify rollback: request 2 remains in 'Awaiting OTP'
    const reqRes = await query<{ current_status: string }>(
      "SELECT current_status FROM agency_registration_requests WHERE registration_request_id = $1",
      [req2]
    );
    expect(reqRes.rows[0].current_status).toBe("Awaiting OTP");
  });
});
