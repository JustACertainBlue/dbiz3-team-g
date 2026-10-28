"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Screen ADM117 — Create Account (HDT creates UBND / UBND creates Local Provider)
// Functions: F-AUTH-19 (FR-019), F-AUTH-20 (FR-020), F-AUTH-16 (FR-016)
export default function CreateAccountPage() {
  const router = useRouter();

  const [actorAdminType, setActorAdminType] = useState<"HDT" | "UBND" | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // HDT Form fields (F-AUTH-19)
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [assignedVillageId, setAssignedVillageId] = useState("");

  // UBND Form fields (F-AUTH-20)
  const [providerName, setProviderName] = useState("");
  const [address, setAddress] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [contactPhoneNumber, setContactPhoneNumber] = useState("");
  const [providerEmail, setProviderEmail] = useState("");
  const [assignedVillageDisplay, setAssignedVillageDisplay] = useState("Assigned from session");

  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadSession() {
      try {
        const res = await fetch("/api/auth/session");
        if (res.ok) {
          const data = await res.json();
          if (data.admin_type === "UBND") {
            setActorAdminType("UBND");
          } else {
            setActorAdminType("HDT");
          }
        } else {
          setActorAdminType("HDT");
        }
      } catch {
        setActorAdminType("HDT");
      } finally {
        setLoadingSession(false);
      }
    }
    loadSession();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setGlobalError(null);
    setSuccess(null);

    const isUbnd = actorAdminType === "UBND";
    const endpoint = isUbnd ? "/api/admin/accounts/provider" : "/api/admin/accounts/ubnd";
    const payload = isUbnd
      ? {
          provider_name: providerName,
          address,
          contact: {
            contact_person_name: contactPersonName,
            phone_number: contactPhoneNumber,
          },
          email: providerEmail,
        }
      : {
          name,
          email,
          phone,
          assigned_village_id: assignedVillageId,
        };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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
      setTimeout(() => router.push("/admin/users"), 1200);
    } catch {
      setGlobalError("Network error. Please try again.");
      setSubmitting(false);
    }
  }

  function handleCancel() {
    router.push("/admin/users");
  }

  if (loadingSession) {
    return (
      <main className="auth-container">
        <div className="auth-card" style={{ maxWidth: "560px" }}>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle" style={{ color: "var(--text-secondary)" }}>
            Loading session context…
          </p>
        </div>
      </main>
    );
  }

  const isUbnd = actorAdminType === "UBND";

  return (
    <main className="auth-container">
      <div className="auth-card" style={{ maxWidth: "560px" }}>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle" style={{ marginBottom: "1.5rem", color: "var(--text-secondary)" }}>
          {isUbnd
            ? "Create a Local Provider account within your assigned village."
            : "Create an UBND administrator account and assign a village."}
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
          {isUbnd ? (
            /* --- UBND Section (ADM117 elements 8 to 11 / FR-020) --- */
            <>
              {/* Provider name — ADM117 element 8 */}
              <div className="form-group">
                <label htmlFor="create-provider-name" className="form-label">
                  Provider name
                </label>
                <input
                  id="create-provider-name"
                  type="text"
                  className={`form-input${fieldErrors.provider_name ? " input-error" : ""}`}
                  value={providerName}
                  onChange={(e) => setProviderName(e.target.value)}
                  disabled={submitting}
                />
                {fieldErrors.provider_name && (
                  <span className="field-error">{fieldErrors.provider_name}</span>
                )}
              </div>

              {/* Address — ADM117 element 9 */}
              <div className="form-group">
                <label htmlFor="create-provider-address" className="form-label">
                  Address
                </label>
                <input
                  id="create-provider-address"
                  type="text"
                  className={`form-input${fieldErrors.address ? " input-error" : ""}`}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={submitting}
                />
                {fieldErrors.address && (
                  <span className="field-error">{fieldErrors.address}</span>
                )}
              </div>

              {/* Contact — ADM117 element 10 */}
              <div className="form-group">
                <label htmlFor="create-provider-contact-name" className="form-label">
                  Contact person name
                </label>
                <input
                  id="create-provider-contact-name"
                  type="text"
                  className={`form-input${
                    fieldErrors["contact.contact_person_name"] || fieldErrors.contact
                      ? " input-error"
                      : ""
                  }`}
                  value={contactPersonName}
                  onChange={(e) => setContactPersonName(e.target.value)}
                  disabled={submitting}
                />
                {fieldErrors["contact.contact_person_name"] && (
                  <span className="field-error">
                    {fieldErrors["contact.contact_person_name"]}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="create-provider-phone" className="form-label">
                  Phone number
                </label>
                <input
                  id="create-provider-phone"
                  type="tel"
                  className={`form-input${
                    fieldErrors["contact.phone_number"] ? " input-error" : ""
                  }`}
                  value={contactPhoneNumber}
                  onChange={(e) => setContactPhoneNumber(e.target.value)}
                  disabled={submitting}
                />
                {fieldErrors["contact.phone_number"] && (
                  <span className="field-error">
                    {fieldErrors["contact.phone_number"]}
                  </span>
                )}
              </div>

              {/* Email — FR-020 */}
              <div className="form-group">
                <label htmlFor="create-provider-email" className="form-label">
                  Email
                </label>
                <input
                  id="create-provider-email"
                  type="email"
                  className={`form-input${fieldErrors.email ? " input-error" : ""}`}
                  value={providerEmail}
                  onChange={(e) => setProviderEmail(e.target.value)}
                  disabled={submitting}
                  autoComplete="email"
                />
                {fieldErrors.email && (
                  <span className="field-error">{fieldErrors.email}</span>
                )}
              </div>

              {/* Village id — ADM117 element 11 (read-only / auto from assignment) */}
              <div className="form-group">
                <label className="form-label">Village id</label>
                <input
                  type="text"
                  className="form-input"
                  value={assignedVillageDisplay}
                  readOnly
                  aria-readonly="true"
                  style={{ background: "var(--input-bg)", opacity: 0.7, cursor: "not-allowed" }}
                />
                <small style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>
                  Taken from the UBND assignment, not entered manually.
                </small>
              </div>

              {/* Role context — Local_Provider */}
              <div className="form-group">
                <label className="form-label">Role</label>
                <input
                  type="text"
                  className="form-input"
                  value="Local_Provider"
                  readOnly
                  aria-readonly="true"
                  style={{ background: "var(--input-bg)", opacity: 0.7, cursor: "not-allowed" }}
                />
              </div>
            </>
          ) : (
            /* --- HDT Section (ADM117 elements 2 to 7 / FR-019) --- */
            <>
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

              {/* System context fields (ADM117 elements 6 and 7) */}
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
            </>
          )}

          <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
            {/* Create button — ADM117 element 12 */}
            <button
              id="create-account-submit"
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ flex: 1 }}
            >
              {submitting ? "Creating…" : "Create"}
            </button>
            {/* Cancel button — ADM117 element 13 */}
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
