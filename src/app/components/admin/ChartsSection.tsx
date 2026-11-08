'use client'

import React from 'react'
import { AgencyMetrics, ProviderMetrics, BookingMetrics } from '@/lib/adm/types'
import { statusLabel } from '@/lib/status-labels'

interface ChartsSectionProps {
  agencyMetrics: AgencyMetrics
  providerMetrics: ProviderMetrics
  bookingMetrics: BookingMetrics
}

export function ChartsSection({
  agencyMetrics,
  providerMetrics,
  bookingMetrics,
}: ChartsSectionProps) {
  const trendPoints = bookingMetrics.trendChartData || []
  const maxTrendCount = Math.max(1, ...trendPoints.map(p => p.count))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1p25rem)', marginBottom: 'var(--space-1p5rem)' }}>
      {/* Booking Trend Over Time Line Chart */}
      <div
        style={{
          background: 'var(--palette-white)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-24px)',
          border: 'var(--border-width-1) solid var(--palette-gray-90)',
          boxShadow: '0 var(--space-1px) var(--space-2px) var(--alpha-black-3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-16px)' }}>
          <div>
            <h3 style={{ fontSize: 'var(--font-size-1rem)', fontWeight: 700, color: 'var(--palette-gray-4)', margin: 0 }}>
              Booking Trend Series
            </h3>
            <p style={{ fontSize: 'var(--font-size-0p78rem)', color: 'var(--palette-gray-46)', margin: 'var(--space-4px) 0 0 0' }}>
              Granularity dynamically derived from active date range (BR-019)
            </p>
          </div>
        </div>

        {trendPoints.length === 0 ? (
          <div style={{ padding: 'var(--space-36px) 0', textAlign: 'center', color: 'var(--palette-gray-46)', fontSize: 'var(--font-size-0p82rem)' }}>
            No booking trend data for the selected period.
          </div>
        ) : (
          <div style={{ width: '100%', height: '140px', display: 'flex', alignItems: 'flex-end', gap: 'var(--space-8px)', paddingTop: 'var(--space-10px)' }}>
            {trendPoints.map((pt, idx) => {
              const heightPct = Math.round((pt.count / maxTrendCount) * 100)
              const label = new Date(pt.periodStart).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
              return (
                <div
                  key={idx}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    height: '100%',
                    justifyContent: 'flex-end',
                    gap: 'var(--space-6px)',
                  }}
                >
                  <span style={{ fontSize: 'var(--font-size-0p7rem)', fontWeight: 600, color: 'var(--palette-gray-4)' }}>
                    {pt.count}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '32px',
                      height: `${Math.max(6, heightPct)}%`,
                      background: 'var(--palette-gray-10)',
                      borderRadius: 'var(--radius-4) var(--radius-4) 0 0',
                      transition: 'height 0.3s ease',
                    }}
                    title={`${label}: ${pt.count} bookings`}
                  />
                  <span style={{ fontSize: 'var(--font-size-0p65rem)', color: 'var(--palette-gray-46)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '44px' }}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Supporting Agency & Provider Operational Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 'var(--space-1p25rem)' }}>
        {/* Agency Status Breakdown */}
        <div
          style={{
            background: 'var(--palette-white)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-20px)',
            border: 'var(--border-width-1) solid var(--palette-gray-90)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-14px)' }}>
            <span style={{ fontSize: 'var(--font-size-0p72rem)', fontWeight: 600, color: 'var(--palette-gray-46)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              AGENCY ACCOUNT STATUS (FR-007)
            </span>
            <span style={{ fontSize: 'var(--font-size-0p75rem)', fontWeight: 600, color: 'var(--palette-gray-4)' }}>
              {agencyMetrics.activeAgencyCount} Active
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8px)' }}>
            {agencyMetrics.statusChartData.map(item => (
              <div key={item.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-0p78rem)' }}>
                <span style={{ color: 'var(--palette-gray-34)', fontWeight: 500 }}>{statusLabel('agency', item.status)}</span>
                <span style={{ color: 'var(--palette-gray-4)', fontWeight: 600 }}>
                  {item.count} ({item.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Provider Verification & Activity Matrix */}
        <div
          style={{
            background: 'var(--palette-white)',
            borderRadius: 'var(--radius-md)',
            padding: 'var(--space-20px)',
            border: 'var(--border-width-1) solid var(--palette-gray-90)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-14px)' }}>
            <span style={{ fontSize: 'var(--font-size-0p72rem)', fontWeight: 600, color: 'var(--palette-gray-46)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              PROVIDER VERIFICATION MATRIX (FR-008)
            </span>
            <span style={{ fontSize: 'var(--font-size-0p75rem)', fontWeight: 600, color: 'var(--palette-gray-4)' }}>
              {providerMetrics.activeProviderCount} Active
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-8px)' }}>
            {providerMetrics.countsByVillageAndStatus.map(item => (
              <div key={item.villageId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 'var(--font-size-0p78rem)' }}>
                <span style={{ color: 'var(--palette-gray-34)', fontWeight: 500 }}>{item.villageName}</span>
                <span style={{ color: 'var(--palette-gray-4)', fontWeight: 600 }}>
                  Verified: {item.verificationStatus?.Verified || 0}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
