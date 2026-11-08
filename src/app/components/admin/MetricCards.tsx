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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 'var(--space-16)', marginBottom: 'var(--space-24)' }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              background: 'var(--palette-white)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-24)',
              border: 'var(--border-width-1) solid var(--palette-gray-90)',
              borderRadius: '12px',
              padding: 'var(--space-24)',
              border: 'var(--space-1) solid var(--palette-gray-90)',
              minHeight: 'var(--space-110)',
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
        gap: 'var(--space-16)',
        marginBottom: 'var(--space-24)',
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
              background: 'var(--palette-white)',
              borderRadius: 'var(--radius-md)',
              padding: 'var(--space-22) var(--space-24)',
              border: 'var(--border-width-1) solid var(--palette-gray-90)',
              borderRadius: '12px',
              padding: 'var(--space-22) var(--space-24)',
              border: 'var(--space-1) solid var(--palette-gray-90)',
              boxShadow: '0 var(--space-1) var(--space-2) var(--alpha-black-3)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            {/* Card Label */}
            <div
              style={{
                fontSize: 'var(--font-size-0p68rem)',
                fontWeight: 600,
                color: 'var(--palette-gray-46)',
                letterSpacing: '0.08em',
                fontFamily: 'monospace, sans-serif',
              }}
            >
              {formatCardLabel(card.label)}
            </div>

            {/* Value & Trend */}
            <div style={{ marginTop: 'var(--space-12)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span
                style={{
                  fontSize: 'var(--font-size-2p25rem)',
                  fontWeight: 700,
                  color: 'var(--palette-gray-4)',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                }}
              >
                {card.value.toLocaleString()}
              </span>

              {card.trendPct != null && (
                <span
                  style={{
                    fontSize: 'var(--font-size-0p72rem)',
                    fontWeight: 600,
                    color: isUp ? 'var(--palette-green-36)' : isDown ? 'var(--palette-red-51)' : 'var(--palette-gray-46)',
                    background: isUp ? 'var(--palette-green-97)' : isDown ? 'var(--palette-red-97)' : 'var(--palette-gray-96)',
                    padding: 'var(--space-2) var(--space-6)',
                    borderRadius: 'var(--radius-4)',
                    borderRadius: 'var(--space-4)',
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
