import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { POST } from "@/app/api/register/verify-otp/route";

const TEST_DB_NAME = "test_fr023_outbox_fail";

describe("T036: FR-023 Outbox Failure & confirmation_email_status (C1)", () => {
  const requestId = "66666666-6666-6666-6666-666666666666";
  const email = "outbox.fail@example.com";

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
        $1, 1, now(), 'Outbox Owner', 'Outbox Agency', 'Travel Agency', '0106667777',
        '{"street":"6 Hang Be","ward":"Hang Bac","district":"Hoan Kiem","city_province":"Ha Noi"}',
        '{"contact_person_name":"Outbox Owner","phone_number":"+84966666666"}',
        20, '["Culinary"]'
      )`,
      [requestId]
    );

    // Insert active challenge with correct OTP
    await query(
      `INSERT INTO registration_otp_challenges (
        challenge_id, registration_request_id, email, otp_verifier, issued_at, expires_at, attempt_count, resend_sequence
      ) VALUES (
        gen_random_uuid(), $1, $2, '$2a$12$e8YvA5f9.stubhashfor123456', now(), now() + interval '10 minutes', 0, 0
      )`,
      [requestId, email]
    );
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("returns 200 with confirmation_email_status 'Fail' and keeps account when outbox write fails", async () => {
    // Configure test flag to simulate outbox write failure
    process.env.SIMULATE_OUTBOX_FAIL = "true";

    const req = new Request("http://localhost/api/register/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        registration_request_id: requestId,
        otp_code: "123456",
      }),
    });

    const response = await POST(req);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.otp_verified).toBe(true);
    expect(data.confirmation_email_status).toBe("Fail");

    // The user_accounts row must remain committed in DB (not rolled back)
    const userRes = await query<{ account_status: string }>(
      "SELECT account_status FROM user_accounts WHERE email = $1",
      [email]
    );
    expect(userRes.rows.length).toBe(1);
    expect(userRes.rows[0].account_status).toBe("Pending Approval");

    delete process.env.SIMULATE_OUTBOX_FAIL;
  });
});
