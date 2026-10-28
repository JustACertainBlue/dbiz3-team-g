"use client";

import React from "react";
import Link from "next/link";

export default function ForgotPasswordSentPage() {
  return (
    <div style={{ maxWidth: "480px", margin: "3rem auto", padding: "0 1rem" }}>
      <div
        className="card"
        style={{
          padding: "2rem",
          backgroundColor: "var(--card-bg, #ffffff)",
          borderRadius: "var(--radius, 8px)",
          boxShadow: "var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "700",
            marginBottom: "1.25rem",
            color: "var(--text-main, #0f172a)",
          }}
        >
          Check Your Email
        </h1>

        <div
          style={{
            padding: "1rem",
            backgroundColor: "var(--success-bg, #f0fdf4)",
            border: "1px solid var(--success-border, #bbf7d0)",
            borderRadius: "var(--radius, 6px)",
            color: "#166534",
            fontSize: "0.95rem",
            lineHeight: "1.6",
            marginBottom: "1.75rem",
            textAlign: "left",
          }}
        >
          We&apos;ve sent a password reset link to your email. Please check your inbox and follow the link within 15 minutes. Didn&apos;t receive it? Check spam or request a new link.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          <Link
            href="/login"
            style={{
              display: "block",
              width: "100%",
              padding: "0.75rem 1rem",
              backgroundColor: "var(--primary, #2563eb)",
              color: "#ffffff",
              textDecoration: "none",
              borderRadius: "var(--radius, 6px)",
              fontSize: "1rem",
              fontWeight: "600",
            }}
          >
            Back to login
          </Link>
          <Link
            href="/forgot-password"
            style={{
              display: "block",
              width: "100%",
              padding: "0.75rem 1rem",
              backgroundColor: "transparent",
              color: "var(--primary, #2563eb)",
              border: "1px solid var(--border-color, #cbd5e1)",
              textDecoration: "none",
              borderRadius: "var(--radius, 6px)",
              fontSize: "0.95rem",
              fontWeight: "500",
            }}
          >
            Resend
          </Link>
        </div>
      </div>
    </div>
  );
}
