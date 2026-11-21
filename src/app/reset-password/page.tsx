"use client";

// Screen 16 step 3 (png/16). Same request as before: POST /api/auth/reset-password with the token from the link.
import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { passwordChecks } from "../auth-v3/rules";
import "../auth-v3/auth-v3.css";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const checks = passwordChecks(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!token) {
      setErrorMessage("Đường dẫn không hợp lệ hoặc đã hết hạn.");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setErrorMessage("Mật khẩu chưa đáp ứng yêu cầu.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Hai mật khẩu chưa khớp.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error_message || "Không thể đặt lại mật khẩu.");
        return;
      }

      router.push("/reset-password/success");
    } catch (err) {
      setErrorMessage("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="av3-center">
      <section className="av3-card av3-card--narrow">
        <h1 className="av3-h1 av3-h1--card">Đặt mật khẩu mới</h1>

        {errorMessage && <div role="alert" className="av3-alert av3-alert--danger"><strong>{errorMessage}</strong></div>}

        <form onSubmit={handleSubmit} noValidate className="av3-form">
          <div className="av3-field">
            <label htmlFor="new_password">Mật khẩu mới</label>
            <input id="new_password" name="new_password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password" disabled={loading} aria-describedby="reset-rules" />
          </div>
          <ul id="reset-rules" className="av3-rules" aria-label="Yêu cầu mật khẩu">
            {checks.map(check => <li key={check.id} className={check.ok ? "av3-rules__ok" : ""}>
              <span aria-hidden="true">{check.ok ? "✓" : "○"}</span>{check.label}<span className="av3-sr">{check.ok ? " (đã đạt)" : " (chưa đạt)"}</span>
            </li>)}
          </ul>
          <div className="av3-field">
            <label htmlFor="confirm_password">Nhập lại mật khẩu mới</label>
            <input id="confirm_password" name="confirm_password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password" disabled={loading} />
          </div>
          <button type="submit" disabled={loading} className="av3-btn av3-btn--primary">{loading ? "Đang cập nhật…" : "Cập nhật mật khẩu"}</button>
        </form>

        <Link href="/login" className="av3-link av3-card__back">‹ Quay lại đăng nhập</Link>
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<main className="av3-center"><p>Đang tải…</p></main>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
