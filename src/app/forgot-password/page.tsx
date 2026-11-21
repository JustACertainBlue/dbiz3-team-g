"use client";

// Screen 16 step 1 (png/16). Same request as before: POST /api/auth/forgot-password, then /forgot-password/sent.
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "../auth-v3/auth-v3.css";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Hãy nhập email đã đăng ký.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error_message || "Không thể gửi đường dẫn đặt lại.");
        return;
      }

      try { sessionStorage.setItem("forgot_password_email", email.trim()); } catch { /* the sent page then shows a generic line */ }
      router.push("/forgot-password/sent");
    } catch (err) {
      setErrorMessage("Lỗi mạng. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="av3-center">
      <section className="av3-card av3-card--narrow">
        <h1 className="av3-h1 av3-h1--card">Quên mật khẩu?</h1>
        <p className="av3-lead">Nhập email bạn dùng để đăng nhập. Chúng tôi sẽ gửi đường dẫn đặt lại mật khẩu.</p>

        {errorMessage && <div role="alert" className="av3-alert av3-alert--danger"><strong>{errorMessage}</strong></div>}

        <form onSubmit={handleSubmit} noValidate className="av3-form">
          <div className="av3-field">
            <label htmlFor="email">Email đã đăng ký</label>
            <input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com" autoComplete="email" disabled={loading} />
          </div>
          <button type="submit" disabled={loading} className="av3-btn av3-btn--primary">{loading ? "Đang gửi…" : "Gửi đường dẫn đặt lại"}</button>
        </form>

        <Link href="/login" className="av3-link av3-card__back">‹ Quay lại đăng nhập</Link>
      </section>
    </main>
  );
}
