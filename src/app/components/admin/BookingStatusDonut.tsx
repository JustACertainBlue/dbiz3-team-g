'use client'

import React from 'react'
import { BookingMetrics } from '@/lib/adm/types'
import { statusBreakdown } from '@/lib/adm/dashboard-view'
import StatusBadge from '@/app/components/StatusBadge'

interface BookingStatusDonutProps {
  bookingMetrics: BookingMetrics
}

// FR-009 (1): status breakdown with counts + percentages as a stacked bar (the spec allows stacked bar or donut).
// Design wave 4 (Figma "Màn 5" "Booking theo trạng thái"): status badge, bar, count per row.
export function BookingStatusDonut({ bookingMetrics }: BookingStatusDonutProps) {
  const { total, rows } = statusBreakdown(bookingMetrics.statusChartData || [])
  return (
    <section className="ad9-panel ad9-glass" aria-labelledby="ad9-status-title">
      <header className="ad9-panel__head"><h2 id="ad9-status-title">Đặt chỗ theo trạng thái</h2><span>{total.toLocaleString('vi-VN')} đặt chỗ</span></header>
      <div className="ad9-stack" role="img" aria-label={rows.map(row => `${row.status}: ${row.count} (${row.pct}%)`).join(', ')}>
        {rows.filter(row => row.share > 0).map(row => <span key={row.status} className={`ad9-stack__seg ad9-seg--${row.status.replace(' ', '').toLowerCase()}`} style={{ width: `${row.share}%` }} />)}
      </div>
      <ul className="ad9-status-rows">
        {rows.map(row => (
          <li key={row.status}>
            <StatusBadge family="booking" status={row.status} />
            <span className="ad9-bar" aria-hidden="true"><span className={`ad9-bar__fill ad9-seg--${row.status.replace(' ', '').toLowerCase()}`} style={{ width: `${row.share}%` }} /></span>
            <strong>{row.count.toLocaleString('vi-VN')}</strong>
            <span className="ad9-muted">{row.pct}%</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
