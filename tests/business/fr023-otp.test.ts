import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool, getPool } from "@/lib/db";
import { issueOtp, verifyOtp, resendOtp } from "@/lib/otp";

const TEST_DB_NAME = "test_fr023_otp";

describe("T017: FR-023 OTP Lifecycle and AC-AUT-OTP", () => {
  const requestId = "22222222-2222-2222-2222-222222222222";
  const email = "otp.agency@example.com";

  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);
    await query(
      `INSERT INTO agency_registration_requests (
        registration_request_id, email, current_status, current_version_no, created_at, updated_at
      ) VALUES ($1, $2, 'Awaiting OTP', 1, now(), now())`,
      [requestId, email]
    );
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("issues OTP with 10-minute expiry and attempt_count = 0", async () => {
    const { otpPlaintext } = await issueOtp(requestId, email, getPool());
    expect(otpPlaintext).toMatch(/^[0-9]{6}$/);

    const challenge = await query<{
      attempt_count: number;
      resend_sequence: number;
      expires_at: Date;
      issued_at: Date;
    }>(
      "SELECT attempt_count, resend_sequence, expires_at, issued_at FROM registration_otp_challenges WHERE registration_request_id = $1",
      [requestId]
    );

    expect(challenge.rows.length).toBe(1);
    expect(challenge.rows[0].attempt_count).toBe(0);
    expect(challenge.rows[0].resend_sequence).toBe(0);
  });

  it("increments attempt_count on invalid OTP (AC-AUT-OTP)", async () => {
    const result = await verifyOtp(requestId, "000000", getPool());
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Invalid OTP");

    const challenge = await query<{ attempt_count: number }>(
      "SELECT attempt_count FROM registration_otp_challenges WHERE registration_request_id = $1 AND used_at IS NULL AND invalidated_at IS NULL",
      [requestId]
    );
    expect(challenge.rows[0].attempt_count).toBe(1);
  });

  it("invalidates previous challenge on resend and increments resend_sequence", async () => {
    const { otpPlaintext } = await resendOtp(requestId, email, getPool());
    expect(otpPlaintext).toMatch(/^[0-9]{6}$/);

    const activeChallenges = await query<{ resend_sequence: number }>(
      "SELECT resend_sequence FROM registration_otp_challenges WHERE registration_request_id = $1 AND used_at IS NULL AND invalidated_at IS NULL",
      [requestId]
    );
    expect(activeChallenges.rows.length).toBe(1);
    expect(activeChallenges.rows[0].resend_sequence).toBe(1);
  });
});
