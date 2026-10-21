import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";

const TEST_DB_NAME = "test_seed_integrity";

describe("T013: Seed Integrity Test", () => {
  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("asserts user_accounts has exactly 26 rows from manifest.json", async () => {
    const res = await query<{ count: string }>("SELECT COUNT(*) FROM user_accounts");
    expect(Number(res.rows[0].count)).toBe(26);
  });

  it("asserts boundary-otp challenge 7985fd5b-02dc-5c37-bd96-6373cb98dd98 has attempt_count 5 and resend_sequence 3", async () => {
    const res = await query<{ attempt_count: number; resend_sequence: number }>(
      "SELECT attempt_count, resend_sequence FROM registration_otp_challenges WHERE challenge_id = $1",
      ["7985fd5b-02dc-5c37-bd96-6373cb98dd98"]
    );
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].attempt_count).toBe(5);
    expect(res.rows[0].resend_sequence).toBe(3);
  });
});
