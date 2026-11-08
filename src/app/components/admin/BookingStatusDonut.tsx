'use client'

import React from 'react'
import { BookingMetrics } from '@/lib/adm/types'

interface BookingStatusDonutProps {
  bookingMetrics: BookingMetrics
}

export function BookingStatusDonut({ bookingMetrics }: BookingStatusDonutProps) {
  const chartData = bookingMetrics.statusChartData || []
  const totalBookings = chartData.reduce((acc, curr) => acc + curr.count, 0)

  // Canonical colors matching ADM079.png mockup
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'var(--color-status-completed)' // Black
      case 'Booked':
        return 'var(--color-status-booked)' // Dark gray
      case 'Cancelled':
      case 'Canceled':
        return 'var(--color-status-cancelled)' // Medium gray
      case 'On hold':
      case 'On Hold':
        return 'var(--color-status-on-hold)' // Light gray
        return 'var(--palette-gray-10)' // Black
      case 'Booked':
        return 'var(--palette-gray-34)' // Dark gray
      case 'Cancelled':
      case 'Canceled':
        return 'var(--palette-gray-65)' // Medium gray
      case 'On hold':
      case 'On Hold':
        return 'var(--palette-gray-90)' // Light gray
      default:
        return 'var(--palette-gray-46)'
    }
  }

  // Pre-sort or ensure display order matching mockup: Completed, Booked, Canceled, On Hold
  const order = ['Completed', 'Booked', 'Cancelled', 'On hold']
  const sortedData = [...chartData].sort((a, b) => {
    const ai = order.indexOf(a.status)
    const bi = order.indexOf(b.status)
    return (ai >= 0 ? ai : 99) - (bi >= 0 ? bi : 99)
  })

  // SVG Donut calculation
  const size = 180
  const center = size / 2
  const strokeWidth = 26
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  // Compute stroke dashes for each segment
  let accumulatedOffset = 0
  const segments = sortedData.map(item => {
    const fraction = totalBookings > 0 ? item.count / totalBookings : 0
    const dashLength = fraction * circumference
    const offset = accumulatedOffset
    accumulatedOffset += dashLength
    return {
      ...item,
      color: getStatusColor(item.status),
      strokeDasharray: `${dashLength} ${circumference - dashLength}`,
      strokeDashoffset: -offset,
    }
  })

  return (
    <div
      style={{
        background: 'var(--palette-white)',
        borderRadius: 'var(--radius-md)',
        border: 'var(--border-width-1) solid var(--palette-gray-90)',
        borderRadius: '12px',
        border: '1px solid var(--palette-gray-90)',
        padding: 'var(--space-24)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 var(--space-1) var(--space-2) var(--alpha-black-3)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 'var(--space-16)' }}>
        <h3
          style={{
            fontSize: 'var(--font-size-1p125rem)',
            fontWeight: 700,
            color: 'var(--palette-gray-4)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          Booking Status
        </h3>
        <p
          style={{
            fontSize: 'var(--font-size-0p78rem)',
            color: 'var(--palette-gray-46)',
            fontFamily: 'monospace, sans-serif',
            margin: 'var(--space-4) 0 0 0',
          }}
        >
          {totalBookings.toLocaleString()} total
        </p>
      </div>

      {/* Circular Donut Chart */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: 'var(--space-12) 0 var(--space-20) 0',
        }}
      >
        <div style={{ position: 'relative', width: `${size}px`, height: `${size}px` }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* Background empty track */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              style={{ stroke: 'var(--color-chart-track)' }}
              strokeWidth={strokeWidth}
            />

            {/* Status Segments */}
            {totalBookings > 0 &&
              segments.map((seg, idx) => (
                <circle
                  key={idx}
                  cx={center}
                  cy={center}
                  r={radius}
                  fill="transparent"
                  strokeWidth={strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  transform={`rotate(-90 ${center} ${center})`}
                  style={{ stroke: seg.color, transition: 'stroke-dasharray 0.5s ease' }}
                />
              ))}

            {/* Center Total Text */}
            <text
              x={center}
              y={center - 4}
              textAnchor="middle"
              style={{ fill: 'var(--palette-gray-46)' }}
              fontSize="10px"
              fontWeight="600"
              letterSpacing="0.08em"
            >
              TOTAL
            </text>
            <text
              x={center}
              y={center + 18}
              textAnchor="middle"
              style={{ fill: 'var(--palette-gray-4)' }}
              fontSize="20px"
              fontWeight="800"
              letterSpacing="-0.02em"
            >
              {totalBookings.toLocaleString()}
            </text>
          </svg>
        </div>
      </div>

      {/* Legend Rows matching ADM079.png */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-10)', paddingTop: 'var(--space-8)' }}>
        {sortedData.map(item => {
          const displayName = item.status === 'Cancelled' ? 'Canceled' : item.status === 'On hold' ? 'On Hold' : item.status
          return (
            <div
              key={item.status}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: 'var(--font-size-0p8rem)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-8)' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: 'var(--radius-50pct)',
                    background: getStatusColor(item.status),
                    display: 'inline-block',
                  }}
                />
                <span style={{ color: 'var(--palette-gray-4)', fontWeight: 500 }}>{displayName}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-16)' }}>
                <span style={{ fontWeight: 600, color: 'var(--palette-gray-4)', minWidth: '40px', textAlign: 'right' }}>
                  {item.count.toLocaleString()}
                </span>
                <span style={{ color: 'var(--palette-gray-46)', fontSize: 'var(--font-size-0p74rem)', minWidth: '32px', textAlign: 'right' }}>
                  {item.pct}%
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
