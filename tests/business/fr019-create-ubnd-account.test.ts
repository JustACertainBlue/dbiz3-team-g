import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { createUbndAccount } from "@/lib/account-creation";

const TEST_DB_NAME = "test_aut_create_ubnd";

describe("US-7 Create UBND Account (UC-ACC-07, F-AUTH-19, FR-019, screen ADM117)", () => {
  const hdtUserId = "aa000001-0000-0000-0000-000000000001";
  const ubndUserId = "aa000002-0000-0000-0000-000000000002";
  const villageId = "bb000001-0000-0000-0000-000000000001";
  const village2Id = "bb000002-0000-0000-0000-000000000002";

  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);

    // HDT admin
    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, admin_type, account_status, full_name, created_at, updated_at
      ) VALUES (
        $1, 'hdt@example.com', 'placeholder', 'ADMIN', 'HDT', 'Active', 'HDT Admin', now(), now()
      )`,
      [hdtUserId]
    );

    // Two test villages
    await query(
      `INSERT INTO villages (village_id, source_code, name, city_province, is_active)
       VALUES ($1, 'VILLAGE_TEST_01', 'Test Village 1', 'Hanoi', true)`,
      [villageId]
    );
    await query(
      `INSERT INTO villages (village_id, source_code, name, city_province, is_active)
       VALUES ($1, 'VILLAGE_TEST_02', 'Test Village 2', 'Hanoi', true)`,
      [village2Id]
    );
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("AS-1 / FR-019: valid HDT + valid data + unassigned village → Active UBND account + village assignment created", async () => {
    const result = await createUbndAccount(
      {
        name: "UBND Staff Name",
        email: "ubnd_new@example.com",
        phone: "0912345678",
        assignedVillageId: villageId,
        assignedByUserId: hdtUserId,
        actorAdminType: "HDT",
      }
    );

    expect(result.success).toBe(true);
    expect(result.status).toBe(201);
    expect(result.accountStatus).toBe("Active");
    expect(result.mustChangePassword).toBe(true);
    expect(result.villageAssignment).toBeDefined();
    expect(result.villageAssignment?.villageId).toBe(villageId);

    // Verify DB state
    const userRes = await query(
      `SELECT role_code, admin_type, account_status, must_change_password, full_name
       FROM user_accounts WHERE user_id = $1`,
      [result.userId]
    );
    expect(userRes.rows.length).toBe(1);
    expect(userRes.rows[0].role_code).toBe("ADMIN");
    expect(userRes.rows[0].admin_type).toBe("UBND");
    expect(userRes.rows[0].account_status).toBe("Active");
    expect(userRes.rows[0].must_change_password).toBe(true);

    const assignRes = await query(
      `SELECT village_id FROM ubnd_village_assignments WHERE ubnd_user_id = $1`,
      [result.userId]
    );
    expect(assignRes.rows.length).toBe(1);
    expect(assignRes.rows[0].village_id).toBe(villageId);
  });

  it("AS-2 / FR-019: created account has must_change_password=true and credential email written to outbox", async () => {
    const result = await createUbndAccount(
      {
        name: "UBND Staff 2",
        email: "ubnd_outbox@example.com",
        phone: "0912345679",
        assignedVillageId: village2Id,
        assignedByUserId: hdtUserId,
        actorAdminType: "HDT",
      }
    );

    expect(result.success).toBe(true);
    expect(result.mustChangePassword).toBe(true);
    expect(result.credentialEmailStatus).toBe("Success");
  });

  it("AS-3 / BR-007: UBND actor cannot create a UBND account → 403", async () => {
    const result = await createUbndAccount(
      {
        name: "UBND Staff 3",
        email: "ubnd_forbidden@example.com",
        phone: "0912345680",
        assignedVillageId: villageId,
        assignedByUserId: ubndUserId,
        actorAdminType: "UBND",
      }
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe(403);
  });

  it("Edge / FR-019: duplicate email → validation error", async () => {
    const result = await createUbndAccount(
      {
        name: "UBND Dup",
        email: "ubnd_new@example.com", // already created in AS-1
        phone: "0912300000",
        assignedVillageId: village2Id,
        assignedByUserId: hdtUserId,
        actorAdminType: "HDT",
      }
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.errorMessage).toMatch(/email/i);
  });

  it("Edge / BR-008: village already assigned → 409", async () => {
    // village1 is already assigned from AS-1
    const result = await createUbndAccount(
      {
        name: "UBND Another",
        email: "ubnd_village_conflict@example.com",
        phone: "0912399999",
        assignedVillageId: villageId,
        assignedByUserId: hdtUserId,
        actorAdminType: "HDT",
      }
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe(409);
  });

  it("Edge / FR-019: village does not exist → 400", async () => {
    const result = await createUbndAccount(
      {
        name: "UBND NoVillage",
        email: "ubnd_novillage@example.com",
        phone: "0912388888",
        assignedVillageId: "00000000-0000-0000-0000-000000000000",
        assignedByUserId: hdtUserId,
        actorAdminType: "HDT",
      }
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
  });

  it("Edge / FR-019: missing required field (phone) → 400", async () => {
    const result = await createUbndAccount(
      {
        name: "UBND NoPhone",
        email: "ubnd_nophone@example.com",
        phone: "",
        assignedVillageId: village2Id,
        assignedByUserId: hdtUserId,
        actorAdminType: "HDT",
      }
    );

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
  });
});
