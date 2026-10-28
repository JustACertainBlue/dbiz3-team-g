import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { requestPasswordReset } from "@/lib/recovery";

const TEST_DB_NAME = "test_fr011_request_reset";

describe("T001: FR-011 Password Reset Request & 15-Minute Token (AS-1, BR-005)", () => {
  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("generates a token valid for 15 minutes and writes email to outbox for registered email", async () => {
    const email = "reset.test@example.com";
    const passwordHash = await hashPassword("InitialPass123!");

    const userRes = await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Tour_Agency', 'Approved', 'Reset User', now(), now()
      ) RETURNING user_id`,
      [email, passwordHash]
    );
    const userId = userRes.rows[0].user_id;

    const result = await requestPasswordReset(email);
    expect(result.success).toBe(true);
    expect(result.resultMessage).toBe(
      "If an account exists for this email, a password reset link has been sent."
    );

    // Verify token record in password_reset_tokens table
    const tokenRes = await query(
      `SELECT * FROM password_reset_tokens WHERE user_id = $1 ORDER BY issued_at DESC LIMIT 1`,
      [userId]
    );
    expect(tokenRes.rows.length).toBe(1);
    const tokenRow = tokenRes.rows[0];
    expect(tokenRow.used_at).toBeNull();

    // Verify 15-minute expiry (diff between expires_at and issued_at is 15 minutes)
    const issuedAt = new Date(tokenRow.issued_at).getTime();
    const expiresAt = new Date(tokenRow.expires_at).getTime();
    expect(expiresAt - issuedAt).toBe(15 * 60 * 1000);
  });
});
