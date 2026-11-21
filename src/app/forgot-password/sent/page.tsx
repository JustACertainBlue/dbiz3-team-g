"use client";

// Screen 16 step 2 (png/16). The email is read from sessionStorage, written by the previous page; no new request here.
import React, { useEffect, useState } from "react";
import Link from "next/link";
import "../../auth-v3/auth-v3.css";

export default function ForgotPasswordSentPage() {
  const [email, setEmail] = useState("");
  useEffect(() => {
    try { setEmail(sessionStorage.getItem("forgot_password_email") || ""); } catch { /* generic line below */ }
  }, []);

  return (
    <main className="av3-center">
      <section className="av3-card av3-card--narrow">
        <span className="av3-badge-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 8 8 5.5L20 8" /></svg>
        </span>
        <h1 className="av3-h1 av3-h1--card av3-center-text">Kiểm tra hộp thư của bạn</h1>
        <p className="av3-lead">
          {email ? <>Chúng tôi đã gửi đường dẫn đặt lại mật khẩu đến <strong>{email}</strong>. </> : <>Nếu email đã đăng ký, đường dẫn đặt lại mật khẩu đã được gửi. </>}
          Đường dẫn có hiệu lực trong <strong>15 phút</strong>.
        </p>
        <p className="av3-lead">Chưa thấy thư? Xem trong mục Thư rác hoặc gửi lại.</p>
        <p className="av3-caption">Chế độ thử nghiệm cục bộ không gửi email thật.</p>
        <Link href="/forgot-password" className="av3-btn av3-btn--secondary">Gửi lại đường dẫn</Link>
        <Link href="/login" className="av3-link av3-card__back">‹ Quay lại đăng nhập</Link>
      </section>
    </main>
  );
}
