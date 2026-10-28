"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [emptyFieldErrors, setEmptyFieldErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setEmptyFieldErrors([]);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error_message || "Login failed");
        if (data.empty_field_errors) {
          setEmptyFieldErrors(data.empty_field_errors);
        }
        return;
      }

      if (data.redirect_url) {
        router.push(data.redirect_url);
      }
    } catch (err) {
      setErrorMessage("Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" style={{ maxWidth: "440px", margin: "3rem auto", padding: "0 1rem" }}>
      <div className="card" style={{ padding: "2rem", backgroundColor: "var(--card-bg, #ffffff)", borderRadius: "var(--radius, 8px)", boxShadow: "var(--shadow-lg, 0 10px 15px -3px rgba(0,0,0,0.1))" }}>
        <h1 style={{ fontSize: "1.75rem", fontWeight: "700", marginBottom: "1.5rem", color: "var(--text-main, #0f172a)" }}>
          Login
        </h1>

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
                border: emptyFieldErrors.includes("email")
                  ? "1px solid var(--danger, #dc2626)"
                  : "1px solid var(--border-color, #cbd5e1)",
                outline: "none",
                backgroundColor: "#fff",
              }}
            />
            {emptyFieldErrors.includes("email") && (
              <span style={{ color: "var(--danger, #dc2626)", fontSize: "0.8rem", marginTop: "0.25rem", display: "block" }}>
                Email is required
              </span>
            )}
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="password"
              style={{
                display: "block",
                marginBottom: "0.375rem",
                fontWeight: "600",
                fontSize: "0.875rem",
                color: "var(--text-main, #0f172a)",
              }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              style={{
                width: "100%",
                padding: "0.625rem 0.75rem",
                fontSize: "0.95rem",
                borderRadius: "var(--radius, 6px)",
                border: emptyFieldErrors.includes("password")
                  ? "1px solid var(--danger, #dc2626)"
                  : "1px solid var(--border-color, #cbd5e1)",
                outline: "none",
                backgroundColor: "#fff",
              }}
            />
            {emptyFieldErrors.includes("password") && (
              <span style={{ color: "var(--danger, #dc2626)", fontSize: "0.8rem", marginTop: "0.25rem", display: "block" }}>
                Password is required
              </span>
            )}
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
              transition: "background-color 0.2s",
            }}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.875rem" }}>
          <Link
            href="/forgot-password"
            style={{ color: "var(--primary, #2563eb)", textDecoration: "none", fontWeight: "500" }}
          >
            Forgot password
          </Link>
          <Link
            href="/register"
            style={{ color: "var(--primary, #2563eb)", textDecoration: "none", fontWeight: "500" }}
          >
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
