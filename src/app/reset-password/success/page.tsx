"use client";

import React from "react";
import Link from "next/link";

export default function ResetPasswordSuccessPage() {
  return (
    <div style={{ maxWidth: "460px", margin: "3rem auto", padding: "0 1rem" }}>
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
          Password Updated
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
          }}
        >
          Your password has been updated successfully. You can now log in with your new password.
        </div>

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
          Sign in
        </Link>
      </div>
    </div>
  );
}
