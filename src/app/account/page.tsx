"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AccountPage() {
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
          confirm_new_password: confirmNewPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error_message || "Failed to change password");
        setLoading(false);
        return;
      }

      setSuccessMessage(data.success_message || "Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setLoading(false);

      if (data.redirect_url) {
        setTimeout(() => {
          router.push(data.redirect_url);
        }, 1500);
      }
    } catch (err) {
      setErrorMessage("An unexpected network error occurred.");
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "2rem auto",
        padding: "2rem",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          marginBottom: "1.5rem",
          color: "#111827",
        }}
      >
        My Account
      </h1>

      <section
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          padding: "1.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            marginBottom: "0.5rem",
            color: "#1f2937",
          }}
        >
          Change Password
        </h2>

        <p
          style={{
            fontSize: "0.875rem",
            color: "#4b5563",
            marginBottom: "1.25rem",
          }}
        >
          Use at least 8 characters with a mix of uppercase, lowercase, numbers, and symbols. Never share your password.
        </p>

        {errorMessage && (
          <div
            style={{
              padding: "0.75rem",
              marginBottom: "1rem",
              backgroundColor: "#fef2f2",
              border: "1px solid #f87171",
              borderRadius: "4px",
              color: "#b91c1c",
              fontSize: "0.875rem",
            }}
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            style={{
              padding: "0.75rem",
              marginBottom: "1rem",
              backgroundColor: "#f0fdf4",
              border: "1px solid #86efac",
              borderRadius: "4px",
              color: "#166534",
              fontSize: "0.875rem",
            }}
          >
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="current_password"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.25rem",
              }}
            >
              Current password
            </label>
            <input
              id="current_password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
                fontSize: "0.875rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label
              htmlFor="new_password"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.25rem",
              }}
            >
              New password
            </label>
            <input
              id="new_password"
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
                fontSize: "0.875rem",
              }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              htmlFor="confirm_new_password"
              style={{
                display: "block",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#374151",
                marginBottom: "0.25rem",
              }}
            >
              Confirm new password
            </label>
            <input
              id="confirm_new_password"
              type="password"
              required
              value={confirmNewPassword}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
                fontSize: "0.875rem",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: "#2563eb",
              border: "none",
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Changing Password..." : "Change Password"}
          </button>
        </form>
      </section>
    </div>
  );
}
