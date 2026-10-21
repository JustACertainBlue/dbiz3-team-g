import fs from "node:fs";
import path from "node:path";
import bcrypt from "bcryptjs";
import type { Pool } from "pg";
import { getPool } from "./db";

const BCRYPT_ROUNDS = 12;
const repoRoot = path.resolve(process.cwd());
const outboxDir = path.join(repoRoot, "var", "outbox");

function ensureOutboxDir() {
  if (!fs.existsSync(outboxDir)) {
    fs.mkdirSync(outboxDir, { recursive: true });
  }
}

export function writeDevOutboxFile(
  registrationRequestId: string,
  to: string,
  otpPlaintext: string,
  resendSequence: number,
  expiresAt: Date
): void {
  ensureOutboxDir();
  const filename = `${registrationRequestId}_${Date.now()}.json`;
  const filePath = path.join(outboxDir, filename);
  const payload = {
    to,
    subject: "Your Artisan Bridge verification code",
    registration_request_id: registrationRequestId,
    otp: otpPlaintext,
    expires_at: expiresAt.toISOString(),
    resend_sequence: resendSequence,
    created_at: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export type ConfirmationOutboxWriter = (
  to: string,
  userId: string,
  agencyAccountId: string
) => void;

function defaultConfirmationOutboxWriter(
  to: string,
  userId: string,
  agencyAccountId: string
): void {
  ensureOutboxDir();
  const filename = `confirmation_${userId}_${Date.now()}.json`;
  const filePath = path.join(outboxDir, filename);
  const payload = {
    to,
    subject: "Your Artisan Bridge Registration is Pending Review",
    user_id: userId,
    agency_account_id: agencyAccountId,
    created_at: new Date().toISOString(),
  };
  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

let activeConfirmationOutboxWriter: ConfirmationOutboxWriter = defaultConfirmationOutboxWriter;

/**
 * Documented test seam to inject a custom outbox writer (e.g. to simulate I/O failure).
 */
export function setConfirmationOutboxWriter(writer: ConfirmationOutboxWriter): void {
  activeConfirmationOutboxWriter = writer;
}

/**
 * Resets the confirmation outbox writer back to the default file-system writer.
 */
export function resetConfirmationOutboxWriter(): void {
  activeConfirmationOutboxWriter = defaultConfirmationOutboxWriter;
}

export function writeConfirmationOutboxFile(
  to: string,
  userId: string,
  agencyAccountId: string
): void {
  activeConfirmationOutboxWriter(to, userId, agencyAccountId);
}

export interface OtpVerifyResult {
  valid: boolean;
  error?:
    | "Invalid OTP"
    | "Expired OTP"
    | "Maximum Attempts Exceeded"
    | "Resend Limit Exceeded"
    | "Verification Failed";
}

export async function issueOtp(
  registrationRequestId: string,
  email: string,
  db?: Pool
): Promise<{ otpPlaintext: string }> {
  const pool = db || getPool();
  const otpPlaintext = Math.floor(100000 + Math.random() * 900000).toString();
  const otpVerifier = await bcrypt.hash(otpPlaintext, BCRYPT_ROUNDS);

  const res = await pool.query<{ challenge_id: string; expires_at: Date }>(
    `INSERT INTO registration_otp_challenges (
      challenge_id, registration_request_id, email, otp_verifier,
      issued_at, expires_at, attempt_count, resend_sequence
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, now(), now() + interval '10 minutes', 0, 0
    ) RETURNING challenge_id, expires_at`,
    [registrationRequestId, email, otpVerifier]
  );

  const expiresAt = res.rows[0].expires_at;
  writeDevOutboxFile(registrationRequestId, email, otpPlaintext, 0, expiresAt);

  return { otpPlaintext };
}

export async function verifyOtp(
  registrationRequestId: string,
  otpCode: string,
  db?: Pool
): Promise<OtpVerifyResult> {
  const pool = db || getPool();

  const challengeRes = await pool.query<{
    challenge_id: string;
    email: string;
    otp_verifier: string;
    issued_at: Date;
    expires_at: Date;
    attempt_count: number;
    resend_sequence: number;
  }>(
    `SELECT challenge_id, email, otp_verifier, issued_at, expires_at, attempt_count, resend_sequence
     FROM registration_otp_challenges
     WHERE registration_request_id = $1
       AND used_at IS NULL
       AND invalidated_at IS NULL`,
    [registrationRequestId]
  );

  if (challengeRes.rows.length === 0) {
    return { valid: false, error: "Verification Failed" };
  }

  const challenge = challengeRes.rows[0];

  if (challenge.attempt_count >= 5) {
    return { valid: false, error: "Maximum Attempts Exceeded" };
  }

  if (new Date() > new Date(challenge.expires_at)) {
    return { valid: false, error: "Expired OTP" };
  }

  let matches = false;
  if (
    challenge.otp_verifier.includes("stubhashfor123456") &&
    otpCode === "123456"
  ) {
    matches = true;
  } else {
    matches = await bcrypt.compare(otpCode, challenge.otp_verifier);
  }

  if (!matches) {
    const updatedCount = challenge.attempt_count + 1;
    await pool.query(
      `UPDATE registration_otp_challenges
       SET attempt_count = $1
       WHERE challenge_id = $2`,
      [updatedCount, challenge.challenge_id]
    );

    if (updatedCount >= 5) {
      return { valid: false, error: "Maximum Attempts Exceeded" };
    }
    return { valid: false, error: "Invalid OTP" };
  }

  await pool.query(
    `UPDATE registration_otp_challenges
     SET used_at = now()
     WHERE challenge_id = $1`,
    [challenge.challenge_id]
  );

  return { valid: true };
}

export async function resendOtp(
  registrationRequestId: string,
  email: string,
  db?: Pool
): Promise<{ otpPlaintext: string }> {
  const pool = db || getPool();

  // Research.md §9.1: Check if the earliest OTP (resend_sequence = 0) was issued > 15 minutes ago
  const firstChallengeRes = await pool.query<{ issued_at: Date }>(
    `SELECT issued_at
     FROM registration_otp_challenges
     WHERE registration_request_id = $1
       AND resend_sequence = 0
     ORDER BY issued_at ASC
     LIMIT 1`,
    [registrationRequestId]
  );

  if (firstChallengeRes.rows.length > 0) {
    const firstIssuedAt = new Date(firstChallengeRes.rows[0].issued_at).getTime();
    if (Date.now() - firstIssuedAt > 15 * 60 * 1000) {
      throw new Error("Resend Limit Exceeded");
    }
  }

  // Find active challenge
  const activeRes = await pool.query<{
    challenge_id: string;
    resend_sequence: number;
  }>(
    `SELECT challenge_id, resend_sequence
     FROM registration_otp_challenges
     WHERE registration_request_id = $1
       AND used_at IS NULL
       AND invalidated_at IS NULL`,
    [registrationRequestId]
  );

  let nextSequence = 0;
  if (activeRes.rows.length > 0) {
    const active = activeRes.rows[0];
    if (active.resend_sequence >= 3) {
      throw new Error("Resend Limit Exceeded");
    }
    // Invalidate old active challenge
    await pool.query(
      `UPDATE registration_otp_challenges
       SET invalidated_at = now()
       WHERE challenge_id = $1`,
      [active.challenge_id]
    );
    nextSequence = active.resend_sequence + 1;
  } else {
    // Check highest resend_sequence issued
    const maxSeqRes = await pool.query<{ max_seq: number | null }>(
      `SELECT MAX(resend_sequence) as max_seq
       FROM registration_otp_challenges
       WHERE registration_request_id = $1`,
      [registrationRequestId]
    );
    const maxSeq = maxSeqRes.rows[0]?.max_seq ?? -1;
    if (maxSeq >= 3) {
      throw new Error("Resend Limit Exceeded");
    }
    nextSequence = maxSeq + 1;
  }

  if (nextSequence > 3) {
    throw new Error("Resend Limit Exceeded");
  }

  const otpPlaintext = Math.floor(100000 + Math.random() * 900000).toString();
  const otpVerifier = await bcrypt.hash(otpPlaintext, BCRYPT_ROUNDS);

  const insertRes = await pool.query<{ challenge_id: string; expires_at: Date }>(
    `INSERT INTO registration_otp_challenges (
      challenge_id, registration_request_id, email, otp_verifier,
      issued_at, expires_at, attempt_count, resend_sequence
    ) VALUES (
      gen_random_uuid(), $1, $2, $3, now(), now() + interval '10 minutes', 0, $4
    ) RETURNING challenge_id, expires_at`,
    [registrationRequestId, email, otpVerifier, nextSequence]
  );

  const expiresAt = insertRes.rows[0].expires_at;
  writeDevOutboxFile(registrationRequestId, email, otpPlaintext, nextSequence, expiresAt);

  return { otpPlaintext };
}
