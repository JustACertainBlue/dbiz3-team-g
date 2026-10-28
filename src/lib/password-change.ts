import { query as defaultQuery } from "./db";
import { hashPassword, verifyPassword } from "./password";
import type pg from "pg";

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ChangePasswordResult {
  success: boolean;
  status: number;
  errorMessage?: "Current password incorrect" | "New password does not meet requirements" | "Passwords do not match";
  successMessage?: string;
  passwordUpdatedAt?: string;
  auditLogId?: string;
  redirectUrl?: string;
}

export function validatePasswordComplexity(password: string): boolean {
  if (!password || password.length < 8 || password.length > 64) {
    return false;
  }
  if (/\s/.test(password)) {
    return false;
  }
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return hasUpper && hasLower && hasDigit && hasSpecial;
}

export async function changePassword(
  input: ChangePasswordInput,
  pool?: pg.Pool
): Promise<ChangePasswordResult> {
  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  // 1. Password confirmation match
  if (input.newPassword !== input.confirmNewPassword) {
    return {
      success: false,
      status: 400,
      errorMessage: "Passwords do not match",
    };
  }

  // 2. Complexity check
  if (!validatePasswordComplexity(input.newPassword)) {
    return {
      success: false,
      status: 400,
      errorMessage: "New password does not meet requirements",
    };
  }

  // 3. Retrieve user
  const userRes = await queryFn(
    `SELECT user_id, password_hash, role_code, admin_type
     FROM user_accounts
     WHERE user_id = $1`,
    [input.userId]
  );

  if (userRes.rows.length === 0) {
    return {
      success: false,
      status: 400,
      errorMessage: "Current password incorrect",
    };
  }

  const user = userRes.rows[0];

  // 4. Verify current password
  const isMatch = await verifyPassword(input.currentPassword, user.password_hash);
  if (!isMatch) {
    return {
      success: false,
      status: 400,
      errorMessage: "Current password incorrect",
    };
  }

  // 5. Hash new password and update user record
  const newHash = await hashPassword(input.newPassword);
  const updateRes = await queryFn(
    `UPDATE user_accounts
     SET password_hash = $1,
         must_change_password = false,
         updated_at = CURRENT_TIMESTAMP
     WHERE user_id = $2
     RETURNING updated_at`,
    [newHash, input.userId]
  );

  const updatedAt = updateRes.rows[0]?.updated_at?.toISOString() || new Date().toISOString();

  // 6. Insert audit log
  const auditRes = await queryFn(
    `INSERT INTO audit_logs (
      audit_id, actor_user_id, action, target_type, target_id, change_or_result, occurred_at
    ) VALUES (
      gen_random_uuid(), $1, 'PASSWORD_CHANGED', 'UserAccount', $2, $3, CURRENT_TIMESTAMP
    ) RETURNING audit_id`,
    [
      input.userId,
      input.userId,
      JSON.stringify({ action: "change_password", source: "ACC129" }),
    ]
  );
  const auditLogId = auditRes.rows[0]?.audit_id;

  // 7. Determine redirect url per FR-008
  let redirectUrl = "/explore";
  if (user.role_code === "ADMIN") {
    redirectUrl = "/admin/dashboard";
  } else if (user.role_code === "Local_Provider") {
    redirectUrl = "/provider/dashboard";
  } else {
    redirectUrl = "/explore";
  }

  return {
    success: true,
    status: 200,
    successMessage: "Password changed successfully",
    passwordUpdatedAt: updatedAt,
    auditLogId,
    redirectUrl,
  };
}
