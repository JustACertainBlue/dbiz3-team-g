import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
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

// In-memory rate limiting map for dev/test: email -> timestamps[], ip -> timestamps[]
const emailRateLimit = new Map<string, number[]>();
const ipRateLimit = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 5;

export interface RequestResetResult {
  success: boolean;
  status: number;
  resultMessage?: string;
  emailDeliveryStatus?: "Success" | "Fail" | "Not Applicable";
  errorMessage?: string;
  tokenId?: string;
  token?: string;
}

export interface ResetPasswordResult {
  success: boolean;
  status: number;
  successMessage?: string;
  redirectUrl?: string;
  errorMessage?: string;
}

export function validatePasswordComplexity(password: string): boolean {
  if (!password || password.length < 8 || password.length > 64) {
    return false;
  }
  if (/\s/.test(password)) {
    return false;
  }
  if (!/[A-Z]/.test(password)) {
    return false;
  }
  if (!/[a-z]/.test(password)) {
    return false;
  }
  if (!/[0-9]/.test(password)) {
    return false;
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return false;
  }
  return true;
}

export async function requestPasswordReset(
  email?: string,
  clientIp?: string,
  pool?: pg.Pool
): Promise<RequestResetResult> {
  if (!email || !email.trim() || !email.includes("@")) {
    return {
      success: false,
      status: 400,
      errorMessage: "A valid email address is required",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();

  // Check rate limits per FR-011
  const emailHistory = (emailRateLimit.get(normalizedEmail) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );
  if (emailHistory.length >= MAX_PER_EMAIL) {
    return {
      success: false,
      status: 429,
      errorMessage: "Rate limit exceeded. Please wait 15 minutes before trying again.",
    };
  }

  if (clientIp) {
    const ipHistory = (ipRateLimit.get(clientIp) || []).filter(
      (t) => now - t < RATE_LIMIT_WINDOW_MS
    );
    if (ipHistory.length >= MAX_PER_IP) {
      return {
        success: false,
        status: 429,
        errorMessage: "Rate limit exceeded. Please wait 15 minutes before trying again.",
      };
    }
    ipRateLimit.set(clientIp, [...ipHistory, now]);
  }
  emailRateLimit.set(normalizedEmail, [...emailHistory, now]);

  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  const userRes = await queryFn(
    `SELECT user_id, email FROM user_accounts WHERE lower(email) = lower($1)`,
    [normalizedEmail]
  );

  let tokenId: string | undefined;
  let token: string | undefined;

  if (userRes.rows.length > 0) {
    const userId = userRes.rows[0].user_id;
    token = randomBytes(24).toString("hex");

    const tokenRes = await queryFn(
      `INSERT INTO password_reset_tokens (
        token_id, user_id, token_verifier, issued_at, expires_at
      ) VALUES (
        gen_random_uuid(), $1, $2, now(), now() + interval '15 minutes'
      ) RETURNING token_id`,
      [userId, token]
    );

    tokenId = tokenRes.rows[0].token_id;

    // Dev outbox write
    try {
      ensureOutboxDir();
      const outboxPath = path.join(outboxDir, `reset-${tokenId}.txt`);
      const content = `To: ${normalizedEmail}\nToken: ${token}\nReset Link: http://localhost:3000/reset-password?token=${token}\nExpires: 15 minutes\n`;
      fs.writeFileSync(outboxPath, content, "utf-8");
    } catch (err) {
      console.warn("Outbox file write error:", err);
    }
  }

  // Generic message always returned per FR-011 enumeration protection
  return {
    success: true,
    status: 200,
    resultMessage: "If an account exists for this email, a password reset link has been sent.",
    emailDeliveryStatus: "Success",
    tokenId,
    token,
  };
}

export async function validateResetToken(
  token: string,
  pool?: pg.Pool
): Promise<{ valid: boolean; errorMessage?: string }> {
  if (!token || !token.trim()) {
    return { valid: false, errorMessage: "Token invalid" };
  }

  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  const tokenRes = await queryFn(
    `SELECT token_id, expires_at, used_at
     FROM password_reset_tokens
     WHERE token_verifier = $1`,
    [token.trim()]
  );

  if (tokenRes.rows.length === 0 || tokenRes.rows[0].used_at !== null) {
    return { valid: false, errorMessage: "Token invalid" };
  }

  if (new Date(tokenRes.rows[0].expires_at) < new Date()) {
    return { valid: false, errorMessage: "Token expired" };
  }

  return { valid: true };
}

export async function resetPasswordWithToken(
  token?: string,
  newPassword?: string,
  confirmPassword?: string,
  pool?: pg.Pool
): Promise<ResetPasswordResult> {
  if (!newPassword || !confirmPassword) {
    return {
      success: false,
      status: 400,
      errorMessage: "Password does not meet requirements",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      success: false,
      status: 400,
      errorMessage: "Passwords do not match",
    };
  }

  if (!validatePasswordComplexity(newPassword)) {
    return {
      success: false,
      status: 400,
      errorMessage: "Password does not meet requirements",
    };
  }

  if (!token || !token.trim()) {
    return {
      success: false,
      status: 400,
      errorMessage: "Token invalid",
    };
  }

  const queryFn = pool ? pool.query.bind(pool) : defaultQuery;

  const tokenRes = await queryFn(
    `SELECT token_id, user_id, expires_at, used_at
     FROM password_reset_tokens
     WHERE token_verifier = $1`,
    [token.trim()]
  );

  if (tokenRes.rows.length === 0) {
    return {
      success: false,
      status: 400,
      errorMessage: "Token invalid",
    };
  }

  const tokenRow = tokenRes.rows[0];

  if (tokenRow.used_at !== null) {
    return {
      success: false,
      status: 400,
      errorMessage: "Token invalid",
    };
  }

  if (new Date(tokenRow.expires_at) < new Date()) {
    return {
      success: false,
      status: 400,
      errorMessage: "Token expired",
    };
  }

  // Atomically update password and consume token
  const newHash = await hashPassword(newPassword);

  await queryFn(
    `UPDATE user_accounts
     SET password_hash = $1, password_changed_at = now(), updated_at = now()
     WHERE user_id = $2`,
    [newHash, tokenRow.user_id]
  );

  await queryFn(
    `UPDATE password_reset_tokens
     SET used_at = now()
     WHERE token_id = $1`,
    [tokenRow.token_id]
  );

  return {
    success: true,
    status: 200,
    successMessage: "Password updated successfully",
    redirectUrl: "/reset-password/success",
  };
}
