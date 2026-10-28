import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { requestPasswordReset } from "@/lib/recovery";

const TEST_DB_NAME = "test_fr011_enumeration_protection";

describe("T002: FR-011 User Enumeration Protection", () => {
  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("returns identical generic message when email does not exist, creating no tokens", async () => {
    const unknownEmail = "completely.unknown@example.com";

    const initialCountRes = await query(`SELECT COUNT(*) FROM password_reset_tokens`);
    const initialCount = parseInt(initialCountRes.rows[0].count, 10);

    const result = await requestPasswordReset(unknownEmail);
    expect(result.success).toBe(true);
    expect(result.resultMessage).toBe(
      "If an account exists for this email, a password reset link has been sent."
    );

    const tokenCount = await query(`SELECT COUNT(*) FROM password_reset_tokens`);
    expect(parseInt(tokenCount.rows[0].count, 10)).toBe(initialCount);
  });
});
