"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OtpPage() {
  const router = useRouter();

  const [registrationRequestId, setRegistrationRequestId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [otpCode, setOtpCode] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedId = sessionStorage.getItem("registration_request_id") || "";
      const storedEmail = sessionStorage.getItem("registration_email") || "";
      setRegistrationRequestId(storedId);
      setEmail(storedEmail);
    }
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!registrationRequestId) {
      setErrorMessage("Missing registration request. Please start registration again.");
      return;
    }

    if (!/^[0-9]{6}$/.test(otpCode)) {
      setErrorMessage("OTP must be exactly 6 numeric digits");
      return;
    }

    setIsVerifying(true);

    try {
      const res = await fetch("/api/register/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_request_id: registrationRequestId,
          otp_code: otpCode,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.otp_verified) {
        setAttemptsUsed((prev) => prev + 1);
        const remaining = 5 - (attemptsUsed + 1);
        let msg = data.error_message || "Invalid OTP";
        if (remaining > 0 && remaining < 5) {
          msg += ` (${remaining} attempts remaining)`;
        }
        setErrorMessage(msg);
        setIsVerifying(false);
        return;
      }

      // Success: Save account details for REG116
      if (typeof window !== "undefined") {
        sessionStorage.setItem("account_status", data.account_status || "Pending Approval");
        sessionStorage.setItem("agency_account_id", data.agency_account_id || "");
        sessionStorage.setItem("user_id", data.user_id || "");
        if (data.confirmation_email_status) {
          sessionStorage.setItem("confirmation_email_status", data.confirmation_email_status);
        }
      }

      router.push("/register/status");
    } catch (err: any) {
      setErrorMessage(err.message || "Verification failed due to a network error.");
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!registrationRequestId) {
      setErrorMessage("Missing registration request ID.");
      return;
    }

    setIsResending(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/register/resend-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          registration_request_id: registrationRequestId,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.resent) {
        setErrorMessage(data.error_message || "Failed to resend verification code.");
      } else {
        setOtpCode("");
        setAttemptsUsed(0);
        setSuccessMessage("A new 6-digit verification code has been sent. Please check your inbox or dev outbox.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  const handleEditEmail = () => {
    router.push("/register");
  };

  return (
    <div className="card" style={{ maxWidth: "600px", margin: "2rem auto" }}>
      <div className="card-header">
        <h1 className="card-title">OTP Verification Input</h1>
        <p className="card-subtitle">
          Please enter the 6-digit verification code sent to your email address.
        </p>
      </div>

      {errorMessage && <div className="alert alert-danger">{errorMessage}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <div className="status-details">
        <div className="status-row">
          <span className="status-label">Email:</span>
          <span>{email || "agency@example.com"}</span>
        </div>
        <div className="status-row">
          <span className="status-label">Request ID:</span>
          <span className="status-value">{registrationRequestId || "—"}</span>
        </div>
      </div>

      <form onSubmit={handleVerify}>
        <div className="form-group" style={{ alignItems: "center" }}>
          <label htmlFor="otp_code">Enter 6-digit code</label>
          <input
            id="otp_code"
            name="otp_code"
            type="text"
            maxLength={6}
            value={otpCode}
            onChange={(e) => setOtpCode(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="123456"
            className="otp-input"
            autoFocus
          />
          <small style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>
            The code is valid for 10 minutes (maximum 5 attempts).
          </small>
        </div>

        <div className="btn-group" style={{ justifyContent: "center" }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isVerifying || otpCode.length !== 6}
          >
            {isVerifying ? "Verifying..." : "Verify email"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleResend}
            disabled={isResending}
          >
            {isResending ? "Resending..." : "Resend OTP"}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleEditEmail}
          >
            Edit registration email
          </button>
        </div>
      </form>
    </div>
  );
}
