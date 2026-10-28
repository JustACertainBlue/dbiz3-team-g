import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { authenticate } from "@/lib/auth";

const TEST_DB_NAME = "test_fr007_agency_status";

describe("T003: BR-003 & FR-007 Tour Agency Account Status Checks (AS-2)", () => {
  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("permits login for Tour Agency with Approved status", async () => {
    const email = "approved.agency@example.com";
    const password = "AgencyPass123!";
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Tour_Agency', 'Approved', 'Approved Agency', now(), now()
      )`,
      [email, passwordHash]
    );

    const result = await authenticate(email, password);
    expect(result.success).toBe(true);
    expect(result.role).toBe("Tour_Agency");
    expect(result.sessionToken).toBeDefined();
    expect(result.landingScreenId).toBe("EXP017");
  });

  it("denies login for Tour Agency with Pending Approval status (message: 'Account not approved')", async () => {
    const email = "pending.agency@example.com";
    const password = "AgencyPass123!";
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Tour_Agency', 'Pending Approval', 'Pending Agency', now(), now()
      )`,
      [email, passwordHash]
    );

    const result = await authenticate(email, password);
    expect(result.success).toBe(false);
    expect(result.status).toBe(403);
    expect(result.errorMessage).toBe("Account not approved");
    expect(result.sessionToken).toBeUndefined();
  });

  it("denies login for Tour Agency with Rejected status (message: 'Account not approved')", async () => {
    const email = "rejected.agency@example.com";
    const password = "AgencyPass123!";
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Tour_Agency', 'Rejected', 'Rejected Agency', now(), now()
      )`,
      [email, passwordHash]
    );

    const result = await authenticate(email, password);
    expect(result.success).toBe(false);
    expect(result.status).toBe(403);
    expect(result.errorMessage).toBe("Account not approved");
    expect(result.sessionToken).toBeUndefined();
  });

  it("denies login for Tour Agency with Disabled status (message: 'Account disabled')", async () => {
    const email = "disabled.agency@example.com";
    const password = "AgencyPass123!";
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Tour_Agency', 'Disabled', 'Disabled Agency', now(), now()
      )`,
      [email, passwordHash]
    );

    const result = await authenticate(email, password);
    expect(result.success).toBe(false);
    expect(result.status).toBe(403);
    expect(result.errorMessage).toBe("Account disabled");
    expect(result.sessionToken).toBeUndefined();
  });
});
