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
import { adminGuestRedirect, adminPageAccess } from './admin-page-access'
import { useRouter } from 'next/navigation'
import { nextVillageFilter } from './village-filter-state'
import { FilterPanel } from '@/app/components/admin/FilterPanel'
import { MetricCards } from '@/app/components/admin/MetricCards'
import { PendingVerificationPanel } from '@/app/components/admin/PendingVerificationPanel'
import { BookingStatusDonut } from '@/app/components/admin/BookingStatusDonut'
import { ChartsSection } from '@/app/components/admin/ChartsSection'
import { BookingTable } from '@/app/components/admin/BookingTable'
import { TopPairsList } from '@/app/components/admin/TopPairsList'
import { dashboardTitle } from '@/lib/adm/dashboard-view'
import { filtersChanged } from './filter-draft'
import './dashboard-v9.css'

export default function AdminDashboardPage() {
  const router = useRouter()
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
  // ADM079 #17: the filter controls edit a draft; Apply filters copies it to the applied filters.
  const [draft, setDraft] = useState<DashboardFilterParams>({
    preset: 'Last 30 days',
    villageId: null,
    agencyId: null,
    providerId: null,
    sortBy: 'Frequency',
  })

  // The actor comes from the server-side demo session (A2); non-admins see the restricted state (L3).
  // #242: a signed-out visitor is sent to Login from this effect (never during render); access stays null meanwhile.
  useEffect(() => {
    setMounted(true)
    return startAdminRoleSync(session => {
      const target = adminGuestRedirect(session)
      if (target) { router.replace(target); return }
      setRole(session.role)
      setAdminType(session.adminType)
      setDisplayName(`${session.adminType ?? ''} Admin`.trim())
      setAccess(adminPageAccess(session))
    })
  }, [router])

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
        const lockVillage = (prev: DashboardFilterParams) => ({ ...prev, villageId: nextVillageFilter({ villageId: prev.villageId ?? null, locked: prevLocked }, data).villageId })
        setFilters(lockVillage)
        setDraft(lockVillage)
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
    setDraft(prev => ({ ...prev, ...updated }))
  }

  const handleSortChange = (sortBy: CollaborationSortBy) => {
    setFilters(prev => ({ ...prev, sortBy }))
    setDraft(prev => ({ ...prev, sortBy }))
  }

  if (!mounted || access === null) return null

  if (access === 'restricted') {
    return (
      <main className="ad9-state">
        <h1>Admin Dashboard</h1>
        <p>Đăng nhập bằng tài khoản UBND Admin hoặc HDT Admin để truy cập.</p>
        <a href="/login">Đăng nhập</a>
      </main>
    )
  }

  // SR-003: UBND is fixed to its village; HDT is city-wide unless a village filter is chosen.
  const scopeVillageId = villagesData.isLocked ? villagesData.assignedVillageId : filters.villageId // applied, not draft
  const villageName = villagesData.villages.find(village => village.villageId === scopeVillageId)?.name ?? null

  return (
    <main className="ad9">
      {modalNotice && (
        <div className="ad9-modal" role="dialog" aria-modal="true" aria-labelledby="ad9-modal-title">
          <div className="ad9-modal__box">
            <h3 id="ad9-modal-title">Information Notice</h3>
            <p>{modalNotice}</p>
            <button type="button" className="ad9-btn ad9-btn--primary" onClick={() => setModalNotice(null)}>Understood</button>
          </div>
        </div>
      )}

      {error && <p className="ad9-alert" role="alert">{error}</p>}

      {/* ADM079 #1–#9 and #18: title, filters and Manage accounts (ADM095) */}
      <FilterPanel
        filters={draft}
        onFilterChange={handleFilterChange}
        villageOptions={villagesData.villages}
        isVillageLocked={villagesData.isLocked}
        assignedVillageId={villagesData.assignedVillageId}
        title={dashboardTitle(villageName)}
        onApply={() => setFilters(prev => ({ ...draft, sortBy: prev.sortBy }))}
        applyDisabled={!filtersChanged(draft, filters) || loading}
        actions={<div className="ad9-title__actions">
          <a href="/admin/users" className="ad9-btn">Quản lý tài khoản</a>
        </div>}
      />

      {dashboardData && <>
        {/* #10–#13, #22: the four FR-003 cards */}
        <MetricCards cards={dashboardData.metricCards} loading={loading} />
        <div className="ad9-grid-2">
          <PendingVerificationPanel items={dashboardData.pendingVerification} />
          {/* #16: status breakdown */}
          <BookingStatusDonut bookingMetrics={dashboardData.bookingMetrics} />
        </div>
        {/* #19 trend, #14 / #15 account and provider status */}
        <ChartsSection
          agencyMetrics={dashboardData.agencyMetrics}
          providerMetrics={dashboardData.providerMetrics}
          bookingMetrics={dashboardData.bookingMetrics}
          granularity={dashboardData.period.granularity}
        />
        {/* #20 booking table, #21 top 10 pairs */}
        <BookingTable bookings={dashboardData.bookingMetrics.bookingTable} />
        <TopPairsList collaboration={dashboardData.collaborationMetrics} onSortChange={handleSortChange} />
      </>}
    </main>
  )
}
