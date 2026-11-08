'use client'

import React, { useState } from 'react'
import { BookingRecord } from '@/lib/adm/types'

interface BookingTableProps {
  bookings: BookingRecord[]
}

export function BookingTable({ bookings }: BookingTableProps) {
  const [sortField, setSortField] = useState<'date' | 'price' | 'status'>('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const handleSort = (field: 'date' | 'price' | 'status') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const sortedBookings = [...bookings].sort((a, b) => {
    let comparison = 0
    if (sortField === 'date') {
      comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
    } else if (sortField === 'price') {
      comparison = a.price - b.price
    } else if (sortField === 'status') {
      comparison = a.status.localeCompare(b.status)
    }
    return sortOrder === 'desc' ? -comparison : comparison
  })

  const getStatusBadge = (status: string) => {
    let bg = 'var(--palette-gray-96-5)'
    let color = 'var(--palette-blue-35)'

    if (status === 'Booked') {
      bg = 'var(--palette-blue-93)'
      color = 'var(--palette-blue-48)'
    } else if (status === 'Completed') {
      bg = 'var(--palette-green-93)'
      color = 'var(--palette-green-29)'
    } else if (status === 'On hold') {
      bg = 'var(--palette-amber-89)'
      color = 'var(--palette-orange-37)'
    } else if (status === 'Cancelled') {
      bg = 'var(--palette-red-94)'
      color = 'var(--palette-red-42)'
    }

    return (
      <span
        style={{
          background: bg,
          color,
          padding: 'var(--space-2) var(--space-8)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-0p7rem)',
          fontWeight: 700,
          textTransform: 'uppercase',
        }}
      >
        {status}
      </span>
    )
  }

  return (
    <div
      style={{
        background: 'var(--palette-white)',
        borderRadius: 'var(--radius-10)',
        padding: 'var(--space-1p25rem)',
        border: 'var(--border-width-1) solid var(--palette-blue-91)',
        boxShadow: '0 var(--space-1) var(--space-3) var(--alpha-black-5)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-1rem)' }}>
        <div>
          <h3 style={{ fontSize: 'var(--font-size-0p9rem)', fontWeight: 700, color: 'var(--palette-blue-17)', display: 'flex', alignItems: 'center', gap: 'var(--space-0p4rem)', margin: 0 }}>
            <span>📋</span> GIÁM SÁT BOOKING (READ-ONLY)
          </h3>
          <span style={{ fontSize: 'var(--font-size-0p72rem)', color: 'var(--palette-blue-47)' }}>
            Hiển thị danh sách booking theo bộ lọc và quyền hạn quản trị (BR-006, BR-013)
          </span>
        </div>
        <span style={{ fontSize: 'var(--font-size-0p75rem)', fontWeight: 600, color: 'var(--palette-blue-11)', background: 'var(--palette-gray-96-5)', padding: 'var(--space-3) var(--space-8)', borderRadius: 'var(--radius-4)' }}>
          {bookings.length} bản ghi
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-0p78rem)' }}>
          <thead>
            <tr style={{ background: 'var(--palette-gray-98-2)', borderBottom: 'var(--border-width-2) solid var(--palette-blue-91)', textAlign: 'left', color: 'var(--palette-blue-35)' }}>
              <th
                onClick={() => handleSort('date')}
                style={{ padding: 'var(--space-8) var(--space-10)', cursor: 'pointer', fontWeight: 700 }}
              >
                NGÀY {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: 'var(--space-8) var(--space-10)', fontWeight: 700 }}>TOUR AGENCY</th>
              <th style={{ padding: 'var(--space-8) var(--space-10)', fontWeight: 700 }}>XƯỞNG THỦ CÔNG</th>
              <th style={{ padding: 'var(--space-8) var(--space-10)', fontWeight: 700 }}>TRẢI NGHIỆM</th>
              <th
                onClick={() => handleSort('status')}
                style={{ padding: 'var(--space-8) var(--space-10)', cursor: 'pointer', fontWeight: 700 }}
              >
                TRẠNG THÁI {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('price')}
                style={{ padding: 'var(--space-8) var(--space-10)', cursor: 'pointer', fontWeight: 700, textAlign: 'right' }}
              >
                GIÁ TRỊ (VNĐ) {sortField === 'price' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedBookings.length > 0 ? (
              sortedBookings.map((b, i) => (
                <tr
                  key={b.bookingId || i}
                  style={{
                    borderBottom: 'var(--border-width-1) solid var(--palette-gray-96-5)',
                    background: i % 2 === 0 ? 'var(--palette-white)' : 'var(--palette-gray-98)',
                  }}
                >
                  <td style={{ padding: 'var(--space-10)', color: 'var(--palette-blue-47)', whiteSpace: 'nowrap' }}>
                    {new Date(b.date).toLocaleDateString('vi-VN')}
                  </td>
                  <td style={{ padding: 'var(--space-10)', fontWeight: 600, color: 'var(--palette-blue-25)' }}>
                    {b.agencyName}
                  </td>
                  <td style={{ padding: 'var(--space-10)', fontWeight: 600, color: 'var(--palette-orange-43)' }}>
                    {b.providerName}
                  </td>
                  <td style={{ padding: 'var(--space-10)', color: 'var(--palette-blue-27)' }}>
                    {b.experienceName}
                  </td>
                  <td style={{ padding: 'var(--space-10)' }}>
                    {getStatusBadge(b.status)}
                  </td>
                  <td style={{ padding: 'var(--space-10)', textAlign: 'right', fontWeight: 700, color: 'var(--palette-blue-11)' }}>
                    {b.price.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-2rem)', color: 'var(--palette-blue-65)' }}>
                  Không tìm thấy bản ghi booking nào phù hợp với bộ lọc hiện tại.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
