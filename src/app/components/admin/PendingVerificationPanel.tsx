'use client'

import React from 'react'
import type { PendingVerificationItem } from '@/lib/adm/pending-service'

interface PendingVerificationPanelProps {
  items: PendingVerificationItem[]
}

// A6: read-only list of accounts awaiting review, from the shared runtime (no View/Verify actions, BR-012).
export function PendingVerificationPanel({ items }: PendingVerificationPanelProps) {
  const countText = `${items.length} ${items.length === 1 ? 'account' : 'accounts'} awaiting review`

  return (
    <div
      style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e4e4e7',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#09090b', margin: 0, letterSpacing: '-0.01em' }}>
        Pending Verification
      </h3>
      <p style={{ fontSize: '0.78rem', color: '#71717a', fontFamily: 'monospace, sans-serif', margin: '4px 0 16px 0' }}>
        {countText}
      </p>

      {items.length === 0 ? (
        <div style={{ padding: '28px 0', textAlign: 'center', color: '#71717a', fontSize: '0.82rem' }}>
          No accounts awaiting review
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map(item => (
            <div
              key={`${item.kind}:${item.id}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid #f4f4f5' }}
            >
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#18181b' }}>{item.name}</span>
              <span style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#52525b', border: '1px solid #e4e4e7', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                  {item.kind}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#71717a', fontFamily: 'monospace, sans-serif' }}>
                  {item.submittedAt.slice(0, 10)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
