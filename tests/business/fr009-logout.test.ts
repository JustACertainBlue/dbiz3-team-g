import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { authenticate, verifySession, logoutSession } from "@/lib/auth";

const TEST_DB_NAME = "test_aut_logout";

describe("US-3 Log Out (UC-ACC-03, F-AUTH-09, FR-009)", () => {
  let activeToken: string;

  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);

    const passwordHash = await hashPassword("ValidPass123!");
    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        '33333333-3333-3333-3333-333333333333', 'logout_member@test.com', $1, 'Tour_Agency', 'Approved', 'Logout User', now(), now()
      )`,
      [passwordHash]
    );

    const loginRes = await authenticate("logout_member@test.com", "ValidPass123!");
    expect(loginRes.success).toBe(true);
    activeToken = loginRes.sessionToken!;
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("AS-1 / F-AUTH-09: invalidates active session and records revoked_at in database", async () => {
    // Check session is valid initially
    const preVerify = await verifySession(activeToken);
    expect(preVerify.valid).toBe(true);

    // Call logoutSession
    const logoutRes = await logoutSession(activeToken);
    expect(logoutRes.sessionTerminated).toBe(true);
    expect(logoutRes.confirmationMessage).toBe("Logged out successfully");
    expect(logoutRes.redirectUrl).toBe("/login");

    // Check DB record directly has revoked_at populated
    const dbCheck = await query(
      `SELECT revoked_at FROM sessions WHERE token_hash = $1`,
      [activeToken]
    );
    expect(dbCheck.rows.length).toBe(1);
    expect(dbCheck.rows[0].revoked_at).not.toBeNull();
  });

  it("AS-2 / BR-012 / BR-013: terminated session reuse is denied", async () => {
    const postVerify = await verifySession(activeToken);
    expect(postVerify.valid).toBe(false);
    expect(postVerify.forceLogout).toBe(true);
    expect(postVerify.errorMessage).toBe("Session expired or revoked");
  });

  it("FR-009: handles logout for already revoked or invalid session token", async () => {
    const repeatLogout = await logoutSession(activeToken);
    expect(repeatLogout.sessionTerminated).toBe(true);
    expect(repeatLogout.redirectUrl).toBe("/login");

    const nonExistent = await logoutSession("non-existent-token");
    expect(nonExistent.sessionTerminated).toBe(false);
  });
});
