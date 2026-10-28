"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function AccountInfoContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const agencyId = searchParams.get("agencyId");

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!agencyId) {
      setError("No agencyId provided");
      setLoading(false);
      return;
    }

    fetch(`/api/admin/agency-reviews?agencyId=${agencyId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load account information");
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

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading account information...</div>;
  }

  if (error || !data) {
    return (
      <div style={{ padding: "2rem", color: "#dc2626" }}>
        Error: {error || "No data"}
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "800px",
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
          Account Information
        </h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => router.push(`/admin/verify/review?agencyId=${agencyId}`)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Submitted profile tab
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

      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
          padding: "1.5rem",
        }}
      >
        <div style={{ marginBottom: "1rem" }}>
          <strong>Account id: </strong>
          <span style={{ color: "#4b5563" }}>{data.user_id}</span>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <strong>Role / admin subtype: </strong>
          <span style={{ color: "#4b5563" }}>{data.role}</span>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <strong>Account status: </strong>
          <span
            style={{
              display: "inline-block",
              padding: "0.25rem 0.5rem",
              borderRadius: "4px",
              fontSize: "0.875rem",
              fontWeight: 600,
              backgroundColor:
                data.status === "Approved"
                  ? "#dcfce7"
                  : data.status === "Rejected"
                  ? "#fee2e2"
                  : "#fef9c3",
              color:
                data.status === "Approved"
                  ? "#166534"
                  : data.status === "Rejected"
                  ? "#991b1b"
                  : "#854d0e",
            }}
          >
            {data.status}
          </span>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <strong>Organization: </strong>
          <span style={{ color: "#4b5563" }}>{data.organization}</span>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <strong>Registration / created date: </strong>
          <span style={{ color: "#4b5563" }}>{data.created_date}</span>
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <strong>Last login: </strong>
          <span style={{ color: "#4b5563" }}>{data.last_login || "Never"}</span>
        </div>
      </div>
    </div>
  );
}

export default function AccountInfoPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading...</div>}>
      <AccountInfoContent />
    </Suspense>
  );
}
