"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ViewSubmittedProfileContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agencyId = searchParams.get("agencyId");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [decision, setDecision] = useState<"Approve" | "Request More Information" | "Reject">("Approve");
  const [reviewComment, setReviewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) {
      setError("No agencyId provided");
      setLoading(false);
      return;
    }

    fetch(`/api/admin/agency-reviews?agencyId=${agencyId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load submitted profile");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [agencyId]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agencyId) return;

    if ((decision === "Request More Information" || decision === "Reject") && !reviewComment.trim()) {
      setError("Review comment is required for Request More Information or Reject");
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/admin/agency-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agency_id: agencyId,
          review_type: "Initial Registration",
          decision,
          review_comment: reviewComment,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        setError(resJson.error || "Failed to submit review");
        setSubmitting(false);
        return;
      }

      setActionSuccess(`Review submitted successfully: ${decision}`);
      setSubmitting(false);

      setTimeout(() => {
        router.push("/admin/users");
      }, 1500);
    } catch (err) {
      setError("Network error while submitting review");
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading profile details...</div>;
  }

  if (error && !data) {
    return <div style={{ padding: "2rem", color: "#dc2626" }}>Error: {error}</div>;
  }

  const profile = data?.submitted_profile || {};

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "2rem auto",
        padding: "2rem",
        backgroundColor: "#ffffff",
        borderRadius: "8px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, color: "#111827" }}>
          View Submitted Profile
        </h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => router.push(`/admin/verify/account?agencyId=${agencyId}`)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Account info tab
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/users")}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#f3f4f6",
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Close
          </button>
        </div>
      </div>

      {error && (
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
          {error}
        </div>
      )}

      {actionSuccess && (
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
          {actionSuccess}
        </div>
      )}

      {/* Submitted profile revision */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem", color: "#1f2937" }}>
          Company Information
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div><strong>Company name:</strong> {profile.company_name}</div>
          <div><strong>Company type:</strong> {profile.company_type}</div>
          <div><strong>Tax id:</strong> {profile.tax_id}</div>
          <div><strong>Team size:</strong> {profile.team_size}</div>
          <div><strong>Contact person:</strong> {profile.contact_information?.contact_person_name}</div>
          <div><strong>Phone number:</strong> {profile.contact_information?.phone_number}</div>
        </div>
      </section>

      {/* Supporting documents */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "1.25rem", marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem", color: "#1f2937" }}>
          Supporting documents
        </h2>
        {data.documents && data.documents.length > 0 ? (
          <ul>
            {data.documents.map((doc: any, idx: number) => (
              <li key={idx}>
                <strong>{doc.document_type}:</strong> {doc.file_name}
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: "#6b7280" }}>No documents attached</p>
        )}
      </section>

      {/* Review decision form */}
      <section style={{ border: "1px solid #e5e7eb", borderRadius: "6px", padding: "1.25rem", backgroundColor: "#f9fafb" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem", color: "#1f2937" }}>
          Review Decision
        </h2>

        <form onSubmit={handleSubmitReview}>
          <div style={{ marginBottom: "1rem" }}>
            <label htmlFor="decision" style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem" }}>
              Decision
            </label>
            <select
              id="decision"
              value={decision}
              onChange={(e) => setDecision(e.target.value as any)}
              style={{
                width: "100%",
                padding: "0.5rem 0.75rem",
                borderRadius: "4px",
                border: "1px solid #d1d5db",
                fontSize: "0.875rem",
              }}
            >
              <option value="Approve">Approve</option>
              <option value="Request More Information">Request More Information</option>
              <option value="Reject">Reject</option>
            </select>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="review_comment" style={{ display: "block", fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.25rem" }}>
              Review comment {decision !== "Approve" && <span style={{ color: "#dc2626" }}>*</span>}
            </label>
            <textarea
              id="review_comment"
              rows={4}
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={decision === "Approve" ? "Optional approval notes" : "Reason or requested adjustments"}
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
            disabled={submitting}
            style={{
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#ffffff",
              backgroundColor: decision === "Reject" ? "#dc2626" : decision === "Approve" ? "#16a34a" : "#d97706",
              border: "none",
              borderRadius: "4px",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Submitting..." : "Submit review"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default function ViewSubmittedProfilePage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading...</div>}>
      <ViewSubmittedProfileContent />
    </Suspense>
  );
}
