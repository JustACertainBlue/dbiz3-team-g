"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!token) {
      setErrorMessage("Token invalid");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setErrorMessage("Password does not meet requirements");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match");
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
        setErrorMessage(data.error_message || "Password reset failed");
        return;
      }

      router.push("/reset-password/success");
    } catch (err) {
      setErrorMessage("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "460px", margin: "3rem auto", padding: "0 1rem" }}>
      <div
        className="card"
        style={{
          padding: "2rem",
          backgroundColor: "var(--card-bg, #ffffff)",
          borderRadius: "var(--radius, 8px)",
          boxShadow: "var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))",
        }}
      >
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: "700",
            marginBottom: "1rem",
            color: "var(--text-main, #0f172a)",
          }}
        >
          Set New Password
        </h1>

        <p style={{ color: "var(--text-muted, #64748b)", fontSize: "0.85rem", marginBottom: "1.25rem" }}>
          Must be 8–64 characters and contain at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character.
        </p>

        {errorMessage && (
          <div
            role="alert"
            style={{
              padding: "0.75rem 1rem",
              marginBottom: "1.25rem",
              backgroundColor: "var(--danger-bg, #fef2f2)",
              border: "1px solid var(--danger-border, #fecaca)",
              borderRadius: "var(--radius, 6px)",
              color: "var(--danger, #dc2626)",
              fontSize: "0.9rem",
            }}
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ marginBottom: "1.25rem" }}>
            <label
              htmlFor="new_password"
              style={{
                display: "block",
                marginBottom: "0.375rem",
                fontWeight: "600",
                fontSize: "0.875rem",
                color: "var(--text-main, #0f172a)",
              }}
            >
              New password
            </label>
            <input
              id="new_password"
              name="new_password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.625rem 0.75rem",
                fontSize: "0.95rem",
                borderRadius: "var(--radius, 6px)",
                border: "1px solid var(--border-color, #cbd5e1)",
                outline: "none",
                backgroundColor: "#fff",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="confirm_password"
              style={{
                display: "block",
                marginBottom: "0.375rem",
                fontWeight: "600",
                fontSize: "0.875rem",
                color: "var(--text-main, #0f172a)",
              }}
            >
              Confirm password
            </label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.625rem 0.75rem",
                fontSize: "0.95rem",
                borderRadius: "var(--radius, 6px)",
                border: "1px solid var(--border-color, #cbd5e1)",
                outline: "none",
                backgroundColor: "#fff",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              backgroundColor: "var(--primary, #2563eb)",
              color: "#ffffff",
              border: "none",
              borderRadius: "var(--radius, 6px)",
              fontSize: "1rem",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Resetting..." : "Reset password"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <Link
            href="/login"
            style={{ color: "var(--primary, #2563eb)", textDecoration: "none", fontSize: "0.875rem", fontWeight: "500" }}
          >
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem", textAlign: "center" }}>Loading...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
