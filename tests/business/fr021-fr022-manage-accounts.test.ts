import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import {
  listAccounts,
  applyAccountAction,
  getAccountDetails,
} from "@/lib/account-management";

const TEST_DB_NAME = "test_aut_manage_accounts";

describe("US-9 Manage Accounts (UC-ACC-09, F-AUTH-21, F-AUTH-22, F-AUTH-16, screens ADM095, ADM118)", () => {
  const hdtAdminId = "00000000-0000-0000-0000-000000000001";
  const ubndAdminId = "00000000-0000-0000-0000-000000000002";
  const village1Id = "11111111-1111-1111-1111-111111111111";
  const village2Id = "22222222-2222-2222-2222-222222222222";

  const lp1UserId = "33333333-3333-3333-3333-333333333331";
  const lp1ProfileId = "33333333-3333-3333-3333-444444444441";

  const lp2UserId = "33333333-3333-3333-3333-333333333332";
  const lp2ProfileId = "33333333-3333-3333-3333-444444444442";

  const agencyUserId = "55555555-5555-5555-5555-555555555555";
  const agencyProfileId = "55555555-5555-5555-5555-666666666666";
  const regRequestId = "55555555-5555-5555-5555-777777777777";

  const sessionId = "88888888-8888-8888-8888-888888888888";

  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);

    // Villages
    await query(
      `INSERT INTO villages (village_id, source_code, name, city_province, is_active)
       VALUES ($1, 'V_BATT_RANG', 'Bat Trang Village', 'Hanoi', true)`,
      [village1Id]
    );
    await query(
      `INSERT INTO villages (village_id, source_code, name, city_province, is_active)
       VALUES ($1, 'V_VAN_PHUC', 'Van Phuc Silk Village', 'Hanoi', true)`,
      [village2Id]
    );

    // HDT Admin
    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, admin_type, account_status, full_name, created_at, updated_at
      ) VALUES ($1, 'hdt_mgr@example.com', 'hash', 'ADMIN', 'HDT', 'Active', 'HDT Officer', now(), now())`,
      [hdtAdminId]
    );

    // UBND Admin (assigned to Village 1)
    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, admin_type, account_status, full_name, created_at, updated_at
      ) VALUES ($1, 'ubnd_battrang@example.com', 'hash', 'ADMIN', 'UBND', 'Active', 'UBND Bat Trang', now(), now())`,
      [ubndAdminId]
    );
    await query(
      `INSERT INTO ubnd_village_assignments (ubnd_user_id, village_id, assigned_by, assigned_at)
       VALUES ($1, $2, $3, now())`,
      [ubndAdminId, village1Id, hdtAdminId]
    );

    // LP 1 (in Village 1 — within UBND scope)
    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, admin_type, account_status, full_name, created_at, updated_at
      ) VALUES ($1, 'lp1@example.com', 'hash', 'Local_Provider', NULL, 'Active', 'Potter One', now(), now())`,
      [lp1UserId]
    );
    await query(
      `INSERT INTO provider_profiles (
        provider_id, user_id, village_id, verification_status, current_version_no, created_at, updated_at
      ) VALUES ($1, $2, $3, 'Draft', NULL, now(), now())`,
      [lp1ProfileId, lp1UserId, village1Id]
    );
    await query(
      `INSERT INTO provider_profile_versions (
        provider_id, version_no, version_status, business_name, location_address, contact_information
      ) VALUES ($1, 1, 'Draft', 'Ceramic Workshop 1', '1 Village Road', '{"contact_person_name": "Potter", "phone_number": "0912345678"}')`,
      [lp1ProfileId]
    );
    await query(
      `UPDATE provider_profiles SET current_version_no = 1 WHERE provider_id = $1`,
      [lp1ProfileId]
    );

    // Active session for LP1 to test revocation
    await query(
      `INSERT INTO sessions (
        session_id, user_id, role_context, expires_at, created_at
      ) VALUES ($1, $2, 'Local_Provider', now() + interval '2 hours', now())`,
      [sessionId, lp1UserId]
    );

    // LP 2 (in Village 2 — outside UBND scope)
    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, admin_type, account_status, full_name, created_at, updated_at
      ) VALUES ($1, 'lp2@example.com', 'hash', 'Local_Provider', NULL, 'Active', 'Weaver Two', now(), now())`,
      [lp2UserId]
    );
    await query(
      `INSERT INTO provider_profiles (
        provider_id, user_id, village_id, verification_status, current_version_no, created_at, updated_at
      ) VALUES ($1, $2, $3, 'Draft', NULL, now(), now())`,
      [lp2ProfileId, lp2UserId, village2Id]
    );
    await query(
      `INSERT INTO provider_profile_versions (
        provider_id, version_no, version_status, business_name, location_address, contact_information
      ) VALUES ($1, 1, 'Draft', 'Silk Studio 2', '2 Silk Road', '{"contact_person_name": "Weaver", "phone_number": "0912345679"}')`,
      [lp2ProfileId]
    );
    await query(
      `UPDATE provider_profiles SET current_version_no = 1 WHERE provider_id = $1`,
      [lp2ProfileId]
    );

    // Agency account (outside UBND scope)
    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, admin_type, account_status, full_name, created_at, updated_at
      ) VALUES ($1, 'agency_mgr@example.com', 'hash', 'Tour_Agency', NULL, 'Approved', 'Agency Owner', now(), now())`,
      [agencyUserId]
    );
    await query(
      `INSERT INTO agency_registration_requests (
        registration_request_id, email, current_status, created_at, updated_at
      ) VALUES ($1, 'agency_mgr@example.com', 'Approved', now(), now())`,
      [regRequestId]
    );
    await query(
      `INSERT INTO agency_profiles (
        agency_id, user_id, registration_request_id, company_name, company_type, tax_id, location, contact_info, team_size, tour_types, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'Hanoi Tours Co', 'Travel Agency', '0123456789', '{"city_province": "Hanoi"}', '{"phone_number": "0912345670"}', 10, '["Cultural/Heritage"]', now(), now()
      )`,
      [agencyProfileId, agencyUserId, regRequestId]
    );
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("AS-1 / FR-021: HDT sees all accounts; UBND sees only Local Providers in its assigned village", async () => {
    // HDT list query
    const hdtRes = await listAccounts({
      actorUserId: hdtAdminId,
      actorRole: "ADMIN",
      actorAdminType: "HDT",
    });
    expect(hdtRes.success).toBe(true);
    // HDT sees all: HDT admin, UBND admin, LP1, LP2, Agency
    const userEmails = hdtRes.users.map((u) => u.email);
    expect(userEmails).toContain("hdt_mgr@example.com");
    expect(userEmails).toContain("ubnd_battrang@example.com");
    expect(userEmails).toContain("lp1@example.com");
    expect(userEmails).toContain("lp2@example.com");
    expect(userEmails).toContain("agency_mgr@example.com");

    // UBND list query
    const ubndRes = await listAccounts({
      actorUserId: ubndAdminId,
      actorRole: "ADMIN",
      actorAdminType: "UBND",
    });
    expect(ubndRes.success).toBe(true);
    const ubndEmails = ubndRes.users.map((u) => u.email);
    // Should see LP1 (in Bat Trang)
    expect(ubndEmails).toContain("lp1@example.com");
    // Must NOT see LP2 (in Van Phuc), Agency, HDT, or other UBND
    expect(ubndEmails).not.toContain("lp2@example.com");
    expect(ubndEmails).not.toContain("agency_mgr@example.com");
    expect(ubndEmails).not.toContain("hdt_mgr@example.com");
    expect(ubndEmails).not.toContain("ubnd_battrang@example.com");
  });

  it("AS-2 / BR-013 / FR-022: Disabling account sets status to 'Disabled' and invalidates active sessions immediately", async () => {
    // Verify active session exists before disable
    const sessionBefore = await query(
      `SELECT revoked_at FROM sessions WHERE session_id = $1`,
      [sessionId]
    );
    expect(sessionBefore.rows[0].revoked_at).toBeNull();

    // Disable LP1
    const disableRes = await applyAccountAction({
      actorUserId: hdtAdminId,
      actorRole: "ADMIN",
      actorAdminType: "HDT",
      targetUserId: lp1UserId,
      actionType: "disable",
      reason: "Policy violation",
    });

    expect(disableRes.success).toBe(true);
    expect(disableRes.accountStatus).toBe("Disabled");
    expect(disableRes.sessionsInvalidated).toBe(true);

    // Verify user_accounts status is Disabled
    const userRes = await query(
      `SELECT account_status FROM user_accounts WHERE user_id = $1`,
      [lp1UserId]
    );
    expect(userRes.rows[0].account_status).toBe("Disabled");

    // Verify session was revoked immediately
    const sessionAfter = await query(
      `SELECT revoked_at FROM sessions WHERE session_id = $1`,
      [sessionId]
    );
    expect(sessionAfter.rows[0].revoked_at).not.toBeNull();

    // Verify account_status_history record
    const historyRes = await query(
      `SELECT from_status, to_status, reason FROM account_status_history WHERE user_id = $1 ORDER BY changed_at DESC LIMIT 1`,
      [lp1UserId]
    );
    expect(historyRes.rows.length).toBe(1);
    expect(historyRes.rows[0].from_status).toBe("Active");
    expect(historyRes.rows[0].to_status).toBe("Disabled");
    expect(historyRes.rows[0].reason).toBe("Policy violation");
  });

  it("Edge / FR-022: Enable restores previous eligible status from account_status_history", async () => {
    const enableRes = await applyAccountAction({
      actorUserId: hdtAdminId,
      actorRole: "ADMIN",
      actorAdminType: "HDT",
      targetUserId: lp1UserId,
      actionType: "enable",
    });

    expect(enableRes.success).toBe(true);
    expect(enableRes.accountStatus).toBe("Active"); // Restored from Active

    const userRes = await query(
      `SELECT account_status FROM user_accounts WHERE user_id = $1`,
      [lp1UserId]
    );
    expect(userRes.rows[0].account_status).toBe("Active");
  });

  it("AS-3 / BR-009 / FR-016: UBND resets password only for Local Provider in assigned village; cross-village or non-provider target is 403 denied", async () => {
    // Permitted: UBND resets password for LP1 (in Bat Trang)
    const resetLp1Res = await applyAccountAction({
      actorUserId: ubndAdminId,
      actorRole: "ADMIN",
      actorAdminType: "UBND",
      targetUserId: lp1UserId,
      actionType: "reset_password",
    });
    expect(resetLp1Res.success).toBe(true);
    expect(resetLp1Res.temporaryPasswordEmailStatus).toBe("Success");

    // Must have updated must_change_password to true
    const lp1Check = await query(
      `SELECT must_change_password FROM user_accounts WHERE user_id = $1`,
      [lp1UserId]
    );
    expect(lp1Check.rows[0].must_change_password).toBe(true);

    // Denied: UBND attempts to reset password for LP2 (Van Phuc — different village)
    const resetLp2Res = await applyAccountAction({
      actorUserId: ubndAdminId,
      actorRole: "ADMIN",
      actorAdminType: "UBND",
      targetUserId: lp2UserId,
      actionType: "reset_password",
    });
    expect(resetLp2Res.success).toBe(false);
    expect(resetLp2Res.status).toBe(403);
    expect(resetLp2Res.errorMessage).toMatch(/outside assigned village|forbidden/i);

    // Denied: UBND attempts to act on an Agency account
    const resetAgencyRes = await applyAccountAction({
      actorUserId: ubndAdminId,
      actorRole: "ADMIN",
      actorAdminType: "UBND",
      targetUserId: agencyUserId,
      actionType: "disable",
    });
    expect(resetAgencyRes.success).toBe(false);
    expect(resetAgencyRes.status).toBe(403);
  });

  it("AS-4 / BR-010: Account management action does not modify business or profile content", async () => {
    // Read profile version content before action
    const verBefore = await query(
      `SELECT business_name, location_address, contact_information FROM provider_profile_versions WHERE provider_id = $1`,
      [lp1ProfileId]
    );

    // Perform an account action
    await applyAccountAction({
      actorUserId: hdtAdminId,
      actorRole: "ADMIN",
      actorAdminType: "HDT",
      targetUserId: lp1UserId,
      actionType: "reset_password",
    });

    // Read profile version content after action
    const verAfter = await query(
      `SELECT business_name, location_address, contact_information FROM provider_profile_versions WHERE provider_id = $1`,
      [lp1ProfileId]
    );

    expect(verAfter.rows[0]).toEqual(verBefore.rows[0]);
  });

  it("FR-016: Non-admin actor cannot list or manage accounts", async () => {
    const listRes = await listAccounts({
      actorUserId: agencyUserId,
      actorRole: "Tour_Agency",
    });
    expect(listRes.success).toBe(false);
    expect(listRes.status).toBe(403);

    const actionRes = await applyAccountAction({
      actorUserId: agencyUserId,
      actorRole: "Tour_Agency",
      targetUserId: lp1UserId,
      actionType: "disable",
    });
    expect(actionRes.success).toBe(false);
    expect(actionRes.status).toBe(403);
  });
});
