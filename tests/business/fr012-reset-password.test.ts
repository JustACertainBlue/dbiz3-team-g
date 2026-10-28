import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { resetPasswordWithToken } from "@/lib/recovery";

const TEST_DB_NAME = "test_fr012_reset_password";

describe("T003: FR-012 Password Reset Execution & Token Invalidation (AS-2, BR-006)", () => {
  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("updates password hash, sets used_at on token, and allows login with new password", async () => {
    const email = "reset.success@example.com";
    const initialHash = await hashPassword("OldPassword123!");
    const userRes = await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Tour_Agency', 'Approved', 'Success User', now(), now()
      ) RETURNING user_id`,
      [email, initialHash]
    );
    const userId = userRes.rows[0].user_id;

    const token = "valid_reset_token_12345";
    await query(
      `INSERT INTO password_reset_tokens (
        token_id, user_id, token_verifier, issued_at, expires_at
      ) VALUES (
        gen_random_uuid(), $1, $2, now(), now() + interval '15 minutes'
      )`,
      [userId, token]
    );

    const newPassword = "NewValidPassword456!";
    const result = await resetPasswordWithToken(token, newPassword, newPassword);

    expect(result.success).toBe(true);
    expect(result.successMessage).toBe("Password updated successfully");

    // Token must be consumed
    const tokenRes = await query(
      `SELECT * FROM password_reset_tokens WHERE token_verifier = $1`,
      [token]
    );
    expect(tokenRes.rows[0].used_at).not.toBeNull();

    // User password hash must be updated
    const userCheck = await query(
      `SELECT password_hash, password_changed_at FROM user_accounts WHERE user_id = $1`,
      [userId]
    );
    const matchesNew = await verifyPassword(newPassword, userCheck.rows[0].password_hash);
    expect(matchesNew).toBe(true);
    expect(userCheck.rows[0].password_changed_at).not.toBeNull();
  });
});
