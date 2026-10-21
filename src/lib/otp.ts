// TODO: OTP functions (implemented in T019)
import type { Pool } from "pg";

export interface OtpVerifyResult {
  valid: boolean;
  error?: "Invalid OTP" | "Expired OTP" | "Maximum Attempts Exceeded" | "Resend Limit Exceeded" | "Verification Failed";
}

export async function issueOtp(_registrationRequestId: string, _email: string, _db?: Pool): Promise<{ otpPlaintext: string }> {
  throw new Error("issueOtp not implemented");
}

export async function verifyOtp(_registrationRequestId: string, _otpCode: string, _db?: Pool): Promise<OtpVerifyResult> {
  throw new Error("verifyOtp not implemented");
}

export async function resendOtp(_registrationRequestId: string, _email: string, _db?: Pool): Promise<{ otpPlaintext: string }> {
  throw new Error("resendOtp not implemented");
}
