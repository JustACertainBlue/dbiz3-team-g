"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Email is required");
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
        setErrorMessage(data.error_message || "Unable to send reset link");
        return;
      }

      router.push("/forgot-password/sent");
    } catch (err) {
      setErrorMessage("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "440px", margin: "3rem auto", padding: "0 1rem" }}>
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
          Enter Registered Email
        </h1>

        <p style={{ color: "var(--text-muted, #64748b)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
          Enter your registered email address to receive a secure password recovery link.
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
          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="email"
              style={{
                display: "block",
                marginBottom: "0.375rem",
                fontWeight: "600",
                fontSize: "0.875rem",
                color: "var(--text-main, #0f172a)",
              }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@example.com"
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
            {loading ? "Sending..." : "Send reset link"}
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
