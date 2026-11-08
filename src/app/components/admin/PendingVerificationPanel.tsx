'use client'

import React from 'react'
import type { PendingVerificationItem } from '@/lib/adm/pending-service'
import { hanoiDate } from '@/lib/time/hanoi-time'

interface PendingVerificationPanelProps {
  items: PendingVerificationItem[]
}

// A6: read-only list of accounts awaiting review, from the shared runtime (no View/Verify actions, BR-012).
// Design wave 4: glass panel. The English texts stay until their test expectations are approved for change.
export function PendingVerificationPanel({ items }: PendingVerificationPanelProps) {
  const countText = `${items.length} ${items.length === 1 ? 'account' : 'accounts'} awaiting review`
  return (
    <section className="ad9-panel ad9-glass" aria-labelledby="ad9-pending-title">
      <header className="ad9-panel__head"><h2 id="ad9-pending-title">Pending Verification</h2><span>{countText}</span></header>
      {items.length === 0
        ? <p className="ad9-empty">No accounts awaiting review</p>
        : <ul className="ad9-list">{items.map(item => (
          <li key={`${item.kind}:${item.id}`}>
            <strong>{item.name}</strong>
            <span className="ad9-chip">{item.kind}</span>
            <time className="ad9-muted">{hanoiDate(item.submittedAt)}</time>
          </li>
        ))}</ul>}
    </section>
  )
}
