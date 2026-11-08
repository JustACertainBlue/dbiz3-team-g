'use client'

import React from 'react'
import Link from 'next/link'
import type { AdminType } from '@/lib/auth/session'

interface AdminSidebarProps {
  adminType: AdminType | null
  displayName?: string
  activeTab?: 'dashboard' | 'users'
  onSelectTab?: (tab: 'dashboard') => void
  onOpenNotice?: (msg: string) => void
}

export function AdminSidebar({
  adminType,
  displayName = '',
  activeTab = 'dashboard',
  onSelectTab,
  onOpenNotice,
}: AdminSidebarProps) {
  // A8: the demo identity's displayName (src/lib/auth/demo-session.ts), not an invented person
  const adminName = displayName
  const adminInitials = adminType === 'UBND' ? 'UB' : 'HD'
  const adminSub = adminType === 'UBND' ? 'UBND ADMIN' : 'HDT ADMIN'

  return (
    <aside
      style={{
        width: '240px',
        minWidth: '240px',
        background: 'var(--palette-white)',
        borderRight: 'var(--border-width-1) solid var(--palette-gray-90)',
        borderRight: '1px solid var(--palette-gray-90)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Top Branding */}
      <div>
        <div
          style={{
            padding: 'var(--space-20) var(--space-24)',
            borderBottom: 'var(--border-width-1) solid var(--palette-gray-96)',
            borderBottom: 'var(--space-1) solid var(--palette-gray-96)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-12)',
          }}
        >
          {/* 4-square logo icon */}
          <div
            style={{
              width: '32px',
              height: '32px',
              background: 'var(--palette-gray-10)',
              borderRadius: 'var(--radius-sm)',
              borderRadius: '6px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'var(--space-3)',
              padding: 'var(--space-6)',
            }}
          >
            <div style={{ background: 'var(--palette-white)', borderRadius: 'var(--radius-1p5)' }} />
            <div style={{ background: 'var(--palette-white)', borderRadius: 'var(--radius-1p5)' }} />
            <div style={{ background: 'var(--palette-white)', borderRadius: 'var(--radius-1p5)' }} />
            <div style={{ background: 'var(--palette-white)', borderRadius: 'var(--radius-1p5)' }} />
            <div style={{ background: 'var(--palette-white)', borderRadius: '1.5px' }} />
            <div style={{ background: 'var(--palette-white)', borderRadius: '1.5px' }} />
            <div style={{ background: 'var(--palette-white)', borderRadius: '1.5px' }} />
            <div style={{ background: 'var(--palette-white)', borderRadius: '1.5px' }} />
          </div>

          <div>
            <div
              style={{
                fontSize: 'var(--font-size-0p85rem)',
                fontWeight: 700,
                color: 'var(--palette-gray-4)',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}
            >
              ARTISAN BRIDGE
            </div>
            <div
              style={{
                fontSize: 'var(--font-size-0p68rem)',
                fontWeight: 600,
                color: 'var(--palette-gray-46)',
                letterSpacing: '0.08em',
              }}
            >
              ADMIN
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ padding: 'var(--space-16) var(--space-12)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Dashboard Tab */}
          <Link
            href="/admin"
            onClick={() => onSelectTab?.('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-12)',
              width: '100%',
              padding: 'var(--space-10) var(--space-14)',
              background: activeTab === 'dashboard' ? 'var(--palette-gray-10)' : 'transparent',
              color: activeTab === 'dashboard' ? 'var(--palette-white)' : 'var(--palette-gray-46)',
              textDecoration: 'none',
              borderRadius: 'var(--radius-8)',
              fontSize: 'var(--font-size-0p85rem)',
              borderRadius: 'var(--space-8)',
              fontSize: 'var(--space-0p85rem)',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s ease',
              boxSizing: 'border-box',
            }}
          >
            {/* 4-square outline icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
            <span>Dashboard</span>
          </Link>

        </nav>
      </div>

      {/* Bottom User Profile */}
      <div
        style={{
          padding: 'var(--space-16) var(--space-20)',
          borderTop: 'var(--border-width-1) solid var(--palette-gray-90)',
          borderTop: 'var(--space-1) solid var(--palette-gray-90)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-10)' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-50pct)',
              borderRadius: '50%',
              background: 'var(--palette-gray-10)',
              color: 'var(--palette-white)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: 'var(--font-size-0p78rem)',
            }}
          >
            {adminInitials}
          </div>
          <div>
            <div style={{ fontSize: 'var(--font-size-0p82rem)', fontWeight: 600, color: 'var(--palette-gray-4)', lineHeight: 1.2 }}>
              {adminName}
            </div>
            <div style={{ fontSize: 'var(--font-size-0p68rem)', fontWeight: 500, color: 'var(--palette-gray-46)', letterSpacing: '0.04em' }}>
              {adminSub}
            </div>
          </div>
        </div>

        {/* Logout action icon */}
        <button
          type="button"
          title="Sign out (AUT026)"
          onClick={() => {
            if (onOpenNotice) {
              onOpenNotice('Sign out session is managed via the top role switcher.')
            }
          }}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--palette-gray-46)',
            cursor: 'pointer',
            padding: 'var(--space-4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>
    </aside>
  )
}
