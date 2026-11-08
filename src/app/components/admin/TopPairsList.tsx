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
        background: 'var(--palette-white)',
        borderRadius: 'var(--radius-10)',
        padding: 'var(--space-1p25rem)',
        border: 'var(--border-width-1) solid var(--palette-blue-91)',
        boxShadow: '0 var(--space-1px) var(--space-3px) var(--alpha-black-5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1rem)', flexWrap: 'wrap', gap: 'var(--space-0p5rem)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--font-size-0p9rem)', fontWeight: 700, color: 'var(--palette-blue-17)', display: 'flex', alignItems: 'center', gap: 'var(--space-0p4rem)', margin: 0 }}>
            <span>🤝</span> TOP 10 CẶP HỢP TÁC AGENCY - XƯỞNG (FR-010)
          </h3>
          <span style={{ fontSize: 'var(--font-size-0p72rem)', color: 'var(--palette-blue-47)' }}>
            Chỉ tính đơn Booked & Completed (BR-018; On hold và Cancelled không tính)
          </span>
        </div>

        {/* Toggle Frequency vs Recency */}
        <div style={{ display: 'flex', alignItems: 'center', background: 'var(--palette-gray-96-5)', borderRadius: 'var(--radius-sm)', padding: 'var(--space-2px)' }}>
          <button
            type="button"
            onClick={() => onSortChange('Frequency')}
            style={{
              background: currentSort === 'Frequency' ? 'var(--palette-white)' : 'transparent',
              color: currentSort === 'Frequency' ? 'var(--palette-blue-25)' : 'var(--palette-blue-47)',
              border: 'none',
              borderRadius: 'var(--radius-4)',
              padding: 'var(--space-4px) var(--space-10px)',
              fontSize: 'var(--font-size-0p72rem)',
              fontWeight: currentSort === 'Frequency' ? 700 : 500,
              cursor: 'pointer',
              boxShadow: currentSort === 'Frequency' ? '0 var(--space-1px) var(--space-2px) var(--alpha-black-10)' : 'none',
            }}
          >
            Tần suất
          </button>
          <button
            type="button"
            onClick={() => onSortChange('Recency')}
            style={{
              background: currentSort === 'Recency' ? 'var(--palette-white)' : 'transparent',
              color: currentSort === 'Recency' ? 'var(--palette-blue-25)' : 'var(--palette-blue-47)',
              border: 'none',
              borderRadius: 'var(--radius-4)',
              padding: 'var(--space-4px) var(--space-10px)',
              fontSize: 'var(--font-size-0p72rem)',
              fontWeight: currentSort === 'Recency' ? 700 : 500,
              cursor: 'pointer',
              boxShadow: currentSort === 'Recency' ? '0 var(--space-1px) var(--space-2px) var(--alpha-black-10)' : 'none',
            }}
          >
            Gần đây nhất
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-0p5rem)' }}>
        {collaboration.topPairs.length > 0 ? (
          collaboration.topPairs.map((pair, idx) => (
            <div
              key={`${pair.agencyId}-${pair.providerId}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 'var(--space-0p65rem) var(--space-0p85rem)',
                borderRadius: 'var(--radius-sm)',
                background: idx < 3 ? 'var(--palette-gray-98-2)' : 'var(--palette-white)',
                border: 'var(--border-width-1) solid var(--palette-gray-96-5)',
                fontSize: 'var(--font-size-0p78rem)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-0p65rem)' }}>
                <span
                  style={{
                    background: idx === 0 ? 'var(--palette-amber-89)' : idx === 1 ? 'var(--palette-blue-91)' : idx === 2 ? 'var(--palette-orange-92)' : 'var(--palette-gray-98-2)',
                    color: idx === 0 ? 'var(--palette-orange-37)' : idx === 1 ? 'var(--palette-blue-35)' : idx === 2 ? 'var(--palette-orange-40)' : 'var(--palette-blue-47)',
                    fontWeight: 800,
                    width: '22px',
                    height: '22px',
                    borderRadius: 'var(--radius-50pct)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 'var(--font-size-0p7rem)',
                  }}
                >
                  {idx + 1}
                </span>

                <div>
                  <div style={{ fontWeight: 700, color: 'var(--palette-blue-25)' }}>
                    {pair.agencyName}
                  </div>
                  <div style={{ color: 'var(--palette-orange-43)', fontSize: 'var(--font-size-0p72rem)', fontWeight: 600 }}>
                    ↔ {pair.providerName}
                  </div>
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontWeight: 800, color: 'var(--palette-blue-11)', fontSize: 'var(--font-size-0p9rem)' }}>
                  {pair.bookingCount}
                </span>
                <span style={{ fontSize: 'var(--font-size-0p65rem)', color: 'var(--palette-blue-47)', marginLeft: 'var(--space-3px)' }}>
                  lần hợp tác
                </span>
                <div style={{ fontSize: 'var(--font-size-0p65rem)', color: 'var(--palette-blue-65)' }}>
                  Gần nhất: {new Date(pair.lastDate).toLocaleDateString('vi-VN')}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-1p5rem)', color: 'var(--palette-blue-65)', fontSize: 'var(--font-size-0p75rem)' }}>
            Chưa có lượt hợp tác nào trong phạm vi báo cáo.
          </div>
        )}
      </div>
    </div>
  )
}
