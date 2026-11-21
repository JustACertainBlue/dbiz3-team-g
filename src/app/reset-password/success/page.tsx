"use client";

// Screen 16 step 4 (png/16).
import React from "react";
import "../../auth-v3/auth-v3.css";

export default function ResetPasswordSuccessPage() {
  return (
    <main className="av3-center">
      <section className="av3-card av3-card--narrow av3-center-text">
        <span className="av3-badge-icon av3-badge-icon--solid" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        </span>
        <h1 className="av3-h1 av3-h1--card">Đã đổi mật khẩu</h1>
        <p className="av3-lead">Mật khẩu của bạn đã được cập nhật. Giờ bạn có thể đăng nhập bằng mật khẩu mới.</p>
        <a href="/login" className="av3-btn av3-btn--primary">Đến trang đăng nhập</a>
      </section>
    </main>
  );
}
