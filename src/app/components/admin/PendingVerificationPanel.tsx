'use client'

import React from 'react'
import type { PendingVerificationItem } from '@/lib/adm/pending-service'
import { hanoiDate } from '@/lib/time/hanoi-time'

interface PendingVerificationPanelProps {
  items: PendingVerificationItem[]
}

// A6: read-only list of accounts awaiting review, from the shared runtime (no View/Verify actions, BR-012).
export function PendingVerificationPanel({ items }: PendingVerificationPanelProps) {
  const countText = `${items.length} ${items.length === 1 ? 'account' : 'accounts'} awaiting review`

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
        boxShadow: '0 var(--space-1) var(--space-2) var(--alpha-black-3)',
      }}
    >
      <h3 style={{ fontSize: 'var(--font-size-1p125rem)', fontWeight: 700, color: 'var(--palette-gray-4)', margin: 0, letterSpacing: '-0.01em' }}>
        Pending Verification
      </h3>
      <p style={{ fontSize: 'var(--font-size-0p78rem)', color: 'var(--palette-gray-46)', fontFamily: 'monospace, sans-serif', margin: 'var(--space-4) 0 var(--space-16) 0' }}>
        {countText}
      </p>

      {items.length === 0 ? (
        <div style={{ padding: 'var(--space-28) 0', textAlign: 'center', color: 'var(--palette-gray-46)', fontSize: 'var(--font-size-0p82rem)' }}>
        <div style={{ padding: 'var(--space-28) 0', textAlign: 'center', color: 'var(--palette-gray-46)', fontSize: 'var(--space-0p82rem)' }}>
          No accounts awaiting review
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map(item => (
            <div
              key={`${item.kind}:${item.id}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-12) 0', borderTop: 'var(--border-width-1) solid var(--palette-gray-96)' }}
            >
              <span style={{ fontSize: 'var(--font-size-0p88rem)', fontWeight: 600, color: 'var(--palette-gray-10)' }}>{item.name}</span>
              <span style={{ display: 'flex', gap: 'var(--space-12)', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--font-size-0p68rem)', fontWeight: 600, color: 'var(--palette-gray-34)', border: 'var(--border-width-1) solid var(--palette-gray-90)', padding: 'var(--space-2) var(--space-6)', borderRadius: 'var(--radius-4)', textTransform: 'uppercase' }}>
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-12) 0', borderTop: 'var(--space-1) solid var(--palette-gray-96)' }}
            >
              <span style={{ fontSize: 'var(--font-size-0p88rem)', fontWeight: 600, color: 'var(--palette-gray-10)' }}>{item.name}</span>
              <span style={{ display: 'flex', gap: 'var(--space-12)', alignItems: 'center' }}>
                <span style={{ fontSize: 'var(--font-size-0p68rem)', fontWeight: 600, color: 'var(--palette-gray-34)', border: '1px solid var(--palette-gray-90)', padding: 'var(--space-2) var(--space-6)', borderRadius: 'var(--space-4)', textTransform: 'uppercase' }}>
                  {item.kind}
                </span>
                <span style={{ fontSize: 'var(--font-size-0p75rem)', color: 'var(--palette-gray-46)', fontFamily: 'monospace, sans-serif' }}>
                  {hanoiDate(item.submittedAt)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
