import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { createLocalProviderAccount } from "@/lib/account-creation";

const TEST_DB_NAME = "test_aut_create_provider";

describe("US-8 Create Local Provider Account (UC-ACC-08, F-AUTH-20, FR-020, screen ADM117)", () => {
  const ubndUserId = "aa000002-0000-0000-0000-000000000002";
  const hdtUserId = "aa000001-0000-0000-0000-000000000001";
  const assignedVillageId = "bb000001-0000-0000-0000-000000000001";
  const otherVillageId = "bb000002-0000-0000-0000-000000000002";

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

    // UBND admin
    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, admin_type, account_status, full_name, created_at, updated_at
      ) VALUES (
        $1, 'ubnd@example.com', 'placeholder', 'ADMIN', 'UBND', 'Active', 'UBND Admin', now(), now()
      )`,
      [ubndUserId]
    );

    // Two villages
    await query(
      `INSERT INTO villages (village_id, source_code, name, city_province, is_active)
       VALUES ($1, 'VILLAGE_01', 'Assigned Village', 'Hanoi', true)`,
      [assignedVillageId]
    );
    await query(
      `INSERT INTO villages (village_id, source_code, name, city_province, is_active)
       VALUES ($1, 'VILLAGE_02', 'Other Village', 'Hanoi', true)`,
      [otherVillageId]
    );

    // Assign village to UBND
    await query(
      `INSERT INTO ubnd_village_assignments (ubnd_user_id, village_id, assigned_by, assigned_at)
       VALUES ($1, $2, $3, now())`,
      [ubndUserId, assignedVillageId, hdtUserId]
    );
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("AS-1 / FR-020: valid UBND session + valid provider data → Active Local Provider account + temp credentials + Draft provider profile", async () => {
    const result = await createLocalProviderAccount({
      actorUserId: ubndUserId,
      actorAdminType: "UBND",
      providerName: "Bat Trang Pottery Workshop",
      address: "123 Bat Trang Village, Gia Lam, Hanoi",
      contact: {
        contactPersonName: "Nguyen Van A",
        phoneNumber: "+84912345678",
      },
      email: "battrang_lp1@example.com",
    });

    expect(result.success).toBe(true);
    expect(result.status).toBe(201);
    expect(result.accountStatus).toBe("Active");
    expect(result.mustChangePassword).toBe(true);
    expect(result.credentialEmailStatus).toBe("Success");
    expect(result.profileVerificationStatus).toBe("Draft");
    expect(result.providerProfileId).toBeDefined();

    // Verify user_accounts DB record
    const userRes = await query(
      `SELECT role_code, admin_type, account_status, must_change_password, full_name, phone
       FROM user_accounts WHERE user_id = $1`,
      [result.userId]
    );
    expect(userRes.rows.length).toBe(1);
    expect(userRes.rows[0].role_code).toBe("Local_Provider");
    expect(userRes.rows[0].admin_type).toBeNull();
    expect(userRes.rows[0].account_status).toBe("Active");
    expect(userRes.rows[0].must_change_password).toBe(true);
    expect(userRes.rows[0].phone).toBe("+84912345678");

    // Verify provider_profiles DB record
    const profileRes = await query(
      `SELECT village_id, verification_status, current_version_no, published_version_no
       FROM provider_profiles WHERE provider_id = $1`,
      [result.providerProfileId]
    );
    expect(profileRes.rows.length).toBe(1);
    expect(profileRes.rows[0].village_id).toBe(assignedVillageId);
    expect(profileRes.rows[0].verification_status).toBe("Draft");
    expect(profileRes.rows[0].current_version_no).toBe(1);
    expect(profileRes.rows[0].published_version_no).toBeNull();

    // Verify provider_profile_versions DB record
    const verRes = await query(
      `SELECT version_no, version_status, business_name, location_address, contact_information
       FROM provider_profile_versions WHERE provider_id = $1 AND version_no = 1`,
      [result.providerProfileId]
    );
    expect(verRes.rows.length).toBe(1);
    expect(verRes.rows[0].version_status).toBe("Draft");
    expect(verRes.rows[0].business_name).toBe("Bat Trang Pottery Workshop");
    expect(verRes.rows[0].location_address).toBe("123 Bat Trang Village, Gia Lam, Hanoi");
    expect(verRes.rows[0].contact_information).toEqual({
      contact_person_name: "Nguyen Van A",
      phone_number: "+84912345678",
    });

    // Verify audit log
    const auditRes = await query(
      `SELECT action, target_type, target_id FROM audit_logs WHERE target_id = $1`,
      [result.userId]
    );
    expect(auditRes.rows.length).toBe(1);
    expect(auditRes.rows[0].action).toBe("LOCAL_PROVIDER_ACCOUNT_CREATED");
  });

  it("AS-2 / BR-009: Provider from another village / requested village mismatch → denied with 403", async () => {
    const result = await createLocalProviderAccount({
      actorUserId: ubndUserId,
      actorAdminType: "UBND",
      providerName: "Other Village Workshop",
      address: "456 Other Village",
      contact: {
        contactPersonName: "Tran Van B",
        phoneNumber: "0987654321",
      },
      email: "other_village_lp@example.com",
      requestedVillageId: otherVillageId,
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(403);
    expect(result.errorMessage).toMatch(/another village|outside assigned village/i);
  });

  it("AS-3 / BR-015: Account activation does NOT mean profile is verified", async () => {
    const result = await createLocalProviderAccount({
      actorUserId: ubndUserId,
      actorAdminType: "UBND",
      providerName: "Silk Weaving Studio",
      address: "789 Craft Street",
      contact: {
        contactPersonName: "Le Thi C",
        phoneNumber: "0912345670",
      },
      email: "silk_lp@example.com",
    });

    expect(result.success).toBe(true);
    expect(result.accountStatus).toBe("Active");
    expect(result.profileVerificationStatus).toBe("Draft");
    expect(result.profileVerificationStatus).not.toBe("Verified");
  });

  it("BR-007 / FR-016: Non-UBND actor (e.g. HDT or non-admin) cannot create Local Provider account", async () => {
    const result = await createLocalProviderAccount({
      actorUserId: hdtUserId,
      actorAdminType: "HDT",
      providerName: "Unauthorized Workshop",
      address: "123 Village",
      contact: {
        contactPersonName: "Person",
        phoneNumber: "0912345671",
      },
      email: "unauth@example.com",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(403);
    expect(result.errorMessage).toMatch(/only UBND/i);
  });

  it("FR-020: Duplicate email returns 400 error", async () => {
    const result = await createLocalProviderAccount({
      actorUserId: ubndUserId,
      actorAdminType: "UBND",
      providerName: "Duplicate Email Workshop",
      address: "123 Village",
      contact: {
        contactPersonName: "Person",
        phoneNumber: "0912345672",
      },
      email: "battrang_lp1@example.com", // Already used in AS-1
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.errorMessage).toMatch(/email already exists/i);
  });

  it("FR-020: Missing required fields returns 400 validation error", async () => {
    const result = await createLocalProviderAccount({
      actorUserId: ubndUserId,
      actorAdminType: "UBND",
      providerName: "",
      address: "",
      contact: {
        contactPersonName: "",
        phoneNumber: "invalid",
      },
      email: "notanemail",
    });

    expect(result.success).toBe(false);
    expect(result.status).toBe(400);
    expect(result.fieldErrors && result.fieldErrors.length).toBeGreaterThan(0);
  });
});
