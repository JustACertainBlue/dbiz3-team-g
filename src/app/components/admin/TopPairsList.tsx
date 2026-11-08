'use client'

import React from 'react'
import { CollaborationMetrics, CollaborationSortBy } from '@/lib/adm/types'
import { hanoiDate } from '@/lib/time/hanoi-time'

interface TopPairsListProps {
  collaboration: CollaborationMetrics
  onSortChange: (sortBy: CollaborationSortBy) => void
}

const dmy = (value: string) => { const date = hanoiDate(value); return date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : '' }

// FR-010: top 10 Agency–Provider pairs, sort Frequency / Recency; only Booked and Completed count (BR-018).
// Read-only, no drill-down links (BR-012 / BR-013). Design wave 4 (Figma "Màn 5" "Top 10 cặp hợp tác").
export function TopPairsList({ collaboration, onSortChange }: TopPairsListProps) {
  const currentSort = collaboration.sortBy || 'Frequency'
  const toggle = (value: CollaborationSortBy, label: string) => (
    <button type="button" aria-pressed={currentSort === value} className={currentSort === value ? 'ad9-seg is-on' : 'ad9-seg'} onClick={() => onSortChange(value)}>{label}</button>
  )
  return (
    <section className="ad9-panel ad9-glass" aria-labelledby="ad9-pairs-title">
      <header className="ad9-panel__head">
        <div><h2 id="ad9-pairs-title">Top 10 cặp hợp tác (Agency – Xưởng)</h2><span>Chỉ tính đặt chỗ Đã đặt và Hoàn tất</span></div>
        <div className="ad9-segs" role="group" aria-label="Sắp xếp">{toggle('Frequency', 'Tần suất')}{toggle('Recency', 'Gần đây nhất')}</div>
      </header>
      {collaboration.topPairs.length === 0
        ? <p className="ad9-empty">Chưa có lượt hợp tác nào trong phạm vi báo cáo.</p>
        : <div className="ad9-table-wrap"><table className="ad9-table">
          <thead><tr><th>#</th><th>Agency</th><th>Xưởng</th><th className="is-end">Đặt chỗ</th><th className="is-end">Gần nhất</th></tr></thead>
          <tbody>{collaboration.topPairs.map((pair, idx) => (
            <tr key={`${pair.agencyId}-${pair.providerId}`}>
              <td className="ad9-num">{idx + 1}</td>
              <td>{pair.agencyName}</td>
              <td>{pair.providerName}</td>
              <td className="ad9-num is-end">{pair.bookingCount}</td>
              <td className="ad9-num is-end">{dmy(pair.lastDate)}</td>
            </tr>
          ))}</tbody>
        </table></div>}
    </section>
  )
}
