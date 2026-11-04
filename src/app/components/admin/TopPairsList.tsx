'use client'

import React from 'react'
import { CollaborationMetrics, CollaborationSortBy } from '@/lib/adm/types'

interface TopPairsListProps {
  collaboration: CollaborationMetrics
  onSortChange: (sortBy: CollaborationSortBy) => void
}

export function TopPairsList({ collaboration, onSortChange }: TopPairsListProps) {
  const currentSort = collaboration.sortBy || 'Frequency'

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '10px',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
            <span>🤝</span> TOP 10 CẶP HỢP TÁC AGENCY - XƯỞNG (FR-010)
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Chỉ tính đơn Booked & Completed (BR-018; On hold và Cancelled không tính)
          </span>
        </div>

        {/* Toggle Frequency vs Recency */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '6px', padding: '2px' }}>
          <button
            type="button"
            onClick={() => onSortChange('Frequency')}
            style={{
              background: currentSort === 'Frequency' ? '#ffffff' : 'transparent',
              color: currentSort === 'Frequency' ? '#1e3a5f' : '#64748b',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontWeight: currentSort === 'Frequency' ? 700 : 500,
              cursor: 'pointer',
              boxShadow: currentSort === 'Frequency' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Tần suất
          </button>
          <button
            type="button"
            onClick={() => onSortChange('Recency')}
            style={{
              background: currentSort === 'Recency' ? '#ffffff' : 'transparent',
              color: currentSort === 'Recency' ? '#1e3a5f' : '#64748b',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 10px',
              fontSize: '0.72rem',
              fontWeight: currentSort === 'Recency' ? 700 : 500,
              cursor: 'pointer',
              boxShadow: currentSort === 'Recency' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
            }}
          >
            Gần đây nhất
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {collaboration.topPairs.length > 0 ? (
          collaboration.topPairs.map((pair, idx) => (
            <div
              key={`${pair.agencyId}-${pair.providerId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 0.85rem',
                borderRadius: '6px',
                background: idx < 3 ? '#f8fafc' : '#ffffff',
                border: '1px solid #f1f5f9',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <span
                  style={{
                    background: idx === 0 ? '#fef3c7' : idx === 1 ? '#e2e8f0' : idx === 2 ? '#ffedd5' : '#f8fafc',
                    color: idx === 0 ? '#b45309' : idx === 1 ? '#475569' : idx === 2 ? '#c2410c' : '#64748b',
                    fontWeight: 800,
                    width: '22px',
                    height: '22px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                  }}
                >
                  {idx + 1}
                </span>

                <div>
                  <div style={{ fontWeight: 700, color: '#1e3a5f' }}>
                    {pair.agencyName}
                  </div>
                  <div style={{ color: '#b84c24', fontSize: '0.72rem', fontWeight: 600 }}>
                    ↔ {pair.providerName}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem' }}>
                  {pair.bookingCount}
                </span>
                <span style={{ fontSize: '0.65rem', color: '#64748b', marginLeft: '3px' }}>
                  lần hợp tác
                </span>
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>
                  Gần nhất: {new Date(pair.lastDate).toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#94a3b8', fontSize: '0.75rem' }}>
            Chưa có lượt hợp tác nào trong phạm vi báo cáo.
          </div>
        )}
      </div>
    </div>
  )
}
