"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

export default function StatusPage() {
  const [accountStatus, setAccountStatus] = useState<string>("Pending Approval");
  const [agencyAccountId, setAgencyAccountId] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedStatus = sessionStorage.getItem("account_status") || "Pending Approval";
      const storedAgencyId = sessionStorage.getItem("agency_account_id") || "";
      const storedUserId = sessionStorage.getItem("user_id") || "";
      const storedEmail = sessionStorage.getItem("registration_email") || "";

      setAccountStatus(storedStatus);
      setAgencyAccountId(storedAgencyId);
      setUserId(storedUserId);
      setEmail(storedEmail);

      // Task T027 requirement: Clears registration_request_id from sessionStorage
      sessionStorage.removeItem("registration_request_id");
    }
  }, []);

  return (
    <div className="card" style={{ maxWidth: "700px", margin: "2rem auto" }}>
      <div className="card-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 className="card-title">Registration Status</h1>
          <span className="badge badge-pending">{accountStatus}</span>
        </div>
        <p className="card-subtitle">
          Your application has been received and verified.
        </p>
      </div>

      <div className="alert alert-success">
        <h3 style={{ marginBottom: "0.25rem", fontWeight: 700 }}>
          Registration submitted — Pending Approval
        </h3>
        <p>Your application is pending HDT review.</p>
      </div>

      <div className="status-details">
        <div className="status-row">
          <span className="status-label">Account Status:</span>
          <span><strong>{accountStatus}</strong></span>
        </div>
        {agencyAccountId && (
          <div className="status-row">
            <span className="status-label">Agency Account ID:</span>
            <span className="status-value">{agencyAccountId}</span>
          </div>
        )}
        {userId && (
          <div className="status-row">
            <span className="status-label">User ID:</span>
            <span className="status-value">{userId}</span>
          </div>
        )}
        {email && (
          <div className="status-row">
            <span className="status-label">Registered Email:</span>
            <span>{email}</span>
          </div>
        )}
      </div>

      <div style={{ margin: "1.5rem 0", color: "var(--text-muted)", fontSize: "0.9rem" }}>
        <p>
          Hanoi Department of Tourism (HDT) officers will review your submitted business credentials and licensing documents.
          Once approved, you will receive an email notification allowing you to sign in and begin managing tours.
        </p>
      </div>

      <div className="btn-group">
        <Link href="#" className="btn btn-primary">
          Sign in
        </Link>
        <Link href="/" className="btn btn-secondary">
          Return to Home
        </Link>
      </div>
    </div>
  );
}
