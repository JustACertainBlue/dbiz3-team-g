'use client'

import React from 'react'
import { AgencyMetrics, ProviderMetrics, BookingMetrics } from '@/lib/adm/types'

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '1.5rem' }}>
      {/* Booking Trend Over Time Line Chart */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '12px',
          padding: '24px',
          border: '1px solid #e4e4e7',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#09090b', margin: 0 }}>
              Booking Trend Series
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#71717a', margin: '4px 0 0 0' }}>
              Granularity dynamically derived from active date range (BR-019)
            </p>
          </div>
        </div>

        {trendPoints.length === 0 ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: '#71717a', fontSize: '0.82rem' }}>
            No booking trend data for the selected period.
          </div>
        ) : (
          <div style={{ width: '100%', height: '140px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingTop: '10px' }}>
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
                    gap: '6px',
                  }}
                >
                  <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#09090b' }}>
                    {pt.count}
                  </span>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '32px',
                      height: `${Math.max(6, heightPct)}%`,
                      background: '#18181b',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                    title={`${label}: ${pt.count} bookings`}
                  />
                  <span style={{ fontSize: '0.65rem', color: '#71717a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '44px' }}>
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Supporting Agency & Provider Operational Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {/* Agency Status Breakdown */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e4e4e7',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#71717a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              AGENCY ACCOUNT STATUS (FR-007)
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              {agencyMetrics.activeAgencyCount} Active
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {agencyMetrics.statusChartData.map(item => (
              <div key={item.status} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ color: '#52525b', fontWeight: 500 }}>{item.status}</span>
                <span style={{ color: '#09090b', fontWeight: 600 }}>
                  {item.count} ({item.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Provider Verification & Activity Matrix */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '20px',
            border: '1px solid #e4e4e7',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#71717a', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              PROVIDER VERIFICATION MATRIX (FR-008)
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#09090b' }}>
              {providerMetrics.activeProviderCount} Active
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {providerMetrics.countsByVillageAndStatus.map(item => (
              <div key={item.villageId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                <span style={{ color: '#52525b', fontWeight: 500 }}>{item.villageName}</span>
                <span style={{ color: '#09090b', fontWeight: 600 }}>
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
