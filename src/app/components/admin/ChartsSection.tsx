'use client'

import React from 'react'
import { AgencyMetrics, ProviderMetrics, BookingMetrics, TrendGranularity } from '@/lib/adm/types'
import { statusLabel } from '@/lib/status-labels'
import { trendLine, trendTitle } from '@/lib/adm/dashboard-view'

interface ChartsSectionProps {
  agencyMetrics: AgencyMetrics
  providerMetrics: ProviderMetrics
  bookingMetrics: BookingMetrics
  granularity?: TrendGranularity
}

const BOX = { width: 1040, height: 220, pad: 28 }

// FR-009 (2): booking trend as a line, granularity from the date range (BR-019); FR-007 / FR-008 panels.
// Design wave 4 (Figma "Màn 5"): glass panels; the line uses the brand colour.
export function ChartsSection({ agencyMetrics, providerMetrics, bookingMetrics, granularity = 'Daily' }: ChartsSectionProps) {
  const series = bookingMetrics.trendChartData || []
  const line = trendLine(series, granularity, BOX)
  const every = Math.max(1, Math.ceil(series.length / 12))
  return (
    <>
      <section className="ad9-panel ad9-glass" aria-labelledby="ad9-trend-title">
        <header className="ad9-panel__head"><h2 id="ad9-trend-title">{trendTitle(granularity)}</h2><span>Độ chi tiết theo khoảng thời gian đã chọn</span></header>
        {series.length === 0
          ? <p className="ad9-empty">Không có dữ liệu xu hướng đặt chỗ trong khoảng thời gian này.</p>
          : <svg className="ad9-line" viewBox={`0 0 ${BOX.width} ${BOX.height + 24}`} role="img" aria-label={`${trendTitle(granularity)}: ${line.points.map(point => `${point.label} ${point.count}`).join(', ')}`}>
            <line x1={BOX.pad} x2={BOX.width - BOX.pad} y1={BOX.height - BOX.pad} y2={BOX.height - BOX.pad} className="ad9-line__axis" />
            <path d={line.path} className="ad9-line__line" />
            {line.points.map((point, index) => <g key={index}>
              <circle cx={point.x} cy={point.y} r={4} className="ad9-line__dot" />
              {(index % every === 0 || index === line.points.length - 1) && <>
                <text x={point.x} y={point.y - 10} textAnchor="middle" className="ad9-line__value">{point.count}</text>
                <text x={point.x} y={BOX.height + 4} textAnchor="middle" className="ad9-line__label">{point.label}</text>
              </>}
            </g>)}
          </svg>}
      </section>

      <div className="ad9-grid-2">
        <section className="ad9-panel ad9-glass" aria-labelledby="ad9-agency-title">
          <header className="ad9-panel__head"><h2 id="ad9-agency-title">Trạng thái tài khoản Agency</h2><span>{agencyMetrics.activeAgencyCount} đang hoạt động</span></header>
          <dl className="ad9-rows">{agencyMetrics.statusChartData.map(item => <div key={item.status}>
            <dt>{statusLabel('agency', item.status)}</dt><dd>{item.count} <span className="ad9-muted">({item.pct}%)</span></dd>
          </div>)}</dl>
        </section>
        <section className="ad9-panel ad9-glass" aria-labelledby="ad9-provider-title">
          <header className="ad9-panel__head"><h2 id="ad9-provider-title">Xưởng đã xác minh theo làng</h2><span>{providerMetrics.activeProviderCount} đang hoạt động</span></header>
          <dl className="ad9-rows">{providerMetrics.countsByVillageAndStatus.map(item => <div key={item.villageId}>
            <dt>{item.villageName}</dt><dd>{statusLabel('provider', 'Verified')}: {item.verificationStatus?.Verified || 0}</dd>
          </div>)}</dl>
        </section>
      </div>
    </>
  )
}
