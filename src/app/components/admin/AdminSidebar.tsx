'use client'

import React from 'react'
import Link from 'next/link'
import { CurrentUserRole } from '@/lib/prf/client-session'

interface AdminSidebarProps {
  currentRole: CurrentUserRole
  activeTab?: 'dashboard' | 'users'
  onSelectTab?: (tab: 'dashboard' | 'users') => void
  onOpenNotice?: (msg: string) => void
}

export function AdminSidebar({
  currentRole,
  activeTab = 'dashboard',
  onSelectTab,
  onOpenNotice,
}: AdminSidebarProps) {
  const adminName = currentRole === 'UBND' ? 'Nguyen Van Canh' : 'Vo Minh Khoa'
  const adminInitials = currentRole === 'UBND' ? 'NC' : 'VK'
  const adminSub = currentRole === 'UBND' ? 'UBND ADMIN' : 'ADMIN'

  return (
    <aside
      style={{
        width: '240px',
        minWidth: '240px',
        background: '#ffffff',
        borderRight: '1px solid #e4e4e7',
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
            padding: '20px 24px',
            borderBottom: '1px solid #f4f4f5',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          {/* 4-square logo icon */}
          <div
            style={{
              width: '32px',
              height: '32px',
              background: '#18181b',
              borderRadius: '6px',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '3px',
              padding: '6px',
            }}
          >
            <div style={{ background: '#ffffff', borderRadius: '1.5px' }} />
            <div style={{ background: '#ffffff', borderRadius: '1.5px' }} />
            <div style={{ background: '#ffffff', borderRadius: '1.5px' }} />
            <div style={{ background: '#ffffff', borderRadius: '1.5px' }} />
          </div>

          <div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#09090b',
                letterSpacing: '-0.01em',
                lineHeight: 1.2,
              }}
            >
              ARTISAN BRIDGE
            </div>
            <div
              style={{
                fontSize: '0.68rem',
                fontWeight: 600,
                color: '#71717a',
                letterSpacing: '0.08em',
              }}
            >
              ADMIN
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {/* Dashboard Tab */}
          <Link
            href="/admin"
            onClick={() => onSelectTab?.('dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '10px 14px',
              background: activeTab === 'dashboard' ? '#18181b' : 'transparent',
              color: activeTab === 'dashboard' ? '#ffffff' : '#71717a',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
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

          {/* User Management Tab (ADM095) */}
          <Link
            href="/admin/users"
            onClick={() => onSelectTab?.('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '10px 14px',
              background: activeTab === 'users' ? '#18181b' : 'transparent',
              color: activeTab === 'users' ? '#ffffff' : '#71717a',
              textDecoration: 'none',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: activeTab === 'users' ? 600 : 500,
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s ease, color 0.15s ease',
              boxSizing: 'border-box',
            }}
          >
            {/* User group icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>User Management</span>
          </Link>
        </nav>
      </div>

      {/* Bottom User Profile */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid #e4e4e7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: '#18181b',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.78rem',
            }}
          >
            {adminInitials}
          </div>
          <div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#09090b', lineHeight: 1.2 }}>
              {adminName}
            </div>
            <div style={{ fontSize: '0.68rem', fontWeight: 500, color: '#71717a', letterSpacing: '0.04em' }}>
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
            color: '#71717a',
            cursor: 'pointer',
            padding: '4px',
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
