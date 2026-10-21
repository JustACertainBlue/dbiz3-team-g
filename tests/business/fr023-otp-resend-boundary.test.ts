import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool, getPool } from "@/lib/db";
import { resendOtp } from "@/lib/otp";

const TEST_DB_NAME = "test_fr023_otp_resend_boundary";

describe("T033: FR-023 OTP Resend Boundary and 15-Minute Window", () => {
  const requestId = "33333333-3333-3333-3333-333333333333";
  const email = "boundary.otp@example.com";

  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);
    await query(
      `INSERT INTO agency_registration_requests (
        registration_request_id, email, current_status, current_version_no, created_at, updated_at
      ) VALUES ($1, $2, 'Awaiting OTP', 1, now(), now())`,
      [requestId, email]
    );

    // Initial challenge (resend_sequence = 0)
    await query(
      `INSERT INTO registration_otp_challenges (
        challenge_id, registration_request_id, email, otp_verifier, issued_at, expires_at, attempt_count, resend_sequence
      ) VALUES (
        gen_random_uuid(), $1, $2, 'initial_hash', now(), now() + interval '10 minutes', 0, 0
      )`,
      [requestId, email]
    );
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("permits 1st, 2nd, and 3rd resends but rejects 4th attempt", async () => {
    // 1st resend (sequence 0 -> 1)
    const r1 = await resendOtp(requestId, email, getPool());
    expect(r1.otpPlaintext).toBeDefined();

    // 2nd resend (sequence 1 -> 2)
    const r2 = await resendOtp(requestId, email, getPool());
    expect(r2.otpPlaintext).toBeDefined();

    // 3rd resend (sequence 2 -> 3)
    const r3 = await resendOtp(requestId, email, getPool());
    expect(r3.otpPlaintext).toBeDefined();

    // 4th resend attempt (would exceed limit of 3)
    await expect(resendOtp(requestId, email, getPool())).rejects.toThrow(/Resend Limit Exceeded/);
  });

  it("rejects resend when initial OTP was issued more than 15 minutes ago", async () => {
    const expiredWindowRequestId = "33333333-3333-3333-3333-333333333334";
    const expiredEmail = "window.expired@example.com";

    await query(
      `INSERT INTO agency_registration_requests (
        registration_request_id, email, current_status, current_version_no, created_at, updated_at
      ) VALUES ($1, $2, 'Awaiting OTP', 1, now() - interval '16 minutes', now() - interval '16 minutes')`,
      [expiredWindowRequestId, expiredEmail]
    );

    // Initial challenge issued 16 minutes ago, with consistent expires_at (U4 finding satisfied)
    await query(
      `INSERT INTO registration_otp_challenges (
        challenge_id, registration_request_id, email, otp_verifier, issued_at, expires_at, attempt_count, resend_sequence
      ) VALUES (
        gen_random_uuid(), $1, $2, 'verifier', now() - interval '16 minutes', now() - interval '6 minutes', 0, 0
      )`,
      [expiredWindowRequestId, expiredEmail]
    );

    await expect(resendOtp(expiredWindowRequestId, expiredEmail, getPool())).rejects.toThrow(/Resend Limit Exceeded/);
  });
});
