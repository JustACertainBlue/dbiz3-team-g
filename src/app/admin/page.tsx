'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  DashboardFilterParams,
  DashboardMetricsResponse,
  VillagesResponse,
  CollaborationSortBy,
} from '@/lib/adm/types'
import { getCurrentRole, setCurrentRole, getAuthHeaders, type CurrentUserRole } from '@/lib/prf/client-session'
import { AdminSidebar } from '@/app/components/admin/AdminSidebar'
import { FilterPanel } from '@/app/components/admin/FilterPanel'
import { MetricCards } from '@/app/components/admin/MetricCards'
import { PendingVerificationPanel } from '@/app/components/admin/PendingVerificationPanel'
import { BookingStatusDonut } from '@/app/components/admin/BookingStatusDonut'
import { ChartsSection } from '@/app/components/admin/ChartsSection'
import { BookingTable } from '@/app/components/admin/BookingTable'
import { TopPairsList } from '@/app/components/admin/TopPairsList'

export default function AdminDashboardPage() {
  const [role, setRole] = useState<CurrentUserRole>('HDT')
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

  // Synchronize active role from client session
  useEffect(() => {
    setMounted(true)
    const current = getCurrentRole()
    if (current === 'HDT' || current === 'UBND') {
      setRole(current)
    } else {
      // Ensure admin view defaults to an authenticated HDT Admin session
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

  // Load villages configuration
  const loadVillages = useCallback(async () => {
    try {
      const res = await fetch('/api/adm/villages', {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data: VillagesResponse = await res.json()
        setVillagesData(data)
        if (data.isLocked && data.assignedVillageId) {
          setFilters(prev => ({ ...prev, villageId: data.assignedVillageId }))
        } else if (!data.isLocked) {
          // HDT platform-wide: reset if previously locked
          setFilters(prev => (prev.villageId === data.assignedVillageId ? { ...prev, villageId: null } : prev))
        }
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
    if (mounted) {
      loadVillages()
    }
  }, [mounted, role, loadVillages])

  useEffect(() => {
    if (mounted) {
      loadDashboard()
    }
  }, [mounted, loadDashboard])

  const handleFilterChange = (updated: Partial<DashboardFilterParams>) => {
    setFilters(prev => ({ ...prev, ...updated }))
  }

  const handleSortChange = (sortBy: CollaborationSortBy) => {
    setFilters(prev => ({ ...prev, sortBy }))
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
      {/* 1. Fixed Dark Left Sidebar matching ADM079.png */}
      <AdminSidebar
        currentRole={role}
        activeTab="dashboard"
        onOpenNotice={msg => setModalNotice(msg)}
      />

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
          {/* Read-only Action Info Modal */}
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

          {/* Error Alert */}
          {error && (
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#991b1b',
                padding: '12px 18px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.85rem',
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
                gap: '20px',
                marginBottom: '24px',
                alignItems: 'stretch',
              }}
            >
              {/* Left Panel: Pending Verification */}
              <PendingVerificationPanel
                villageId={dashboardData.scope.effectiveVillageId}
                onOpenNotice={msg => setModalNotice(msg)}
              />

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
                  gap: '20px',
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
