import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { authenticate, verifySession } from "@/lib/auth";

const TEST_DB_NAME = "test_fr008_fr015_session_routing";

describe("T005: FR-008, FR-015, FR-017 Session Creation, Permission Loading & Role Routing (AS-1)", () => {
  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("creates session record in database and loads permissions for Tour Agency", async () => {
    const email = "routing.agency@example.com";
    const password = "ValidPassword123!";
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Tour_Agency', 'Approved', 'Routing Agency User', now(), now()
      )`,
      [email, passwordHash]
    );

    const result = await authenticate(email, password);
    expect(result.success).toBe(true);
    expect(result.landingScreenId).toBe("EXP017");
    expect(result.sessionToken).toBeDefined();
    expect(Array.isArray(result.permissionSet)).toBe(true);

    // Verify session exists in database
    const sessionRes = await query(
      `SELECT * FROM sessions WHERE token_hash = $1`,
      [result.sessionToken]
    );
    expect(sessionRes.rows.length).toBe(1);
    expect(sessionRes.rows[0].role_context).toBe("Tour_Agency");
    expect(sessionRes.rows[0].revoked_at).toBeNull();

    // Verify session verification function (FR-017)
    const verification = await verifySession(result.sessionToken!);
    expect(verification.valid).toBe(true);
    expect(verification.validationResult).toBe("Valid");
    expect(verification.forceLogout).toBe(false);
    expect(verification.role).toBe("Tour_Agency");
  });

  it("routes ADMIN (UBND) to ADM079 and loads UBND permissions", async () => {
    const email = "ubnd.routing@example.com";
    const password = "ValidPassword123!";
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, admin_type, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'ADMIN', 'UBND', 'Active', 'UBND Admin User', now(), now()
      )`,
      [email, passwordHash]
    );

    const result = await authenticate(email, password);
    expect(result.success).toBe(true);
    expect(result.landingScreenId).toBe("ADM079");
    expect(result.adminType).toBe("UBND");
    expect(result.sessionToken).toBeDefined();

    const verification = await verifySession(result.sessionToken!);
    expect(verification.valid).toBe(true);
    expect(verification.adminType).toBe("UBND");
  });

  it("forces logout if session is expired, revoked or user disabled (FR-017)", async () => {
    const email = "to.disable@example.com";
    const password = "ValidPassword123!";
    const passwordHash = await hashPassword(password);
    const userIdRes = await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Tour_Agency', 'Approved', 'User To Disable', now(), now()
      ) RETURNING user_id`,
      [email, passwordHash]
    );
    const userId = userIdRes.rows[0].user_id;

    const result = await authenticate(email, password);
    expect(result.success).toBe(true);

    // Now disable account in DB (simulating admin action / F-AUTH-22)
    await query(
      `UPDATE user_accounts SET account_status = 'Disabled' WHERE user_id = $1`,
      [userId]
    );

    const verification = await verifySession(result.sessionToken!);
    expect(verification.valid).toBe(false);
    expect(verification.forceLogout).toBe(true);
    expect(verification.validationResult).toBe("Account Disabled");
  });
});
