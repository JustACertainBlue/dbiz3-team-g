"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface UserItem {
  user_id: string;
  email: string;
  name: string;
  organization: string;
  role: string;
  status: string;
  last_login: string | null;
  created_date: string;
  available_actions: string[];
}

// Screen ADM095 — User Management
// Functions: F-AUTH-21 (FR-021), F-AUTH-22 (FR-022), F-AUTH-16 (FR-016)
export default function UserManagementPage() {
  const router = useRouter();

  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters (ADM095 element 3)
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);

      const res = await fetch(`/api/admin/accounts?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          setError("Unauthorized or access denied.");
        } else {
          setError("Failed to load user accounts.");
        }
        setLoading(false);
        return;
      }

      const data = await res.json();
      setUsers(data.users || []);
      setTotalCount(data.total_count || 0);
    } catch {
      setError("Network error while loading user accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
  }, [roleFilter, statusFilter, dateFrom, dateTo]);

  return (
    <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        {/* Screen title — ADM095 element 1 */}
        <h1 style={{ fontSize: "1.75rem", fontWeight: 700, margin: 0 }}>User Management</h1>
        {/* Create account button — ADM095 element 5 */}
        <button
          id="btn-create-account"
          className="btn-primary"
          onClick={() => router.push("/admin/create-account")}
          style={{ padding: "0.6rem 1.2rem", cursor: "pointer" }}
        >
          Create account
        </button>
      </div>

      {/* Filter panel — ADM095 element 3 */}
      <section
        style={{
          background: "var(--card-bg, #ffffff)",
          border: "1px solid var(--border-color, #e5e7eb)",
          borderRadius: "0.5rem",
          padding: "1rem",
          marginBottom: "1.5rem",
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "#6b7280", marginBottom: "0.25rem" }}>
            Role
          </label>
          <select
            id="filter-role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{ padding: "0.4rem 0.6rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
          >
            <option value="">All Roles</option>
            <option value="Tour_Agency">Tour Agency</option>
            <option value="Local_Provider">Local Provider</option>
            <option value="ADMIN">Admin</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "#6b7280", marginBottom: "0.25rem" }}>
            Status
          </label>
          <select
            id="filter-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "0.4rem 0.6rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
          >
            <option value="">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Approved">Approved</option>
            <option value="Pending Approval">Pending Approval</option>
            <option value="Rejected">Rejected</option>
            <option value="Disabled">Disabled</option>
          </select>
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "#6b7280", marginBottom: "0.25rem" }}>
            Date From
          </label>
          <input
            id="filter-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ padding: "0.4rem 0.6rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
          />
        </div>

        <div>
          <label style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase", color: "#6b7280", marginBottom: "0.25rem" }}>
            Date To
          </label>
          <input
            id="filter-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ padding: "0.4rem 0.6rem", borderRadius: "0.375rem", border: "1px solid #d1d5db" }}
          />
        </div>

        {(roleFilter || statusFilter || dateFrom || dateTo) && (
          <button
            onClick={() => {
              setRoleFilter("");
              setStatusFilter("");
              setDateFrom("");
              setDateTo("");
            }}
            style={{ marginTop: "1rem", padding: "0.4rem 0.8rem", border: "none", background: "transparent", color: "#3b82f6", cursor: "pointer" }}
          >
            Reset filters
          </button>
        )}
      </section>

      {error && (
        <div className="form-error" role="alert" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: "#6b7280" }}>Loading accounts…</p>
      ) : users.length === 0 ? (
        <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280", border: "1px dashed #d1d5db", borderRadius: "0.5rem" }}>
          No accounts found matching your criteria.
        </div>
      ) : (
        /* Account list table — ADM095 element 2 */
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: "0.5rem" }}>
            <thead>
              <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}>Name</th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}>Email</th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}>Organization</th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}>Role</th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}>Status</th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}>Last login</th>
                <th style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.user_id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.9rem" }}>{u.name}</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.9rem", color: "#4b5563" }}>{u.email}</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.9rem" }}>{u.organization}</td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.85rem" }}>
                    <span style={{ padding: "0.2rem 0.5rem", borderRadius: "0.25rem", background: "#f3f4f6", fontWeight: 500 }}>
                      {u.role}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.85rem" }}>
                    <span
                      style={{
                        padding: "0.2rem 0.5rem",
                        borderRadius: "0.25rem",
                        fontWeight: 500,
                        background:
                          u.status === "Active" || u.status === "Approved"
                            ? "rgba(16,185,129,0.1)"
                            : u.status === "Disabled"
                            ? "rgba(239,68,68,0.1)"
                            : "rgba(245,158,11,0.1)",
                        color:
                          u.status === "Active" || u.status === "Approved"
                            ? "#059669"
                            : u.status === "Disabled"
                            ? "#dc2626"
                            : "#d97706",
                      }}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", color: "#6b7280" }}>
                    {u.last_login ? new Date(u.last_login).toLocaleDateString() : "Never"}
                  </td>
                  {/* Actions — ADM095 element 4, 6, 7, 8 */}
                  <td style={{ padding: "0.75rem 1rem", fontSize: "0.85rem", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      {/* Manage access — ADM095 element 8 → ADM118 */}
                      <Link
                        href={`/admin/users/${u.user_id}/actions`}
                        style={{ color: "#2563eb", textDecoration: "none", fontWeight: 500 }}
                      >
                        Manage access
                      </Link>

                      {/* View account — ADM095 element 6 → ADM145 */}
                      <Link
                        href={`/admin/view-account?userId=${u.user_id}`}
                        style={{ color: "#6b7280", textDecoration: "none" }}
                      >
                        View
                      </Link>

                      {/* Review submission — ADM095 element 7 → VER146 (for Pending Approval) */}
                      {u.status === "Pending Approval" && (
                        <Link
                          href={`/admin/verify/review?userId=${u.user_id}`}
                          style={{ color: "#d97706", textDecoration: "none" }}
                        >
                          Review
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: "0.75rem", fontSize: "0.85rem", color: "#6b7280" }}>
            Showing {users.length} of {totalCount} total accounts.
          </p>
        </div>
      )}
    </main>
  );
}
