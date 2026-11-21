"use client";

import React, { useState, useEffect, useRef } from "react";
import { otpCountdown } from "../../auth-v3/rules";
import { useHydrated } from "../../auth-v3/useHydrated";
import "../../auth-v3/auth-v3.css";
import { useRouter } from "next/navigation";

export default function OtpPage() {
  const router = useRouter();
  const hydrated = useHydrated();

  const [registrationRequestId, setRegistrationRequestId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [otpCode, setOtpCode] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  // png/18 "Mã hết hạn sau 04:32": counts down the 10 minutes of the code from the send or resend time (display only).
  const [secondsLeft, setSecondsLeft] = useState(600);
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
      const sent = sessionStorage.getItem("registration_submitted_at") || "";
      const elapsed = sent ? Math.floor((Date.now() - Date.parse(sent)) / 1000) : 0;
      setSecondsLeft(Math.max(0, 600 - (Number.isFinite(elapsed) ? elapsed : 0)));
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setSecondsLeft((value) => Math.max(0, value - 1)), 1000);
    return () => clearInterval(timer);
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
        setSecondsLeft(600);
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

  // REG115 (mockup v3 png/18): code card on the left, application summary on the right. Verification, resend and limits are unchanged.
  const split = errorMessage ? errorMessage.split(". ") : [];
  return (
    <main className="av3-center">
      <section className="av3-card">
        <h1 className="av3-h1 av3-h1--card">Nhập mã xác minh</h1>
        <form className="av3-form" method="post" onSubmit={handleVerify}>
          <p className="av3-lead">Chúng tôi đã gửi mã 6 số đến <strong>{email || "email đăng ký"}</strong>.</p>
          {errorMessage && <div className="av3-alert av3-alert--danger" role="alert"><strong>{split[0].replace(/\.$/, "") + "."}</strong>{split.length > 1 && <p>{errorMessage.slice(errorMessage.indexOf(". ") + 2)}</p>}</div>}
          {successMessage && <div className="av3-alert av3-alert--success" role="status"><strong>{successMessage}</strong></div>}
          <fieldset className="av3-otp" aria-label="Mã OTP gồm 6 chữ số" aria-describedby="otp-hint">
            {digits.map((digit, index) => <input key={index} ref={element => { boxes.current[index] = element; }} id={index === 0 ? "otp_code" : undefined}
              inputMode="numeric" autoComplete={index === 0 ? "one-time-code" : "off"} maxLength={6} aria-label={`Số thứ ${index + 1}`} value={digit}
              autoFocus={index === 0} onChange={event => setDigit(index, event.target.value)}
              onKeyDown={event => { if (event.key === "Backspace" && !digit && index > 0) { boxes.current[index - 1]?.focus(); setOtpCode(otpCode.slice(0, index - 1)); } }} />)}
          </fieldset>
          <p id="otp-hint" className="av3-lead av3-lead--sm">
            {secondsLeft > 0 ? <>Mã hết hạn sau <strong>{otpCountdown(secondsLeft)}</strong>. </> : <>Mã đã hết hạn. </>}
            Chưa nhận được? <button type="button" className="av3-link av3-link-button" onClick={handleResend} disabled={isResending}>{isResending ? "Đang gửi lại…" : "Gửi lại mã"}</button>
            <br />Tối đa 5 lần nhập.
          </p>
          <button type="submit" className="av3-btn av3-btn--primary" disabled={!hydrated || isVerifying || otpCode.length !== 6}>{isVerifying ? "Đang xác nhận…" : "Xác minh"}</button>
          <button type="button" className="av3-link av3-link-button av3-card__back" onClick={handleEditEmail}>‹ Sửa email đăng ký</button>
        </form>
      </section>
    </main>
  );
}
