import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { authenticate } from "@/lib/auth";

const TEST_DB_NAME = "test_fr007_invalid_credentials";

describe("T002: FR-007 Invalid Credentials", () => {
  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("returns 'Invalid credentials' when email does not exist", async () => {
    const result = await authenticate("nonexistent@example.com", "Password123!");
    expect(result.success).toBe(false);
    expect(result.status).toBe(401);
    expect(result.errorMessage).toBe("Invalid credentials");
  });

  it("returns 'Invalid credentials' when password does not match", async () => {
    const email = "user.valid@example.com";
    const passwordHash = await hashPassword("CorrectPassword123!");
    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, created_at, updated_at
      ) VALUES (
        gen_random_uuid(), $1, $2, 'Tour_Agency', 'Approved', 'Valid Agency User', now(), now()
      )`,
      [email, passwordHash]
    );

    const result = await authenticate(email, "WrongPassword123!");
    expect(result.success).toBe(false);
    expect(result.status).toBe(401);
    expect(result.errorMessage).toBe("Invalid credentials");
  });
});
