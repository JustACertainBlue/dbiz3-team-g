import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool, getPool } from "@/lib/db";
import { isDuplicateEmail } from "@/lib/registration";

const TEST_DB_NAME = "test_fr003_duplicate_email";

describe("T015: FR-003 Duplicate Email Check", () => {
  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("detects existing email as duplicate regardless of case", async () => {
    const existingEmail = "existing.agency@example.com";
    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, 'hashed_password', 'Tour_Agency', 'Pending Approval', 'Existing Agency', now(), now()
      )`,
      [existingEmail]
    );

    const isDupLower = await isDuplicateEmail(existingEmail.toLowerCase(), getPool());
    expect(isDupLower).toBe(true);

    const isDupUpper = await isDuplicateEmail("EXISTING.AGENCY@EXAMPLE.COM", getPool());
    expect(isDupUpper).toBe(true);

    const isNew = await isDuplicateEmail("completely.new@example.com", getPool());
    expect(isNew).toBe(false);
  });
});
