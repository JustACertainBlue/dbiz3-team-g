'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import {
  DashboardFilterParams,
  DashboardMetricsResponse,
  VillagesResponse,
  CollaborationSortBy,
} from '@/lib/adm/types'
import { getAuthHeaders } from '@/lib/prf/client-session'
import type { AdminType, AuthRole } from '@/lib/auth/session'
import { startAdminRoleSync } from './admin-role-sync'
import { adminPageAccess } from './admin-page-access'
import { nextVillageFilter } from './village-filter-state'
import { FilterPanel } from '@/app/components/admin/FilterPanel'
import { MetricCards } from '@/app/components/admin/MetricCards'
import { PendingVerificationPanel } from '@/app/components/admin/PendingVerificationPanel'
import { BookingStatusDonut } from '@/app/components/admin/BookingStatusDonut'
import { ChartsSection } from '@/app/components/admin/ChartsSection'
import { BookingTable } from '@/app/components/admin/BookingTable'
import { TopPairsList } from '@/app/components/admin/TopPairsList'

export default function AdminDashboardPage() {
  const [role, setRole] = useState<AuthRole | null>(null)
  const [adminType, setAdminType] = useState<AdminType | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [access, setAccess] = useState<'allow' | 'restricted' | null>(null)
  const villageLockedRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modalNotice, setModalNotice] = useState<string | null>(null)

  const [villagesData, setVillagesData] = useState<VillagesResponse>({
    isLocked: false,
    assignedVillageId: null,
    villages: [],
  })

  const [dashboardData, setDashboardData] = useState<DashboardMetricsResponse | null>(null)

  const [filters, setFilters] = useState<DashboardFilterParams>({
    preset: 'Last 30 days',
    villageId: null,
    agencyId: null,
    providerId: null,
    sortBy: 'Frequency',
  })

  // The actor comes from the server-side demo session (A2); non-admins see the restricted state (L3).
  useEffect(() => {
    setMounted(true)
    return startAdminRoleSync(session => {
      setRole(session.role)
      setAdminType(session.adminType)
      setDisplayName(`${session.adminType ?? ''} Admin`.trim())
      setAccess(adminPageAccess(session))
    })
  }, [])

  // Load villages configuration
  const loadVillages = useCallback(async () => {
    try {
      const res = await fetch('/api/adm/villages', {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data: VillagesResponse = await res.json()
        setVillagesData(data)
        // A7: UBND → assigned village; HDT after a locked village → All Villages; HDT's own choice is kept
        const prevLocked = villageLockedRef.current
        villageLockedRef.current = data.isLocked
        setFilters(prev => ({ ...prev, villageId: nextVillageFilter({ villageId: prev.villageId ?? null, locked: prevLocked }, data).villageId }))
      } else {
        const err = await res.json().catch(() => ({}))
        setError(err.error || `Failed to load villages: HTTP ${res.status}`)
      }
    } catch (err: any) {
      setError(err?.message || 'Error connecting to village service')
    }
  }, [])

  // Fetch dashboard data whenever filters or role changes
  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (filters.preset) params.set('preset', filters.preset)
      if (filters.startDate) params.set('startDate', filters.startDate)
      if (filters.endDate) params.set('endDate', filters.endDate)
      if (filters.villageId) params.set('villageId', filters.villageId)
      if (filters.agencyId) params.set('agencyId', filters.agencyId)
      if (filters.providerId) params.set('providerId', filters.providerId)
      if (filters.sortBy) params.set('sortBy', filters.sortBy)

      const res = await fetch(`/api/adm/dashboard?${params.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || `HTTP ${res.status}`)
      }

      const data: DashboardMetricsResponse = await res.json()
      setDashboardData(data)
    } catch (err: any) {
      setError(err?.message || 'Unable to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [filters, role])

  useEffect(() => {
    if (mounted && access === 'allow') {
      loadVillages()
    }
  }, [mounted, access, role, loadVillages])

  useEffect(() => {
    if (mounted && access === 'allow') {
      loadDashboard()
    }
  }, [mounted, access, loadDashboard])

  const handleFilterChange = (updated: Partial<DashboardFilterParams>) => {
    setFilters(prev => ({ ...prev, ...updated }))
  }

  const handleSortChange = (sortBy: CollaborationSortBy) => {
    setFilters(prev => ({ ...prev, sortBy }))
  }

  if (!mounted || access === null) return null

  if (access === 'restricted') {
    return (
      <main className="admin-state">
        <h1>Admin Dashboard</h1>
        <p>Đăng nhập bằng tài khoản UBND Admin hoặc HDT Admin để truy cập.</p>
        <a href="/login">Đăng nhập</a>
      </main>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: 'var(--palette-gray-96-4)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        color: 'var(--palette-gray-4)',
      }}
    >
      {/* 1. Fixed Dark Left Sidebar matching ADM079.png */}

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          padding: 'var(--space-28) var(--space-36) var(--space-60) var(--space-36)',
          overflowY: 'auto',
          minWidth: 0,
        }}
      >
        <div style={{ maxWidth: '1360px', margin: '0 auto' }}>
          {/* Read-only Action Info Modal */}
          {modalNotice && (
            <div
              style={{
                position: 'fixed',
                inset: 0,
                background: 'var(--alpha-black-40)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 100,
                padding: 'var(--space-20)',
              }}
            >
              <div
                style={{
                  background: 'var(--palette-white)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-24)',
                  maxWidth: 'var(--space-520)',
                  width: '100%',
                  boxShadow: '0 var(--space-20) var(--space-25) -5px var(--alpha-black-10)',
                  border: 'var(--border-width-1) solid var(--palette-gray-90)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)', marginBottom: 'var(--space-12)' }}>
                  <span style={{ fontSize: 'var(--font-size-1p25rem)' }}>ℹ️</span>
                  <h3 style={{ fontSize: 'var(--font-size-1p1rem)', fontWeight: 700, margin: 0, color: 'var(--palette-gray-4)' }}>
                    Information Notice
                  </h3>
                </div>
                <p style={{ fontSize: 'var(--font-size-0p88rem)', color: 'var(--palette-gray-34)', lineHeight: 1.5, margin: '0 0 var(--space-20) 0' }}>
                  {modalNotice}
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setModalNotice(null)}
                    style={{
                      background: 'var(--palette-gray-10)',
                      color: 'var(--palette-white)',
                      border: 'none',
                      padding: 'var(--space-8) var(--space-18)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--space-0p85rem)',
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

          {/* Error Alert */}
          {error && (
            <div
              style={{
                background: 'var(--palette-red-97)',
                border: 'var(--border-width-1) solid var(--palette-red-89)',
                color: 'var(--palette-red-35)',
                padding: 'var(--space-12) var(--space-18)',
                borderRadius: 'var(--radius-8)',
                marginBottom: 'var(--space-16)',
                fontSize: 'var(--space-0p85rem)',
              }}
            >
              {error}
            </div>
          )}

          {/* 2. Dashboard Header, Time Period Selector & Filter Bar */}
          <FilterPanel
            filters={filters}
            onFilterChange={handleFilterChange}
            villageOptions={villagesData.villages}
            isVillageLocked={villagesData.isLocked}
            assignedVillageId={villagesData.assignedVillageId}
          />

          {/* 3. Four Summary Metric Cards */}
          {dashboardData && (
            <MetricCards cards={dashboardData.metricCards} loading={loading} />
          )}

          {/* 4 & 5. Primary 2-Panel Row: Pending Verification & Booking Status Donut */}
          {dashboardData && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr',
                gap: 'var(--space-20)',
                marginBottom: 'var(--space-24)',
                alignItems: 'stretch',
              }}
            >
              {/* Left Panel: Pending Verification */}
              <PendingVerificationPanel items={dashboardData.pendingVerification} />

              {/* Right Panel: Booking Status Donut Chart */}
              <BookingStatusDonut bookingMetrics={dashboardData.bookingMetrics} />
            </div>
          )}

          {/* 6. Operational Monitoring Panels Below Primary Row */}
          {dashboardData && (
            <>
              {/* Booking Trend Series Line Chart & Supporting Matrix */}
              <ChartsSection
                agencyMetrics={dashboardData.agencyMetrics}
                providerMetrics={dashboardData.providerMetrics}
                bookingMetrics={dashboardData.bookingMetrics}
              />

              {/* Booking Monitoring Table & Top 10 Collaboration Pairs */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.8fr 1.2fr',
                  gap: 'var(--space-20)',
                  alignItems: 'start',
                }}
              >
                <BookingTable bookings={dashboardData.bookingMetrics.bookingTable} />
                <TopPairsList
                  collaboration={dashboardData.collaborationMetrics}
                  onSortChange={handleSortChange}
                />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
