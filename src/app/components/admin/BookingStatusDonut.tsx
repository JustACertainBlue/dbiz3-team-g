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
        return '#18181b' // Black
      case 'Booked':
        return '#52525b' // Dark gray
      case 'Cancelled':
      case 'Canceled':
        return '#a1a1aa' // Medium gray
      case 'On hold':
      case 'On Hold':
        return '#e4e4e7' // Light gray
      default:
        return '#71717a'
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
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e4e4e7',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: '16px' }}>
        <h3
          style={{
            fontSize: '1.125rem',
            fontWeight: 700,
            color: '#09090b',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          Booking Status
        </h3>
        <p
          style={{
            fontSize: '0.78rem',
            color: '#71717a',
            fontFamily: 'monospace, sans-serif',
            margin: '4px 0 0 0',
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
          padding: '12px 0 20px 0',
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
              stroke="#f4f4f5"
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
                  stroke={seg.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={seg.strokeDasharray}
                  strokeDashoffset={seg.strokeDashoffset}
                  transform={`rotate(-90 ${center} ${center})`}
                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
              ))}

            {/* Center Total Text */}
            <text
              x={center}
              y={center - 4}
              textAnchor="middle"
              fill="#71717a"
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
              fill="#09090b"
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '8px' }}>
        {sortedData.map(item => {
          const displayName = item.status === 'Cancelled' ? 'Canceled' : item.status === 'On hold' ? 'On Hold' : item.status
          return (
            <div
              key={item.status}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '0.8rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: getStatusColor(item.status),
                    display: 'inline-block',
                  }}
                />
                <span style={{ color: '#09090b', fontWeight: 500 }}>{displayName}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontWeight: 600, color: '#09090b', minWidth: '40px', textAlign: 'right' }}>
                  {item.count.toLocaleString()}
                </span>
                <span style={{ color: '#71717a', fontSize: '0.74rem', minWidth: '32px', textAlign: 'right' }}>
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
