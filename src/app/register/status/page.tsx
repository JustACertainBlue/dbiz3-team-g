"use client";

// REG116 (mockup v3 png/18a): popup "Đã gửi hồ sơ đăng ký thành công" over the application summary.
// Reads the same sessionStorage keys as before; the popup kind comes from the stored account status.
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { SubmittedPopup } from "../../auth-v3/RegistrationPopups";
import { formatViDateTime, registrationPopupKind } from "../../auth-v3/rules";
import "../../auth-v3/auth-v3.css";

export default function StatusPage() {
  const [accountStatus, setAccountStatus] = useState<string>("Pending Approval");
  const [agencyAccountId, setAgencyAccountId] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [company, setCompany] = useState<string>("");
  const [submittedAt, setSubmittedAt] = useState<string>("");
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setAccountStatus(sessionStorage.getItem("account_status") || "Pending Approval");
      setAgencyAccountId(sessionStorage.getItem("agency_account_id") || "");
      setEmail(sessionStorage.getItem("registration_email") || "");
      setCompany(sessionStorage.getItem("registration_company") || "");
      setSubmittedAt(sessionStorage.getItem("registration_submitted_at") || "");

      // Task T027 requirement: Clears registration_request_id from sessionStorage
      sessionStorage.removeItem("registration_request_id");
    }
  }, []);

  const sentAt = formatViDateTime(submittedAt);
  return (
    <main className="av3-center">
      <section className="av3-card av3-card--status">
        <h1 className="av3-h1 av3-h1--card">Hồ sơ đăng ký{company ? <> của {company}</> : null}</h1>
        <div className="av3-banner av3-banner--warn">
          <strong>Đang chờ Sở Du lịch Hà Nội duyệt</strong>
          <p>Bạn sẽ nhận email khi có kết quả. Trong lúc chờ, bạn chưa đăng nhập để đặt trải nghiệm được. Email chỉ được gửi khi dịch vụ gửi email đã được cấu hình.</p>
        </div>
        <h2 className="av3-sub">Lịch sử hồ sơ</h2>
        <ul className="av3-history">
          <li>Đã xác minh email</li>
          <li>Gửi hồ sơ đăng ký{sentAt ? ` · ${sentAt}` : ""}</li>
        </ul>
        {agencyAccountId && <p className="av3-caption">Mã tài khoản Agency: {agencyAccountId}</p>}
        <div className="av3-actions">
          <Link href="/login" className="av3-btn av3-btn--primary">Đăng nhập</Link>
          <Link href="/explore" className="av3-btn av3-btn--secondary">Về trang khám phá</Link>
        </div>
      </section>
      <SubmittedPopup open={open && registrationPopupKind(accountStatus) === "submitted"} onClose={() => setOpen(false)}
        info={{ company, email, sentAt }} />
    </main>
  );
}
