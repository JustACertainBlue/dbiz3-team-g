"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface PageProps {
  params: Promise<{ userId: string }>;
}

interface AccountDetails {
  user_id: string;
  email: string;
  name: string;
  role: string;
  admin_type?: string;
  status: string;
  last_login?: string;
  created_date: string;
}

// Screen ADM118 — Account Information & Access Actions
// Functions: F-AUTH-22 (FR-022), F-AUTH-16 (FR-016)
export default function AccountActionsPage({ params }: PageProps) {
  const { userId } = use(params);
  const router = useRouter();

  const [account, setAccount] = useState<AccountDetails | null>(null);
  const [adminRole, setAdminRole] = useState("ADMIN");
  const [adminType, setAdminType] = useState("HDT");

  const [actionType, setActionType] = useState<"disable" | "enable" | "reset_password">("disable");
  const [reason, setReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      // Load session info
      try {
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          setAdminRole(sessionData.role || "ADMIN");
          setAdminType(sessionData.admin_type || "HDT");
        }
      } catch {
        // fallback
      }

      // Load account details
      try {
        const res = await fetch(`/api/admin/accounts/${userId}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setError(errData.error_message || "Failed to load account details");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setAccount(data.account);
        // Set default action type appropriately
        if (data.account.status === "Disabled") {
          setActionType("enable");
        } else {
          setActionType("disable");
        }
      } catch {
        setError("Network error loading account details");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [userId]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`/api/admin/accounts/${userId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action_type: actionType,
          reason: actionType === "disable" ? reason : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error_message || "Failed to perform account action");
        setSubmitting(false);
        return;
      }

      setSuccess("Account action executed successfully.");
      setTimeout(() => router.push("/admin/users"), 1200);
    } catch {
      setError("Network error while submitting action.");
      setSubmitting(false);
    }
  }

  function handleCancel() {
    router.push("/admin/users");
  }

  if (loading) {
    return (
      <main className="auth-container">
        <div className="auth-card" style={{ maxWidth: "560px" }}>
          <h1 className="auth-title">Account Information & Access Actions</h1>
          <p style={{ color: "var(--text-secondary)" }}>Loading account details…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-container">
      <div className="auth-card" style={{ maxWidth: "560px" }}>
        {/* Screen title — ADM118 element 1 */}
        <h1 className="auth-title" style={{ fontSize: "1.5rem" }}>
          Account Information & Access Actions
        </h1>
        <p className="auth-subtitle" style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
          Manage access permissions and credentials for this account.
        </p>

        {error && (
          <div className="form-error" role="alert" style={{ marginBottom: "1rem" }}>
            {error}
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

        {account && (
          /* Selected account identity and status — ADM118 element 7 */
          <div
            style={{
              background: "var(--card-bg, #f9fafb)",
              border: "1px solid var(--border-color, #e5e7eb)",
              borderRadius: "0.5rem",
              padding: "1rem",
              marginBottom: "1.5rem",
              fontSize: "0.9rem",
            }}
          >
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Name:</strong> {account.name}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Email:</strong> {account.email}
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <strong>Role:</strong> {account.role}
            </div>
            <div>
              <strong>Current Status:</strong>{" "}
              <span
                style={{
                  fontWeight: 600,
                  color:
                    account.status === "Active" || account.status === "Approved"
                      ? "#059669"
                      : account.status === "Disabled"
                      ? "#dc2626"
                      : "#d97706",
                }}
              >
                {account.status}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSave}>
          {/* User ID — ADM118 element 2 */}
          <div className="form-group">
            <label className="form-label">User id</label>
            <input
              type="text"
              className="form-input"
              value={userId}
              readOnly
              aria-readonly="true"
              style={{ background: "var(--input-bg)", opacity: 0.7, cursor: "not-allowed" }}
            />
          </div>

          {/* Action type — ADM118 element 3 */}
          <div className="form-group">
            <label htmlFor="select-action-type" className="form-label">
              Action type
            </label>
            <select
              id="select-action-type"
              className="form-input"
              value={actionType}
              onChange={(e) => setActionType(e.target.value as any)}
              disabled={submitting}
            >
              <option value="disable">Disable account</option>
              <option value="enable">Enable account</option>
              <option value="reset_password">Reset password</option>
            </select>
          </div>

          {/* Reason — ADM118 element 4 (visible when actionType is disable) */}
          {actionType === "disable" && (
            <div className="form-group">
              <label htmlFor="input-disable-reason" className="form-label">
                Reason
              </label>
              <textarea
                id="input-disable-reason"
                className="form-input"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
                placeholder="Reason for disabling this account…"
              />
            </div>
          )}

          {/* Admin role — ADM118 element 5 */}
          <div className="form-group">
            <label className="form-label">Admin role</label>
            <input
              type="text"
              className="form-input"
              value={adminRole}
              readOnly
              aria-readonly="true"
              style={{ background: "var(--input-bg)", opacity: 0.7, cursor: "not-allowed" }}
            />
          </div>

          {/* Admin type — ADM118 element 6 */}
          <div className="form-group">
            <label className="form-label">Admin type</label>
            <input
              type="text"
              className="form-input"
              value={adminType}
              readOnly
              aria-readonly="true"
              style={{ background: "var(--input-bg)", opacity: 0.7, cursor: "not-allowed" }}
            />
          </div>

          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            {/* Save account action button — ADM118 element 8 */}
            <button
              id="btn-save-account-action"
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ flex: 1 }}
            >
              {submitting ? "Saving…" : "Save account action"}
            </button>
            {/* Cancel button — ADM118 element 9 */}
            <button
              id="btn-cancel-account-action"
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
