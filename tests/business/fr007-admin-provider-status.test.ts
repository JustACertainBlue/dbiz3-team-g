import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { authenticate } from "@/lib/auth";

const TEST_DB_NAME = "test_fr007_admin_provider_status";

describe("T004: BR-004 & FR-007 ADMIN and Local Provider Account Status Checks (AS-3)", () => {
  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("permits login for HDT Admin with Active status", async () => {
    const email = "hdt.active@example.com";
    const password = "HdtPassword123!";
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, admin_type, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'ADMIN', 'HDT', 'Active', 'HDT Admin User', now(), now()
      )`,
      [email, passwordHash]
    );

    const result = await authenticate(email, password);
    expect(result.success).toBe(true);
    expect(result.role).toBe("ADMIN");
    expect(result.adminType).toBe("HDT");
    expect(result.landingScreenId).toBe("ADM079");
    expect(result.sessionToken).toBeDefined();
  });

  it("permits login for Local Provider with Active status", async () => {
    const email = "provider.active@example.com";
    const password = "ProviderPass123!";
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Local_Provider', 'Active', 'Local Provider User', now(), now()
      )`,
      [email, passwordHash]
    );

    const result = await authenticate(email, password);
    expect(result.success).toBe(true);
    expect(result.role).toBe("Local_Provider");
    expect(result.landingScreenId).toBe("DSH018");
    expect(result.sessionToken).toBeDefined();
  });

  it("denies login for HDT Admin with Disabled status", async () => {
    const email = "hdt.disabled@example.com";
    const password = "HdtPassword123!";
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, admin_type, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'ADMIN', 'HDT', 'Disabled', 'Disabled HDT', now(), now()
      )`,
      [email, passwordHash]
    );

    const result = await authenticate(email, password);
    expect(result.success).toBe(false);
    expect(result.status).toBe(403);
    expect(result.errorMessage).toBe("Account disabled");
    expect(result.sessionToken).toBeUndefined();
  });

  it("denies login for Local Provider with Disabled status", async () => {
    const email = "provider.disabled@example.com";
    const password = "ProviderPass123!";
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Local_Provider', 'Disabled', 'Disabled Provider', now(), now()
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
