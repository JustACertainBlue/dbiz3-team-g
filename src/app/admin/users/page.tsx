'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  UserAccountItem,
  PendingVerificationAccount,
  UserManagementResponse,
} from '@/lib/adm/types'
import { getCurrentRole, setCurrentRole, getAuthHeaders, type CurrentUserRole } from '@/lib/prf/client-session'
import { AdminSidebar } from '@/app/components/admin/AdminSidebar'

export default function UserManagementPage() {
  const [role, setRole] = useState<CurrentUserRole>('HDT')
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter States matching ADM095.png
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('ALL')
  const [selectedStatus, setSelectedStatus] = useState('ALL')

  // Data States
  const [accounts, setAccounts] = useState<UserAccountItem[]>([])
  const [pendingAccounts, setPendingAccounts] = useState<PendingVerificationAccount[]>([])
  const [totalCount, setTotalCount] = useState(0)

  // Modal States
  const [selectedAccountForView, setSelectedAccountForView] = useState<UserAccountItem | null>(null)
  const [modalNotice, setModalNotice] = useState<string | null>(null)
  const [toggleLoadingId, setToggleLoadingId] = useState<string | null>(null)

  // Synchronize active role from client session
  useEffect(() => {
    setMounted(true)
    const current = getCurrentRole()
    if (current === 'HDT' || current === 'UBND') {
      setRole(current)
    } else {
      setRole('HDT')
      setCurrentRole('HDT')
    }

    const handleRoleChanged = () => {
      const updated = getCurrentRole()
      setRole(updated)
    }

    window.addEventListener('hab_role_changed', handleRoleChanged)
    return () => window.removeEventListener('hab_role_changed', handleRoleChanged)
  }, [])

  // Load User Accounts from API
  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (searchQuery.trim()) params.set('search', searchQuery.trim())
      if (selectedRole !== 'ALL') params.set('role', selectedRole)
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus)

      const res = await fetch(`/api/adm/users?${params.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const data: UserManagementResponse = await res.json()
      setAccounts(data.users || [])
      setPendingAccounts(data.pendingUsers || [])
      setTotalCount(data.totalCount || 0)
    } catch (err: any) {
      setError(err?.message || 'Failed to load user accounts')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, selectedRole, selectedStatus])

  useEffect(() => {
    if (mounted) {
      loadUsers()
    }
  }, [mounted, role, loadUsers])

  // Handle Enable / Disable Toggle
  const handleToggleStatus = async (account: UserAccountItem) => {
    const nextEnabled = !account.enabled
    setToggleLoadingId(account.userId)
    try {
      const res = await fetch('/api/adm/users', {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: account.userId,
          enabled: nextEnabled,
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to update account status.')
      }

      const result = await res.json()
      // Optimistically update local account item
      setAccounts(prev =>
        prev.map(u =>
          u.userId === account.userId
            ? { ...u, status: result.newStatus, enabled: nextEnabled }
            : u
        )
      )
    } catch (err: any) {
      setError(err?.message || 'Error updating status')
    } finally {
      setToggleLoadingId(null)
    }
  }

  // Get Initials from Full Name
  const getInitials = (name: string) => {
    if (!name) return 'U'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  if (!mounted) return null

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#f4f4f5',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        color: '#09090b',
      }}
    >
      {/* 1. Admin Sidebar with User Management Tab Active */}
      <AdminSidebar currentRole={role} activeTab="users" />

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          padding: '28px 36px 60px 36px',
          overflowY: 'auto',
          minWidth: 0,
        }}
      >
        <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
          {/* Top Header Row matching ADM095.png */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              marginBottom: '20px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: '#71717a',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontFamily: 'monospace, sans-serif',
                }}
              >
                ADMINISTRATION
              </div>
              <h1
                style={{
                  fontSize: '2rem',
                  fontWeight: 700,
                  color: '#09090b',
                  margin: '2px 0 0 0',
                  letterSpacing: '-0.02em',
                }}
              >
                User Management
              </h1>
            </div>

            {/* + Create Account Button */}
            <button
              type="button"
              id="create-account-button"
              onClick={() =>
                setModalNotice(
                  role === 'HDT'
                    ? 'Account Creation for Regional Administrators (UBND) belongs to Screen ADM117 (Module AUT). Operational credential provisioning is managed by the Authentication module.'
                    : 'Account Creation for Local Craft Providers in your assigned village belongs to Screen ADM117 (Module AUT). Local Provider onboarding is managed by the Authentication module.'
                )
              }
              style={{
                background: '#18181b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '9px 18px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              }}
            >
              <span>+</span>
              <span>Create Account</span>
            </button>
          </div>

          {/* Search and Filters Row matching ADM095.png */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '28px',
              flexWrap: 'wrap',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', width: '360px', minWidth: '240px' }}>
              <input
                type="text"
                id="user-search-input"
                placeholder="Search name, email, organization..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  background: '#ffffff',
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  padding: '9px 14px',
                  fontSize: '0.85rem',
                  color: '#09090b',
                  boxSizing: 'border-box',
                  outline: 'none',
                }}
              />
            </div>

            {/* Role Filter Dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                id="role-filter-select"
                value={selectedRole}
                onChange={e => setSelectedRole(e.target.value)}
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  background: '#ffffff',
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  padding: '9px 36px 9px 14px',
                  fontSize: '0.85rem',
                  color: '#09090b',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <option value="ALL">All roles</option>
                <option value="ADMIN">Admin</option>
                <option value="Tour_Agency">Tour Agency</option>
                <option value="Local_Provider">Local Provider</option>
              </select>
              <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#71717a',
                  fontSize: '0.7rem',
                }}
              >
                ▼
              </span>
            </div>

            {/* Status Filter Dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                id="status-filter-select"
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                style={{
                  appearance: 'none',
                  WebkitAppearance: 'none',
                  background: '#ffffff',
                  border: '1px solid #e4e4e7',
                  borderRadius: '8px',
                  padding: '9px 36px 9px 14px',
                  fontSize: '0.85rem',
                  color: '#09090b',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                <option value="ALL">All statuses</option>
                <option value="Active">Active</option>
                <option value="Approved">Approved</option>
                <option value="Disabled">Disabled</option>
                <option value="Pending Approval">Pending Approval</option>
              </select>
              <span
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: '#71717a',
                  fontSize: '0.7rem',
                }}
              >
                ▼
              </span>
            </div>

            {/* Clear filters button */}
            {(searchQuery || selectedRole !== 'ALL' || selectedStatus !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedRole('ALL')
                  setSelectedStatus('ALL')
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#71717a',
                  fontSize: '0.78rem',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '12px 18px',
                borderRadius: '8px',
                marginBottom: '20px',
                fontSize: '0.85rem',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* SECTION 1: PENDING VERIFICATION TABLE matching ADM095.png */}
          <div style={{ marginBottom: '36px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
              }}
            >
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#71717a',
                  letterSpacing: '0.08em',
                  fontFamily: 'monospace, sans-serif',
                  textTransform: 'uppercase',
                }}
              >
                PENDING VERIFICATION
              </span>
              <span
                style={{
                  background: '#e4e4e7',
                  color: '#18181b',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '4px',
                  fontFamily: 'monospace, sans-serif',
                }}
              >
                {pendingAccounts.length}
              </span>
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr
                      style={{
                        background: '#fafafa',
                        borderBottom: '1px solid #e4e4e7',
                        color: '#71717a',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        fontFamily: 'monospace, sans-serif',
                        textTransform: 'uppercase',
                      }}
                    >
                      <th style={{ padding: '12px 18px' }}>NAME</th>
                      <th style={{ padding: '12px 18px' }}>EMAIL</th>
                      <th style={{ padding: '12px 18px' }}>ROLE</th>
                      <th style={{ padding: '12px 18px' }}>ORGANIZATION</th>
                      <th style={{ padding: '12px 18px' }}>REGISTERED</th>
                      <th style={{ padding: '12px 18px', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingAccounts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            padding: '36px 18px',
                            textAlign: 'center',
                            color: '#71717a',
                            fontSize: '0.82rem',
                          }}
                        >
                          No pending accounts awaiting verification in this scope.
                        </td>
                      </tr>
                    ) : (
                      pendingAccounts.map((item, idx) => (
                        <tr
                          key={item.id}
                          style={{
                            borderBottom: idx < pendingAccounts.length - 1 ? '1px solid #f4f4f5' : 'none',
                            fontSize: '0.82rem',
                          }}
                        >
                          {/* Name with initials box */}
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  background: '#f4f4f5',
                                  color: '#52525b',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  fontFamily: 'monospace, sans-serif',
                                }}
                              >
                                {item.initials}
                              </div>
                              <span style={{ fontWeight: 600, color: '#09090b' }}>{item.name}</span>
                            </div>
                          </td>

                          {/* Email */}
                          <td
                            style={{
                              padding: '14px 18px',
                              fontFamily: 'monospace, sans-serif',
                              color: '#52525b',
                            }}
                          >
                            {item.email}
                          </td>

                          {/* Role Tag */}
                          <td style={{ padding: '14px 18px' }}>
                            <span
                              style={{
                                border: '1px solid #e4e4e7',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '0.68rem',
                                fontWeight: 600,
                                fontFamily: 'monospace, sans-serif',
                                color: '#71717a',
                                textTransform: 'uppercase',
                              }}
                            >
                              {item.role}
                            </span>
                          </td>

                          {/* Organization */}
                          <td style={{ padding: '14px 18px', color: '#09090b' }}>
                            {item.organization}
                          </td>

                          {/* Registered Date */}
                          <td
                            style={{
                              padding: '14px 18px',
                              fontFamily: 'monospace, sans-serif',
                              color: '#71717a',
                            }}
                          >
                            {item.submissionDate}
                          </td>

                          {/* Actions: View and Verify */}
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: '8px' }}>
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedAccountForView({
                                    userId: item.id,
                                    name: item.name,
                                    email: item.email,
                                    role: item.role === 'PROVIDER' ? 'Local_Provider' : 'Tour_Agency',
                                    organization: item.organization,
                                    status: 'Pending Approval',
                                    lastLogin: null,
                                    createdDate: item.submissionDate,
                                    enabled: false,
                                  })
                                }
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #e4e4e7',
                                  color: '#09090b',
                                  borderRadius: '6px',
                                  padding: '5px 12px',
                                  fontSize: '0.78rem',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                              >
                                View
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  setModalNotice(
                                    `Profile verification decision for ${item.name} (${item.role}) belongs to Screen VER146 (Module PRF / AUT). Admin Dashboard provides operational monitoring.`
                                  )
                                }
                                style={{
                                  background: '#18181b',
                                  border: 'none',
                                  color: '#ffffff',
                                  borderRadius: '6px',
                                  padding: '5px 14px',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                Verify
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SECTION 2: ALL ACCOUNTS TABLE matching ADM095.png */}
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#71717a',
                letterSpacing: '0.08em',
                fontFamily: 'monospace, sans-serif',
                textTransform: 'uppercase',
                marginBottom: '12px',
              }}
            >
              ALL ACCOUNTS — {totalCount} RESULTS
            </div>

            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e4e4e7',
                borderRadius: '10px',
                overflow: 'hidden',
                boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr
                      style={{
                        background: '#fafafa',
                        borderBottom: '1px solid #e4e4e7',
                        color: '#71717a',
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        letterSpacing: '0.06em',
                        fontFamily: 'monospace, sans-serif',
                        textTransform: 'uppercase',
                      }}
                    >
                      <th style={{ padding: '12px 18px' }}>NAME</th>
                      <th style={{ padding: '12px 18px' }}>EMAIL</th>
                      <th style={{ padding: '12px 18px' }}>ROLE</th>
                      <th style={{ padding: '12px 18px' }}>STATUS</th>
                      <th style={{ padding: '12px 18px' }}>LAST LOGIN</th>
                      <th style={{ padding: '12px 18px' }}>ENABLED</th>
                      <th style={{ padding: '12px 18px', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            padding: '36px 18px',
                            textAlign: 'center',
                            color: '#71717a',
                            fontSize: '0.82rem',
                          }}
                        >
                          Loading accounts...
                        </td>
                      </tr>
                    ) : accounts.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          style={{
                            padding: '36px 18px',
                            textAlign: 'center',
                            color: '#71717a',
                            fontSize: '0.82rem',
                          }}
                        >
                          No accounts match the selected filter criteria.
                        </td>
                      </tr>
                    ) : (
                      accounts.map((account, idx) => {
                        const isToggleLoading = toggleLoadingId === account.userId
                        const isEnabled = account.enabled
                        return (
                          <tr
                            key={account.userId}
                            style={{
                              borderBottom: idx < accounts.length - 1 ? '1px solid #f4f4f5' : 'none',
                              fontSize: '0.82rem',
                            }}
                          >
                            {/* Name with initials avatar */}
                            <td style={{ padding: '14px 18px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    background: '#f4f4f5',
                                    color: '#52525b',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    fontFamily: 'monospace, sans-serif',
                                  }}
                                >
                                  {getInitials(account.name)}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, color: '#09090b' }}>
                                    {account.name}
                                  </div>
                                  <div style={{ fontSize: '0.72rem', color: '#71717a' }}>
                                    {account.organization}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Email */}
                            <td
                              style={{
                                padding: '14px 18px',
                                fontFamily: 'monospace, sans-serif',
                                color: '#52525b',
                              }}
                            >
                              {account.email}
                            </td>

                            {/* Role Badge */}
                            <td style={{ padding: '14px 18px' }}>
                              <span
                                style={{
                                  border: '1px solid #e4e4e7',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  fontFamily: 'monospace, sans-serif',
                                  color: '#71717a',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {account.role === 'Tour_Agency'
                                  ? 'AGENCY'
                                  : account.role === 'Local_Provider'
                                  ? 'PROVIDER'
                                  : 'ADMIN'}
                              </span>
                            </td>

                            {/* Status Badge */}
                            <td style={{ padding: '14px 18px' }}>
                              <span
                                style={{
                                  background:
                                    account.status === 'Active' || account.status === 'Approved'
                                      ? '#18181b'
                                      : '#71717a',
                                  color: '#ffffff',
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  letterSpacing: '0.04em',
                                  fontFamily: 'monospace, sans-serif',
                                  textTransform: 'uppercase',
                                }}
                              >
                                {account.status.toUpperCase()}
                              </span>
                            </td>

                            {/* Last Login */}
                            <td
                              style={{
                                padding: '14px 18px',
                                fontFamily: 'monospace, sans-serif',
                                color: '#71717a',
                              }}
                            >
                              {account.lastLogin || '-'}
                            </td>

                            {/* Enabled Toggle Switch matching ADM095.png */}
                            <td style={{ padding: '14px 18px' }}>
                              <button
                                type="button"
                                role="switch"
                                aria-checked={isEnabled}
                                disabled={isToggleLoading}
                                onClick={() => handleToggleStatus(account)}
                                style={{
                                  position: 'relative',
                                  width: '38px',
                                  height: '22px',
                                  borderRadius: '12px',
                                  background: isEnabled ? '#18181b' : '#e4e4e7',
                                  border: 'none',
                                  padding: 0,
                                  cursor: isToggleLoading ? 'wait' : 'pointer',
                                  transition: 'background 0.2s ease',
                                  outline: 'none',
                                }}
                                title={isEnabled ? 'Click to disable account' : 'Click to enable account'}
                              >
                                <span
                                  style={{
                                    position: 'absolute',
                                    top: '3px',
                                    left: isEnabled ? '19px' : '3px',
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    background: '#ffffff',
                                    transition: 'left 0.2s ease',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                                  }}
                                />
                              </button>
                            </td>

                            {/* Actions: View */}
                            <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                              <button
                                type="button"
                                onClick={() => setSelectedAccountForView(account)}
                                style={{
                                  background: '#ffffff',
                                  border: '1px solid #e4e4e7',
                                  color: '#09090b',
                                  borderRadius: '6px',
                                  padding: '5px 14px',
                                  fontSize: '0.78rem',
                                  fontWeight: 500,
                                  cursor: 'pointer',
                                }}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* VIEW ACCOUNT MODAL (ADM145) */}
          {selectedAccountForView && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: '20px',
              }}
            >
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  maxWidth: '560px',
                  width: '100%',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                  border: '1px solid #e4e4e7',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <div style={{ fontSize: '0.72rem', color: '#71717a', textTransform: 'uppercase', fontFamily: 'monospace, sans-serif' }}>
                      ACCOUNT DETAILS (ADM145)
                    </div>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '2px 0 0 0', color: '#09090b' }}>
                      {selectedAccountForView.name}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAccountForView(null)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      fontSize: '1.1rem',
                      color: '#71717a',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.82rem', marginBottom: '24px' }}>
                  <div>
                    <label style={{ color: '#71717a', fontSize: '0.72rem' }}>EMAIL</label>
                    <div style={{ fontWeight: 600, fontFamily: 'monospace, sans-serif', color: '#09090b' }}>
                      {selectedAccountForView.email}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: '#71717a', fontSize: '0.72rem' }}>ROLE</label>
                    <div style={{ fontWeight: 600, color: '#09090b' }}>
                      {selectedAccountForView.role}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: '#71717a', fontSize: '0.72rem' }}>ORGANIZATION</label>
                    <div style={{ fontWeight: 600, color: '#09090b' }}>
                      {selectedAccountForView.organization}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: '#71717a', fontSize: '0.72rem' }}>STATUS</label>
                    <div style={{ fontWeight: 600, color: '#09090b' }}>
                      {selectedAccountForView.status}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: '#71717a', fontSize: '0.72rem' }}>REGISTERED DATE</label>
                    <div style={{ fontFamily: 'monospace, sans-serif', color: '#09090b' }}>
                      {selectedAccountForView.createdDate}
                    </div>
                  </div>
                  <div>
                    <label style={{ color: '#71717a', fontSize: '0.72rem' }}>LAST LOGIN</label>
                    <div style={{ fontFamily: 'monospace, sans-serif', color: '#09090b' }}>
                      {selectedAccountForView.lastLogin || 'Never logged in'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setSelectedAccountForView(null)}
                    style={{
                      background: '#18181b',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* INFORMATIONAL NOTICE MODAL */}
          {modalNotice && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: '20px',
              }}
            >
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  padding: '24px',
                  maxWidth: '520px',
                  width: '100%',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
                  border: '1px solid #e4e4e7',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '1.25rem' }}>ℹ️</span>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: '#09090b' }}>
                    Information Notice
                  </h3>
                </div>
                <p style={{ fontSize: '0.88rem', color: '#52525b', lineHeight: 1.5, margin: '0 0 20px 0' }}>
                  {modalNotice}
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setModalNotice(null)}
                    style={{
                      background: '#18181b',
                      color: '#ffffff',
                      border: 'none',
                      padding: '8px 18px',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Understood
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
