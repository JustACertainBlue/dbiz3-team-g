"use client";

import React, { useState, useEffect, useRef } from "react";
import AuthShell, { AuthAlert } from "../../components/AuthShell";
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
  const boxes = useRef<Array<HTMLInputElement | null>>([]);
  const digits = Array.from({ length: 6 }, (_, i) => otpCode[i] ?? "");
  function setDigit(index: number, raw: string) {
    const clean = raw.replace(/[^0-9]/g, "");
    if (clean.length > 1) { const next = clean.slice(0, 6); setOtpCode(next); boxes.current[Math.min(next.length, 5)]?.focus(); return; }
    setOtpCode((otpCode.slice(0, index) + clean + otpCode.slice(index + 1)).slice(0, 6));
    if (clean && index < 5) boxes.current[index + 1]?.focus();
  }

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
      setErrorMessage("Không tìm thấy yêu cầu đăng ký. Vui lòng đăng ký lại.");
      return;
    }

    if (!/^[0-9]{6}$/.test(otpCode)) {
      setErrorMessage("Mã OTP phải gồm đúng 6 chữ số.");
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
        let msg = data.error_message || "Mã OTP sai.";
        if (remaining > 0 && remaining < 5) {
          msg += ` Còn ${remaining} lần thử.`;
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
      setErrorMessage(err.message || "Không thể xác minh do lỗi mạng.");
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!registrationRequestId) {
      setErrorMessage("Không tìm thấy yêu cầu đăng ký.");
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
        setErrorMessage(data.error_message || "Không thể gửi lại mã.");
      } else {
        setOtpCode("");
        setAttemptsUsed(0);
        setSuccessMessage("Đã gửi mã 6 số mới. Kiểm tra hộp thư (hoặc dev-outbox).");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Không thể gửi lại mã.");
    } finally {
      setIsResending(false);
    }
  };

  const handleEditEmail = () => {
    router.push("/register");
  };

  // REG115 elements: Email, OTP code, Verify email, Resend OTP (F-AUTH-23 limits; no countdown), Edit registration email
  // (Figma "Màn 1 · Nhập OTP"; the resend timer of the mock-up is not in the spec, step 0 #10).
  return (
    <AuthShell title="Nhập mã OTP">
      <form className="auth-v9__form" onSubmit={handleVerify}>
        <p className="auth-v9__lead">Mã 6 số đã gửi tới {email || "email đăng ký"}</p>
        {errorMessage && <AuthAlert title={errorMessage.split(". ")[0].replace(/\.$/, "") + "."}>{errorMessage.includes(". ") ? errorMessage.slice(errorMessage.indexOf(". ") + 2) : "Nhập lại."}</AuthAlert>}
        {successMessage && <AuthAlert tone="success" title={successMessage} />}
        <fieldset className="auth-v9__otp" aria-label="Mã OTP gồm 6 chữ số" aria-describedby="otp-hint">
          {digits.map((digit, index) => <input key={index} ref={element => { boxes.current[index] = element; }} id={index === 0 ? "otp_code" : undefined}
            inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={6} aria-label={`Số thứ ${index + 1}`} value={digit}
            autoFocus={index === 0} onChange={event => setDigit(index, event.target.value)}
            onKeyDown={event => { if (event.key === "Backspace" && !digit && index > 0) { boxes.current[index - 1]?.focus(); setOtpCode(otpCode.slice(0, index - 1)); } }} />)}
        </fieldset>
        <p id="otp-hint" className="auth-v9__hint">Mã có hiệu lực 10 phút, tối đa 5 lần nhập.</p>
        <button type="submit" className="auth-v9__primary" disabled={isVerifying || otpCode.length !== 6}>{isVerifying ? "Đang xác nhận…" : "Xác nhận"}</button>
        <div className="auth-v9__links">
          <button type="button" className="auth-v9__link-button" onClick={handleResend} disabled={isResending}>{isResending ? "Đang gửi lại…" : "Gửi lại mã"}</button>
          <button type="button" className="auth-v9__link-button" onClick={handleEditEmail}>Đổi email đăng ký</button>
        </div>
      </form>
    </AuthShell>
  );
}
