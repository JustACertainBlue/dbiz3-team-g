'use client'

import React, { useState } from 'react'
import { BookingRecord } from '@/lib/adm/types'
import StatusBadge from '@/app/components/StatusBadge'
import { hanoiDate } from '@/lib/time/hanoi-time'

interface BookingTableProps {
  bookings: BookingRecord[]
}

type SortField = 'date' | 'price' | 'status'
const dmy = (value: string) => { const date = hanoiDate(value); return date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : '' }

// FR-009 (3): read-only booking list with sortable columns (Date, Agency, Provider, Experience, Status, Price);
// no drill-down links (BR-012 / BR-013). Design wave 4 (Figma "Màn 5" table): beige header, row lines.
export function BookingTable({ bookings }: BookingTableProps) {
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortOrder('desc') }
  }

  const sortedBookings = [...bookings].sort((a, b) => {
    let comparison = 0
    if (sortField === 'date') comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
    else if (sortField === 'price') comparison = a.price - b.price
    else comparison = a.status.localeCompare(b.status)
    return sortOrder === 'desc' ? -comparison : comparison
  })

  const sortable = (field: SortField, label: string, align?: 'end') => (
    <th aria-sort={sortField === field ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'} className={align ? 'is-end' : undefined}>
      <button type="button" className="ad9-sort" onClick={() => handleSort(field)}>{label}{sortField === field && <span aria-hidden="true">{sortOrder === 'asc' ? ' ↑' : ' ↓'}</span>}</button>
    </th>
  )

  return (
    <section className="ad9-panel ad9-glass" aria-labelledby="ad9-bookings-title">
      <header className="ad9-panel__head"><h2 id="ad9-bookings-title">Danh sách đặt chỗ</h2><span>{bookings.length} đặt chỗ · chỉ xem</span></header>
      <div className="ad9-table-wrap">
        <table className="ad9-table">
          <thead>
            <tr>
              {sortable('date', 'Ngày')}
              <th>Agency</th>
              <th>Xưởng</th>
              <th>Trải nghiệm</th>
              {sortable('status', 'Trạng thái')}
              {sortable('price', 'Giá (VND)', 'end')}
            </tr>
          </thead>
          <tbody>
            {sortedBookings.length > 0 ? sortedBookings.map((b, i) => (
              <tr key={b.bookingId || i}>
                <td className="ad9-num">{dmy(b.date)}</td>
                <td>{b.agencyName}</td>
                <td>{b.providerName}</td>
                <td>{b.experienceName}</td>
                <td><StatusBadge family="booking" status={b.status} /></td>
                <td className="ad9-num is-end">{b.price.toLocaleString('vi-VN')} đ</td>
              </tr>
            )) : (
              <tr><td colSpan={6} className="ad9-empty">Không có đặt chỗ nào khớp bộ lọc hiện tại.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
