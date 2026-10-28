import { randomUUID } from "node:crypto";
import { query as defaultQuery, getPool } from "./db";
import { verifyPassword } from "./password";
import type pg from "pg";

export interface AuthenticateResult {
  success: boolean;
  status: number;
  errorMessage?: string;
  emptyFieldErrors?: string[];
  sessionToken?: string;
  userId?: string;
  role?: string;
  adminType?: string | null;
  permissionSet?: string[];
  mustChangePassword?: boolean;
  landingScreenId?: string;
  redirectUrl?: string;
}

export interface VerifySessionResult {
  valid: boolean;
  forceLogout: boolean;
  validationResult: "Valid" | "Account Disabled" | "Role Revoked" | "Status Changed";
  errorMessage?: string;
  userId?: string;
  email?: string;
  role?: string;
  adminType?: string | null;
  permissionSet?: string[];
}

export async function authenticate(
  email?: string,
  password?: string,
  pool?: pg.Pool
): Promise<AuthenticateResult> {
  const emptyFields: string[] = [];
  if (!email || !email.trim()) {
    emptyFields.push("email");
  }
  if (!password || !password.trim()) {
    emptyFields.push("password");
  }

  if (emptyFields.length > 0) {
    return {
      success: false,
      status: 400,
      errorMessage: "Email and password are required",
      emptyFieldErrors: emptyFields,
    };
  }

  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  const userRes = await queryFn(
    `SELECT user_id, email, password_hash, role_code, admin_type, account_status, must_change_password
     FROM user_accounts
     WHERE lower(email) = lower($1)`,
    [email!.trim()]
  );

  if (userRes.rows.length === 0) {
    return {
      success: false,
      status: 401,
      errorMessage: "Invalid credentials",
    };
  }

  const user = userRes.rows[0];

  const passwordMatches = await verifyPassword(password!, user.password_hash);
  if (!passwordMatches) {
    return {
      success: false,
      status: 401,
      errorMessage: "Invalid credentials",
    };
  }

  // Account status validation per BR-003, BR-004
  if (user.role_code === "Tour_Agency") {
    if (user.account_status === "Disabled") {
      return {
        success: false,
        status: 403,
        errorMessage: "Account disabled",
      };
    }
    if (user.account_status !== "Approved") {
      return {
        success: false,
        status: 403,
        errorMessage: "Account not approved",
      };
    }
  } else {
    // ADMIN, Local_Provider
    if (user.account_status === "Disabled") {
      return {
        success: false,
        status: 403,
        errorMessage: "Account disabled",
      };
    }
    if (user.account_status !== "Active") {
      return {
        success: false,
        status: 403,
        errorMessage: "Account disabled",
      };
    }
  }

  // Generate session token and store in sessions table
  const sessionToken = randomUUID();
  await queryFn(
    `INSERT INTO sessions (
      session_id, user_id, role_context, token_hash, expires_at, created_at
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, now() + interval '24 hours', now()
    )`,
    [user.user_id, user.role_code, sessionToken]
  );

  await queryFn(
    `UPDATE user_accounts SET last_login = now() WHERE user_id = $1`,
    [user.user_id]
  );

  // Load RBAC permissions (F-AUTH-15 / FR-015)
  const permRes = await queryFn(
    `SELECT DISTINCT permission_code
     FROM role_permissions
     WHERE role_code = $1
       AND (admin_type IS NULL OR admin_type = $2)`,
    [user.role_code, user.admin_type]
  );
  const permissionSet = permRes.rows.map((r: any) => r.permission_code);

  // Determine role landing screen (F-AUTH-08 / FR-008)
  let landingScreenId = "EXP017";
  let redirectUrl = "/explore";

  if (user.must_change_password) {
    landingScreenId = "ACC129";
    redirectUrl = "/login";
  } else if (user.role_code === "ADMIN") {
    landingScreenId = "ADM079";
    redirectUrl = "/admin/dashboard";
  } else if (user.role_code === "Local_Provider") {
    landingScreenId = "DSH018";
    redirectUrl = "/provider/dashboard";
  } else {
    landingScreenId = "EXP017";
    redirectUrl = "/explore";
  }

  return {
    success: true,
    status: 200,
    sessionToken,
    userId: user.user_id,
    role: user.role_code,
    adminType: user.admin_type,
    permissionSet,
    mustChangePassword: user.must_change_password,
    landingScreenId,
    redirectUrl,
  };
}

export async function verifySession(
  sessionToken: string,
  pool?: pg.Pool
): Promise<VerifySessionResult> {
  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  const sessionRes = await queryFn(
    `SELECT s.session_id, s.user_id, s.role_context, s.expires_at, s.revoked_at,
            u.account_status, u.role_code, u.admin_type, u.email
     FROM sessions s
     JOIN user_accounts u ON s.user_id = u.user_id
     WHERE s.token_hash = $1`,
    [sessionToken]
  );

  if (sessionRes.rows.length === 0) {
    return {
      valid: false,
      forceLogout: true,
      validationResult: "Role Revoked",
      errorMessage: "Session not found",
    };
  }

  const session = sessionRes.rows[0];

  if (session.revoked_at || new Date(session.expires_at) < new Date()) {
    return {
      valid: false,
      forceLogout: true,
      validationResult: "Role Revoked",
      errorMessage: "Session expired or revoked",
    };
  }

  if (session.account_status === "Disabled") {
    return {
      valid: false,
      forceLogout: true,
      validationResult: "Account Disabled",
      errorMessage: "Account disabled",
    };
  }

  if (
    (session.role_code === "Tour_Agency" && session.account_status !== "Approved") ||
    ((session.role_code === "ADMIN" || session.role_code === "Local_Provider") && session.account_status !== "Active")
  ) {
    return {
      valid: false,
      forceLogout: true,
      validationResult: "Status Changed",
      errorMessage: "Account status no longer eligible",
    };
  }

  const permRes = await queryFn(
    `SELECT DISTINCT permission_code
     FROM role_permissions
     WHERE role_code = $1
       AND (admin_type IS NULL OR admin_type = $2)`,
    [session.role_code, session.admin_type]
  );
  const permissionSet = permRes.rows.map((r: any) => r.permission_code);

  return {
    valid: true,
    forceLogout: false,
    validationResult: "Valid",
    userId: session.user_id,
    email: session.email,
    role: session.role_code,
    adminType: session.admin_type,
    permissionSet,
  };
}

export interface LogoutResult {
  sessionTerminated: boolean;
  confirmationMessage: string;
  redirectUrl: string;
}

export async function logoutSession(
  sessionToken: string,
  pool?: pg.Pool
): Promise<LogoutResult> {
  if (!sessionToken) {
    return {
      sessionTerminated: false,
      confirmationMessage: "No session token provided",
      redirectUrl: "/login",
    };
  }

  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  // Update session record setting revoked_at to now()
  const res = await queryFn(
    `UPDATE sessions
     SET revoked_at = CURRENT_TIMESTAMP
     WHERE token_hash = $1
     RETURNING session_id`,
    [sessionToken]
  );

  if (res.rowCount === 0) {
    // If token wasn't found in sessions, it cannot be terminated, but redirect is still /login
    return {
      sessionTerminated: false,
      confirmationMessage: "Session not found",
      redirectUrl: "/login",
    };
  }

  return {
    sessionTerminated: true,
    confirmationMessage: "Logged out successfully",
    redirectUrl: "/login",
  };
}
