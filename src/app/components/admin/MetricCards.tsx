'use client'

import React from 'react'
import { MetricCard } from '@/lib/adm/types'

interface MetricCardsProps {
  cards: MetricCard[]
  loading?: boolean
}

export function MetricCards({ cards, loading }: MetricCardsProps) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '24px',
              border: '1px solid #e4e4e7',
              minHeight: '110px',
              opacity: 0.6,
            }}
          />
        ))}
      </div>
    )
  }

  // Format label to uppercase tracking matching ADM079.png
  const formatCardLabel = (label: string) => {
    switch (label) {
      case 'Total Agencies':
        return 'TOUR AGENCIES'
      case 'Total Providers':
        return 'LOCAL PROVIDERS'
      case 'Total Bookings':
        return 'TOTAL BOOKINGS'
      case 'Active Collaborations':
        return 'ACTIVE COLLABORATIONS'
      default:
        return label.toUpperCase()
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px',
      }}
    >
      {cards.map((card, idx) => {
        const isUp = card.trendDirection === 'Up'
        const isDown = card.trendDirection === 'Down'
        const trendSymbol = isUp ? '↑' : isDown ? '↓' : '→'

        return (
          <div
            key={idx}
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              padding: '22px 24px',
              border: '1px solid #e4e4e7',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* Card Label */}
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                color: '#71717a',
                letterSpacing: '0.08em',
                fontFamily: 'monospace, sans-serif',
              }}
            >
              {formatCardLabel(card.label)}
            </div>

            {/* Value & Trend */}
            <div style={{ marginTop: '12px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: '2.25rem',
                  fontWeight: 700,
                  color: '#09090b',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {card.value.toLocaleString()}
              </span>

              {card.trendPct != null && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: isUp ? '#16a34a' : isDown ? '#dc2626' : '#71717a',
                    background: isUp ? '#f0fdf4' : isDown ? '#fef2f2' : '#f4f4f5',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                  title={card.subLabel}
                >
                  {trendSymbol} {Math.abs(card.trendPct)}%
                </span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
