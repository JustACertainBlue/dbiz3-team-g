"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Screen ADM117 — Create Account (HDT creates UBND)
// Functions: F-AUTH-19 (FR-019), F-AUTH-16 (FR-016)
export default function CreateAccountPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedVillageId, setAssignedVillageId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setGlobalError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/admin/accounts/ubnd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          assigned_village_id: assignedVillageId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.field_errors && Array.isArray(data.field_errors)) {
          const errs: Record<string, string> = {};
          for (const fe of data.field_errors) {
            errs[fe.field] = fe.message;
          }
          setFieldErrors(errs);
        }
        setGlobalError(data.error_message ?? "An error occurred");
        setSubmitting(false);
        return;
      }

      setSuccess(data.success_notification ?? "Account created successfully.");
      // Navigate to ADM095 after success
      setTimeout(() => router.push("/admin/users"), 1200);
    } catch {
      setGlobalError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  function handleCancel() {
    router.push("/admin/users");
  }

  return (
    <main className="auth-container">
      <div className="auth-card" style={{ maxWidth: "560px" }}>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle" style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
          Create an UBND administrator account and assign a village.
        </p>

        {globalError && (
          <div className="form-error" role="alert" style={{ marginBottom: "1rem" }}>
            {globalError}
          </div>
        )}
        {success && (
          <div
            style={{
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              background: "rgba(16,185,129,0.1)",
              color: "#10b981",
              marginBottom: "1rem",
              fontSize: "0.9rem",
            }}
            role="status"
          >
            {success}
          </div>
        )}

        <form onSubmit={handleCreate} noValidate>
          {/* Name — FR-019 */}
          <div className="form-group">
            <label htmlFor="create-account-name" className="form-label">
              Name
            </label>
            <input
              id="create-account-name"
              type="text"
              className={`form-input${fieldErrors.name ? " input-error" : ""}`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              autoComplete="name"
            />
            {fieldErrors.name && (
              <span className="field-error">{fieldErrors.name}</span>
            )}
          </div>

          {/* Email — FR-019 */}
          <div className="form-group">
            <label htmlFor="create-account-email" className="form-label">
              Email
            </label>
            <input
              id="create-account-email"
              type="email"
              className={`form-input${fieldErrors.email ? " input-error" : ""}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              autoComplete="email"
            />
            {fieldErrors.email && (
              <span className="field-error">{fieldErrors.email}</span>
            )}
          </div>

          {/* Phone — FR-019 */}
          <div className="form-group">
            <label htmlFor="create-account-phone" className="form-label">
              Phone
            </label>
            <input
              id="create-account-phone"
              type="tel"
              className={`form-input${fieldErrors.phone ? " input-error" : ""}`}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={submitting}
              autoComplete="tel"
            />
            {fieldErrors.phone && (
              <span className="field-error">{fieldErrors.phone}</span>
            )}
          </div>

          {/* Assigned village id — FR-019 */}
          <div className="form-group">
            <label htmlFor="create-account-village" className="form-label">
              Assigned village id
            </label>
            <input
              id="create-account-village"
              type="text"
              className={`form-input${fieldErrors.assigned_village_id ? " input-error" : ""}`}
              value={assignedVillageId}
              onChange={(e) => setAssignedVillageId(e.target.value)}
              disabled={submitting}
              placeholder="UUID of the village"
            />
            {fieldErrors.assigned_village_id && (
              <span className="field-error">{fieldErrors.assigned_village_id}</span>
            )}
          </div>

          {/* System context fields — not editable (ADM117 §3, elements 6 and 7) */}
          <div className="form-group">
            <label className="form-label">Role</label>
            <input
              type="text"
              className="form-input"
              value="ADMIN"
              readOnly
              aria-readonly="true"
              style={{ background: "var(--input-bg)", opacity: 0.7, cursor: "not-allowed" }}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Admin type</label>
            <input
              type="text"
              className="form-input"
              value="UBND"
              readOnly
              aria-readonly="true"
              style={{ background: "var(--input-bg)", opacity: 0.7, cursor: "not-allowed" }}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            {/* Create button — ADM117 §5 element 12 */}
            <button
              id="create-account-submit"
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ flex: 1 }}
            >
              {submitting ? "Creating…" : "Create"}
            </button>
            {/* Cancel button — ADM117 §5 element 13 */}
            <button
              id="create-account-cancel"
              type="button"
              className="btn-secondary"
              onClick={handleCancel}
              disabled={submitting}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
