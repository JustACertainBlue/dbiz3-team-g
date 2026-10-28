import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { resetPasswordWithToken } from "@/lib/recovery";

const TEST_DB_NAME = "test_fr012_token_rejection";

describe("T004: FR-012 Expired & Already-Used Token Rejection (AS-3, BR-006)", () => {
  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("rejects non-existent token with 'Token invalid'", async () => {
    const result = await resetPasswordWithToken("non_existent_token", "NewPassword123!", "NewPassword123!");
    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.errorMessage).toBe("Token invalid");
  });

  it("rejects expired token with 'Token expired' and does not update password", async () => {
    const initialPass = "OldPassword123!";
    const initialHash = await hashPassword(initialPass);
    const userRes = await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 'expired@example.com', $1, 'Tour_Agency', 'Approved', 'Expired User', now(), now()
      ) RETURNING user_id`,
      [initialHash]
    );
    const userId = userRes.rows[0].user_id;

    const expiredToken = "expired_token_12345";
    await query(
      `INSERT INTO password_reset_tokens (
        token_id, user_id, token_verifier, issued_at, expires_at
      ) VALUES (
        gen_random_uuid(), $1, $2, now() - interval '20 minutes', now() - interval '5 minutes'
      )`,
      [userId, expiredToken]
    );

    const result = await resetPasswordWithToken(expiredToken, "NewPassword123!", "NewPassword123!");
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Token expired");

    // Password must remain unchanged
    const userCheck = await query(`SELECT password_hash FROM user_accounts WHERE user_id = $1`, [userId]);
    const matchesOld = await verifyPassword(initialPass, userCheck.rows[0].password_hash);
    expect(matchesOld).toBe(true);
  });

  it("rejects already-used token with 'Token invalid' and does not update password", async () => {
    const initialPass = "OldPassword123!";
    const initialHash = await hashPassword(initialPass);
    const userRes = await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), 'used@example.com', $1, 'Tour_Agency', 'Approved', 'Used User', now(), now()
      ) RETURNING user_id`,
      [initialHash]
    );
    const userId = userRes.rows[0].user_id;

    const usedToken = "used_token_12345";
    await query(
      `INSERT INTO password_reset_tokens (
        token_id, user_id, token_verifier, issued_at, expires_at, used_at
      ) VALUES (
        gen_random_uuid(), $1, $2, now() - interval '5 minutes', now() + interval '10 minutes', now() - interval '1 minute'
      )`,
      [userId, usedToken]
    );

    const result = await resetPasswordWithToken(usedToken, "NewPassword123!", "NewPassword123!");
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe("Token invalid");

    // Password must remain unchanged
    const userCheck = await query(`SELECT password_hash FROM user_accounts WHERE user_id = $1`, [userId]);
    const matchesOld = await verifyPassword(initialPass, userCheck.rows[0].password_hash);
    expect(matchesOld).toBe(true);
  });
});
