'use client'

import React, { useState } from 'react'

export interface PendingAccountItem {
  id: string
  name: string
  organization: string
  role: 'PROVIDER' | 'AGENCY'
  submissionDate: string
  villageId?: string
  initials: string
}

interface PendingVerificationPanelProps {
  villageId?: string | null
  onOpenNotice?: (msg: string) => void
}

// Canonical pending accounts based on seed catalog
const SEED_PENDING_ACCOUNTS: PendingAccountItem[] = [
  {
    id: 'prov-pending-1',
    name: 'Nguyen Thi Lan',
    organization: 'Bat Trang Pottery Cooperative',
    role: 'PROVIDER',
    submissionDate: '2026-09-18',
    villageId: '20896522-6235-5699-aeaf-f48b8150d895', // Bat Trang
    initials: 'NT',
  },
  {
    id: 'agency-pending-1',
    name: 'Tran Van Minh',
    organization: 'Lang Son Heritage Tours',
    role: 'AGENCY',
    submissionDate: '2026-09-17',
    villageId: undefined,
    initials: 'TV',
  },
  {
    id: 'prov-pending-2',
    name: 'Pham Duc Anh',
    organization: 'Van Phuc Silk Village',
    role: 'PROVIDER',
    submissionDate: '2026-09-16',
    villageId: 'c0d0d95f-d59c-5c35-946a-f397e380dd14', // Van Phuc
    initials: 'PD',
  },
]

export function PendingVerificationPanel({
  villageId,
  onOpenNotice,
}: PendingVerificationPanelProps) {
  const [selectedItem, setSelectedItem] = useState<PendingAccountItem | null>(null)

  // Scope filter: if scoped to a village (e.g. UBND Bát Tràng), show accounts relevant to that village
  const visibleAccounts = villageId
    ? SEED_PENDING_ACCOUNTS.filter(a => a.villageId === villageId || a.role === 'AGENCY')
    : SEED_PENDING_ACCOUNTS

  const countText = `${visibleAccounts.length} ${visibleAccounts.length === 1 ? 'account' : 'accounts'} awaiting review`

  const handleAction = (item: PendingAccountItem, actionType: 'View' | 'Verify') => {
    const msg =
      actionType === 'Verify'
        ? `Verification decisions for ${item.name} (${item.role}) belong to Screen VER146 (Module AUT / PRF). As specified in BR-006, the Admin Dashboard is strictly read-only and does not perform profile mutations.`
        : `Viewing submitted profile for ${item.name} opens Screen VER146 / ADM118 in a separate window. Current screen ADM079 provides operational monitoring overview.`
    if (onOpenNotice) {
      onOpenNotice(msg)
    } else {
      setSelectedItem(item)
    }
  }

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
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h3
              style={{
                fontSize: '1.125rem',
                fontWeight: 700,
                color: '#09090b',
                margin: 0,
                letterSpacing: '-0.01em',
              }}
            >
              Pending Verification
            </h3>
            <p
              style={{
                fontSize: '0.78rem',
                color: '#71717a',
                fontFamily: 'monospace, sans-serif',
                margin: '4px 0 0 0',
              }}
            >
              {countText}
            </p>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid #d4d4d8',
              background: '#f4f4f5',
              color: '#52525b',
              fontSize: '0.68rem',
              fontWeight: 600,
              letterSpacing: '0.06em',
              padding: '4px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
            }}
          >
            ACTION REQUIRED
          </span>
        </div>

        {/* Account Rows */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {visibleAccounts.length === 0 ? (
            <div style={{ padding: '28px 0', textAlign: 'center', color: '#71717a', fontSize: '0.82rem' }}>
              No accounts awaiting verification in this scope.
            </div>
          ) : (
            visibleAccounts.map((acc, idx) => (
              <div
                key={acc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 0',
                  borderTop: idx > 0 ? '1px solid #f4f4f5' : 'none',
                  gap: '12px',
                }}
              >
                {/* Left: Initials + Name + Org */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      background: '#f4f4f5',
                      color: '#52525b',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {acc.initials}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        color: '#09090b',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {acc.name}
                    </div>
                    <div
                      style={{
                        fontSize: '0.74rem',
                        color: '#71717a',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {acc.organization}
                    </div>
                  </div>
                </div>

                {/* Middle: Role Badge + Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span
                    style={{
                      border: '1px solid #e4e4e7',
                      background: '#fafafa',
                      color: '#52525b',
                      fontSize: '0.68rem',
                      fontWeight: 600,
                      letterSpacing: '0.04em',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontFamily: 'monospace, sans-serif',
                    }}
                  >
                    {acc.role}
                  </span>

                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#71717a',
                      fontFamily: 'monospace, sans-serif',
                    }}
                  >
                    {acc.submissionDate}
                  </span>
                </div>

                {/* Right: Actions View / Verify */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <button
                    type="button"
                    onClick={() => handleAction(acc, 'View')}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e4e4e7',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#09090b',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = '#f4f4f5'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = '#ffffff'
                    }}
                  >
                    View
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAction(acc, 'Verify')}
                    style={{
                      background: '#09090b',
                      border: '1px solid #09090b',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      color: '#ffffff',
                      cursor: 'pointer',
                      transition: 'opacity 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.opacity = '0.85'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.opacity = '1'
                    }}
                  >
                    Verify
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
