import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createTestDb, dropTestDb } from "./helpers/db";
import { query, closePool } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { changePassword } from "@/lib/password-change";
import { authenticate } from "@/lib/auth";

const TEST_DB_NAME = "test_aut_change_password";

describe("US-5 Change Password (UC-ACC-05, F-AUTH-13, F-AUTH-14, FR-008)", () => {
  const userId = "55555555-5555-5555-5555-555555555555";
  const email = "changepass_user@example.com";
  const initialPassword = "OldPassword123!";

  beforeAll(async () => {
    createTestDb(TEST_DB_NAME);

    const initialHash = await hashPassword(initialPassword);
    await query(
      `INSERT INTO user_accounts (
        user_id, email, password_hash, role_code, account_status, full_name, must_change_password, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 'Tour_Agency', 'Approved', 'Change Pass User', true, now(), now()
      )`,
      [userId, email, initialHash]
    );
  });

  afterAll(async () => {
    await closePool();
    dropTestDb(TEST_DB_NAME);
  });

  it("AS-2 / F-AUTH-14: rejects when current password is incorrect", async () => {
    const res = await changePassword({
      userId,
      currentPassword: "WrongPassword999!",
      newPassword: "NewSecurePassword123!",
      confirmNewPassword: "NewSecurePassword123!",
    });

    expect(res.success).toBe(false);
    expect(res.errorMessage).toBe("Current password incorrect");

    // Verify password was NOT changed
    const loginOld = await authenticate(email, initialPassword);
    expect(loginOld.success).toBe(true);
  });

  it("FR-014: rejects when new password does not match confirmation", async () => {
    const res = await changePassword({
      userId,
      currentPassword: initialPassword,
      newPassword: "NewSecurePassword123!",
      confirmNewPassword: "MismatchPassword123!",
    });

    expect(res.success).toBe(false);
    expect(res.errorMessage).toBe("Passwords do not match");
  });

  it("FR-014: rejects when new password fails complexity requirements", async () => {
    // Too short / missing requirements
    const res = await changePassword({
      userId,
      currentPassword: initialPassword,
      newPassword: "short",
      confirmNewPassword: "short",
    });

    expect(res.success).toBe(false);
    expect(res.errorMessage).toBe("New password does not meet requirements");
  });

  it("AS-1 / FR-014 / FR-008: updates password, clears must_change_password, logs audit trail, and permits login with new password", async () => {
    const newPass = "BrandNewPass456!";
    const res = await changePassword({
      userId,
      currentPassword: initialPassword,
      newPassword: newPass,
      confirmNewPassword: newPass,
    });

    expect(res.success).toBe(true);
    expect(res.successMessage).toBe("Password changed successfully");
    expect(res.passwordUpdatedAt).toBeDefined();
    expect(res.auditLogId).toBeDefined();
    expect(res.redirectUrl).toBe("/explore"); // Tour Agency landing

    // Verify audit log entry
    const auditRes = await query(
      `SELECT * FROM audit_logs WHERE audit_id = $1`,
      [res.auditLogId]
    );
    expect(auditRes.rows.length).toBe(1);
    expect(auditRes.rows[0].action).toBe("PASSWORD_CHANGED");
    expect(auditRes.rows[0].actor_user_id).toBe(userId);

    // Verify must_change_password cleared
    const userRes = await query(
      `SELECT must_change_password FROM user_accounts WHERE user_id = $1`,
      [userId]
    );
    expect(userRes.rows[0].must_change_password).toBe(false);

    // Verify login with new password succeeds and old password fails
    const loginOld = await authenticate(email, initialPassword);
    expect(loginOld.success).toBe(false);

    const loginNew = await authenticate(email, newPass);
    expect(loginNew.success).toBe(true);
    expect(loginNew.mustChangePassword).toBe(false);
  });
});
