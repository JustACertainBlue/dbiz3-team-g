'use client'

import React from 'react'
import { MetricCard } from '@/lib/adm/types'
import { metricLabel } from '@/lib/adm/dashboard-view'

interface MetricCardsProps {
  cards: MetricCard[]
  loading?: boolean
}

// FR-003 / SR-004: exactly the four cards the API returns; the optional trend only when it exists (BR-011).
// Design wave 4 (Figma "Màn 5"): glass cards, label + large number.
export function MetricCards({ cards, loading }: MetricCardsProps) {
  if (loading) {
    return <div className="ad9-cards" aria-busy="true">{[1, 2, 3, 4].map(i => <div key={i} className="ad9-card ad9-glass is-loading" />)}</div>
  }
  return (
    <div className="ad9-cards">
      {cards.map(card => {
        const direction = card.trendDirection === 'Up' ? 'up' : card.trendDirection === 'Down' ? 'down' : 'flat'
        const symbol = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
        return (
          <div key={card.label} className="ad9-card ad9-glass">
            <span className="ad9-card__label">{metricLabel(card.label)}</span>
            <span className="ad9-card__row">
              <strong className="ad9-card__value">{card.value.toLocaleString('vi-VN')}</strong>
              {card.trendPct != null && <span className={`ad9-trend ad9-trend--${direction}`} title={card.subLabel}>{symbol} {Math.abs(card.trendPct)}%</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}
