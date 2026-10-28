import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { query as defaultQuery } from "./db";
import { hashPassword } from "./password";
import type pg from "pg";

const repoRoot = path.resolve(process.cwd());
const outboxDir = path.join(repoRoot, "var", "outbox");

function ensureOutboxDir() {
  if (!fs.existsSync(outboxDir)) {
    fs.mkdirSync(outboxDir, { recursive: true });
  }
}

function generateTempPassword(): string {
  const base = randomBytes(12).toString("base64").replace(/[+/=]/g, "X");
  return base.slice(0, 14) + "Aa1!";
}

export interface ListAccountsInput {
  actorUserId: string;
  actorRole: string;
  actorAdminType?: string;
  organizationId?: string;
  role?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export interface ManagedAccountItem {
  user_id: string;
  email: string;
  name: string;
  organization: string;
  role: string;
  status: string;
  last_login: string | null;
  created_date: string;
  available_actions: Array<"Disable" | "Enable" | "Reset Password">;
}

export interface ListAccountsResult {
  success: boolean;
  status: number;
  errorMessage?: string;
  users: ManagedAccountItem[];
  total_count: number;
}

export interface AccountActionInput {
  actorUserId: string;
  actorRole: string;
  actorAdminType?: string;
  targetUserId: string;
  actionType: "disable" | "enable" | "reset_password";
  reason?: string;
}

export interface AccountActionResult {
  success: boolean;
  status: number;
  errorMessage?: string;
  accountStatus?: string;
  sessionsInvalidated?: boolean;
  temporaryPasswordEmailStatus?: "Success" | "Fail";
  userNotificationStatus?: "Success" | "Fail";
  auditLogId?: string;
}

export async function listAccounts(
  input: ListAccountsInput,
  pool?: pg.Pool
): Promise<ListAccountsResult> {
  // FR-016: Admin check
  if (input.actorRole !== "ADMIN") {
    return {
      success: false,
      status: 403,
      errorMessage: "Forbidden: Admin access required",
      users: [],
      total_count: 0,
    };
  }

  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  let assignedVillageId: string | null = null;
  if (input.actorAdminType === "UBND") {
    const assignRes = await queryFn(
      `SELECT village_id FROM ubnd_village_assignments WHERE ubnd_user_id = $1`,
      [input.actorUserId]
    );
    if (assignRes.rows.length === 0) {
      return { success: true, status: 200, users: [], total_count: 0 };
    }
    assignedVillageId = assignRes.rows[0].village_id;
  }

  // Base query with organization labels
  let whereClauses: string[] = [];
  let queryParams: any[] = [];
  let paramIdx = 1;

  if (input.actorAdminType === "UBND") {
    // BR-009 / AS-1: UBND sees ONLY Local Providers within its assigned village
    whereClauses.push(
      `u.role_code = 'Local_Provider' AND u.user_id IN (
        SELECT user_id FROM provider_profiles WHERE village_id = $${paramIdx++}
      )`
    );
    queryParams.push(assignedVillageId);
  }

  if (input.role) {
    whereClauses.push(`u.role_code = $${paramIdx++}`);
    queryParams.push(input.role);
  }

  if (input.status) {
    whereClauses.push(`u.account_status = $${paramIdx++}`);
    queryParams.push(input.status);
  }

  if (input.dateFrom) {
    whereClauses.push(`u.created_at >= $${paramIdx++}`);
    queryParams.push(input.dateFrom);
  }

  if (input.dateTo) {
    whereClauses.push(`u.created_at <= $${paramIdx++}`);
    queryParams.push(input.dateTo);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

  // Count total
  const countRes = await queryFn(
    `SELECT COUNT(*) AS total FROM user_accounts u ${whereSql}`,
    queryParams
  );
  const totalCount = parseInt(countRes.rows[0].total, 10);

  // Fetch paginated
  const page = input.page && input.page > 0 ? input.page : 1;
  const pageSize = input.pageSize && input.pageSize > 0 ? input.pageSize : 50;
  const offset = (page - 1) * pageSize;

  const dataRes = await queryFn(
    `SELECT
      u.user_id,
      u.email,
      u.full_name,
      u.role_code,
      u.admin_type,
      u.account_status,
      u.last_login,
      u.created_at,
      ap.company_name AS agency_org,
      ppv.business_name AS provider_org,
      v.name AS assigned_village_name
     FROM user_accounts u
     LEFT JOIN agency_profiles ap ON ap.user_id = u.user_id
     LEFT JOIN provider_profiles pp ON pp.user_id = u.user_id
     LEFT JOIN provider_profile_versions ppv ON ppv.provider_id = pp.provider_id AND ppv.version_no = COALESCE(pp.current_version_no, 1)
     LEFT JOIN ubnd_village_assignments uva ON uva.ubnd_user_id = u.user_id
     LEFT JOIN villages v ON v.village_id = uva.village_id
     ${whereSql}
     ORDER BY u.created_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...queryParams, pageSize, offset]
  );

  const users: ManagedAccountItem[] = dataRes.rows.map((row) => {
    // Determine organization display string (FR-021)
    let organization = "Platform";
    if (row.role_code === "Tour_Agency") {
      organization = row.agency_org || "Tour Agency";
    } else if (row.role_code === "Local_Provider") {
      organization = row.provider_org || "Local Provider";
    } else if (row.role_code === "ADMIN") {
      if (row.admin_type === "HDT") {
        organization = "Hanoi Department of Tourism";
      } else if (row.admin_type === "UBND") {
        organization = row.assigned_village_name
          ? `UBND - ${row.assigned_village_name}`
          : "UBND";
      }
    }

    // Determine available actions based on current status and actor scope
    const available_actions: Array<"Disable" | "Enable" | "Reset Password"> = [];
    if (row.account_status !== "Disabled") {
      available_actions.push("Disable");
    } else {
      available_actions.push("Enable");
    }
    available_actions.push("Reset Password");

    return {
      user_id: row.user_id,
      email: row.email,
      name: row.full_name,
      organization,
      role: row.role_code,
      status: row.account_status,
      last_login: row.last_login ? new Date(row.last_login).toISOString() : null,
      created_date: new Date(row.created_at).toISOString(),
      available_actions,
    };
  });

  return {
    success: true,
    status: 200,
    users,
    total_count: totalCount,
  };
}

export async function getAccountDetails(
  actorUserId: string,
  actorRole: string,
  actorAdminType: string | undefined,
  targetUserId: string,
  pool?: pg.Pool
) {
  if (actorRole !== "ADMIN") {
    return { success: false, status: 403, errorMessage: "Forbidden" };
  }

  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  const userRes = await queryFn(
    `SELECT
      u.user_id,
      u.email,
      u.full_name,
      u.role_code,
      u.admin_type,
      u.account_status,
      u.last_login,
      u.created_at,
      pp.village_id AS provider_village_id
     FROM user_accounts u
     LEFT JOIN provider_profiles pp ON pp.user_id = u.user_id
     WHERE u.user_id = $1`,
    [targetUserId]
  );

  if (userRes.rows.length === 0) {
    return { success: false, status: 404, errorMessage: "User not found" };
  }

  const user = userRes.rows[0];

  // Scope check for UBND
  if (actorAdminType === "UBND") {
    const assignRes = await queryFn(
      `SELECT village_id FROM ubnd_village_assignments WHERE ubnd_user_id = $1`,
      [actorUserId]
    );
    const assignedVillageId = assignRes.rows[0]?.village_id;
    if (
      user.role_code !== "Local_Provider" ||
      user.provider_village_id !== assignedVillageId
    ) {
      return {
        success: false,
        status: 403,
        errorMessage: "Forbidden: target account is outside assigned village scope",
      };
    }
  }

  return {
    success: true,
    status: 200,
    account: {
      user_id: user.user_id,
      email: user.email,
      name: user.full_name,
      role: user.role_code,
      admin_type: user.admin_type,
      status: user.account_status,
      last_login: user.last_login,
      created_date: user.created_at,
    },
  };
}

export async function applyAccountAction(
  input: AccountActionInput,
  pool?: pg.Pool
): Promise<AccountActionResult> {
  // FR-016: Admin permission check
  if (input.actorRole !== "ADMIN") {
    return {
      success: false,
      status: 403,
      errorMessage: "Forbidden: Admin access required",
    };
  }

  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  // Lookup target user
  const userRes = await queryFn(
    `SELECT u.user_id, u.email, u.role_code, u.admin_type, u.account_status, u.full_name,
            pp.village_id AS provider_village_id
     FROM user_accounts u
     LEFT JOIN provider_profiles pp ON pp.user_id = u.user_id
     WHERE u.user_id = $1`,
    [input.targetUserId]
  );

  if (userRes.rows.length === 0) {
    return {
      success: false,
      status: 404,
      errorMessage: "User not found",
    };
  }

  const target = userRes.rows[0];

  // AS-3 / BR-009 / FR-016: Scope check for UBND actor
  if (input.actorAdminType === "UBND") {
    const assignRes = await queryFn(
      `SELECT village_id FROM ubnd_village_assignments WHERE ubnd_user_id = $1`,
      [input.actorUserId]
    );
    const assignedVillageId = assignRes.rows[0]?.village_id;

    if (
      target.role_code !== "Local_Provider" ||
      !target.provider_village_id ||
      target.provider_village_id !== assignedVillageId
    ) {
      return {
        success: false,
        status: 403,
        errorMessage: "Forbidden: target account is outside assigned village scope",
      };
    }
  }

  const auditLogId = randomBytes(16).toString("hex");

  // --- Action 1: Disable (FR-022, BR-013, AS-2) ---
  if (input.actionType === "disable") {
    // Record status history
    await queryFn(
      `INSERT INTO account_status_history (
        history_id, user_id, from_status, to_status, changed_by, changed_at, reason
      ) VALUES (gen_random_uuid(), $1, $2, 'Disabled', $3, now(), $4)`,
      [
        input.targetUserId,
        target.account_status,
        input.actorUserId,
        input.reason || "Administrative suspension",
      ]
    );

    // Update user status
    await queryFn(
      `UPDATE user_accounts SET account_status = 'Disabled', updated_at = now() WHERE user_id = $1`,
      [input.targetUserId]
    );

    // Revoke all active sessions immediately (BR-013, AS-2)
    await queryFn(
      `UPDATE sessions SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL`,
      [input.targetUserId]
    );

    // Record audit log
    await queryFn(
      `INSERT INTO audit_logs (
        audit_id, actor_user_id, action, target_type, target_id, change_or_result, occurred_at
      ) VALUES (gen_random_uuid(), $1, 'ACCOUNT_DISABLED', 'UserAccount', $2, $3, now())`,
      [
        input.actorUserId,
        input.targetUserId,
        JSON.stringify({
          previous_status: target.account_status,
          new_status: "Disabled",
          reason: input.reason || null,
        }),
      ]
    );

    return {
      success: true,
      status: 200,
      accountStatus: "Disabled",
      sessionsInvalidated: true,
      userNotificationStatus: "Success",
      auditLogId,
    };
  }

  // --- Action 2: Enable (FR-022) ---
  if (input.actionType === "enable") {
    // Restore status that was effective immediately before Disable
    const historyRes = await queryFn(
      `SELECT from_status FROM account_status_history
       WHERE user_id = $1 AND to_status = 'Disabled'
       ORDER BY changed_at DESC LIMIT 1`,
      [input.targetUserId]
    );

    const restoredStatus =
      historyRes.rows.length > 0 && historyRes.rows[0].from_status
        ? historyRes.rows[0].from_status
        : target.role_code === "Tour_Agency"
        ? "Approved"
        : "Active";

    // Record status history
    await queryFn(
      `INSERT INTO account_status_history (
        history_id, user_id, from_status, to_status, changed_by, changed_at, reason
      ) VALUES (gen_random_uuid(), $1, 'Disabled', $2, $3, now(), 'Account re-enabled by admin')`,
      [input.targetUserId, restoredStatus, input.actorUserId]
    );

    // Update user status
    await queryFn(
      `UPDATE user_accounts SET account_status = $1, updated_at = now() WHERE user_id = $2`,
      [restoredStatus, input.targetUserId]
    );

    // Record audit log
    await queryFn(
      `INSERT INTO audit_logs (
        audit_id, actor_user_id, action, target_type, target_id, change_or_result, occurred_at
      ) VALUES (gen_random_uuid(), $1, 'ACCOUNT_ENABLED', 'UserAccount', $2, $3, now())`,
      [
        input.actorUserId,
        input.targetUserId,
        JSON.stringify({ restored_status: restoredStatus }),
      ]
    );

    return {
      success: true,
      status: 200,
      accountStatus: restoredStatus,
      userNotificationStatus: "Success",
      auditLogId,
    };
  }

  // --- Action 3: Reset Password (FR-022, AS-3) ---
  if (input.actionType === "reset_password") {
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    // Update password_hash and set must_change_password=true
    await queryFn(
      `UPDATE user_accounts
       SET password_hash = $1, must_change_password = true, updated_at = now()
       WHERE user_id = $2`,
      [passwordHash, input.targetUserId]
    );

    // Write temporary credentials to outbox
    let temporaryPasswordEmailStatus: "Success" | "Fail" = "Success";
    try {
      ensureOutboxDir();
      const outboxPath = path.join(
        outboxDir,
        `admin_reset_credentials_${input.targetUserId}_${Date.now()}.json`
      );
      fs.writeFileSync(
        outboxPath,
        JSON.stringify(
          {
            to: target.email,
            subject: "Your password has been reset by an administrator",
            note: "Temporary password is for one-time login only. Change it immediately after login.",
          },
          null,
          2
        )
      );
    } catch {
      temporaryPasswordEmailStatus = "Fail";
    }

    // Record audit log
    await queryFn(
      `INSERT INTO audit_logs (
        audit_id, actor_user_id, action, target_type, target_id, change_or_result, occurred_at
      ) VALUES (gen_random_uuid(), $1, 'PASSWORD_RESET_ADMIN', 'UserAccount', $2, $3, now())`,
      [
        input.actorUserId,
        input.targetUserId,
        JSON.stringify({ target_email: target.email }),
      ]
    );

    return {
      success: true,
      status: 200,
      temporaryPasswordEmailStatus,
      userNotificationStatus: "Success",
      auditLogId,
    };
  }

  return {
    success: false,
    status: 400,
    errorMessage: `Invalid action type: ${input.actionType}`,
  };
}
