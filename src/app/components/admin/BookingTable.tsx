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
    let bg = '#f1f5f9'
    let color = '#475569'

    if (status === 'Booked') {
      bg = '#dbeafe'
      color = '#1d4ed8'
    } else if (status === 'Completed') {
      bg = '#dcfce7'
      color = '#15803d'
    } else if (status === 'On hold') {
      bg = '#fef3c7'
      color = '#b45309'
    } else if (status === 'Cancelled') {
      bg = '#fee2e2'
      color = '#b91c1c'
    }

    return (
      <span
        style={{
          background: bg,
          color,
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '0.7rem',
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
        background: '#ffffff',
        borderRadius: '10px',
        padding: '1.25rem',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
            <span>📋</span> GIÁM SÁT BOOKING (READ-ONLY)
          </h3>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            Hiển thị danh sách booking theo bộ lọc và quyền hạn quản trị (BR-006, BR-013)
          </span>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#0f172a', background: '#f1f5f9', padding: '3px 8px', borderRadius: '4px' }}>
          {bookings.length} bản ghi
        </span>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', textAlign: 'left', color: '#475569' }}>
              <th
                onClick={() => handleSort('date')}
                style={{ padding: '8px 10px', cursor: 'pointer', fontWeight: 700 }}
              >
                NGÀY {sortField === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th style={{ padding: '8px 10px', fontWeight: 700 }}>TOUR AGENCY</th>
              <th style={{ padding: '8px 10px', fontWeight: 700 }}>XƯỞNG THỦ CÔNG</th>
              <th style={{ padding: '8px 10px', fontWeight: 700 }}>TRẢI NGHIỆM</th>
              <th
                onClick={() => handleSort('status')}
                style={{ padding: '8px 10px', cursor: 'pointer', fontWeight: 700 }}
              >
                TRẠNG THÁI {sortField === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
              </th>
              <th
                onClick={() => handleSort('price')}
                style={{ padding: '8px 10px', cursor: 'pointer', fontWeight: 700, textAlign: 'right' }}
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
                    borderBottom: '1px solid #f1f5f9',
                    background: i % 2 === 0 ? '#ffffff' : '#fafafa',
                  }}
                >
                  <td style={{ padding: '10px', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(b.date).toLocaleDateString('vi-VN')}
                  </td>
                  <td style={{ padding: '10px', fontWeight: 600, color: '#1e3a5f' }}>
                    {b.agencyName}
                  </td>
                  <td style={{ padding: '10px', fontWeight: 600, color: '#b84c24' }}>
                    {b.providerName}
                  </td>
                  <td style={{ padding: '10px', color: '#334155' }}>
                    {b.experienceName}
                  </td>
                  <td style={{ padding: '10px' }}>
                    {getStatusBadge(b.status)}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>
                    {b.price.toLocaleString('vi-VN')} đ
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
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
