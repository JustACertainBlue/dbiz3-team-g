'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { getCurrentRole, refreshDemoSession, setCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'

export default function RoleSwitcher() {
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [mounted, setMounted] = useState(false)

  const providerId = DEMO_IDENTITIES.provider.providerId!
  const agencyId = DEMO_IDENTITIES.agency.agencyId!
  const villageId = DEMO_IDENTITIES.provider.villageId!
  const ubndVillageId = DEMO_IDENTITIES.ubnd.villageId!

  useEffect(() => {
    setMounted(true)
    refreshDemoSession().then(session => setRole(session.role)).catch(() => setRole('Guest'))

    const handleRoleChange = () => {
      setRole(getCurrentRole())
    }
    window.addEventListener('hab_role_changed', handleRoleChange)
    return () => window.removeEventListener('hab_role_changed', handleRoleChange)
  }, [])

  if (!mounted) return null

  const handleSelectRole = async (newRole: CurrentUserRole) => {
    await setCurrentRole(newRole)
    window.location.assign(newRole === 'TourAgency' ? '/explore' : newRole === 'LocalProvider' ? `/provider/${providerId}` : newRole === 'UBND' ? '/admin/providers' : newRole === 'HDT' ? '/admin/providers' : '/explore')
  }

  return (
    <div
      style={{
        background: '#0f172a',
        color: '#ffffff',
        borderBottom: '2px solid #b84c24',
        padding: '0.45rem 1.25rem',
        fontSize: '0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        zIndex: 1000,
        position: 'sticky',
        top: 0,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      }}
    >
      {/* Active Account Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <span style={{ fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.7rem' }}>
          TÀI KHOẢN ĐANG ĐĂNG NHẬP:
        </span>
        <span
          style={{
            background:
              role === 'LocalProvider'
                ? '#b84c24'
                : role === 'TourAgency'
                ? '#1e3a5f'
                : role === 'UBND'
                ? '#991b1b'
                : '#475569',
            color: '#ffffff',
            padding: '3px 10px',
            borderRadius: '3px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          {role === 'LocalProvider' && `🏺 Local Provider · ${DEMO_IDENTITIES.provider.displayName}`}
          {role === 'TourAgency' && `🏢 Tour Agency · ${DEMO_IDENTITIES.agency.displayName}`}
          {role === 'UBND' && '🏛️ UBND Admin · Hạ Thái (Hội đồng Thẩm định)'}
          {role === 'HDT' && '🏛️ HDT Admin · Sở Du lịch Hà Nội'}
          {role === 'Guest' && '👤 Guest · Khách xem công khai'}
        </span>
      </div>

      {/* Role Switcher Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ color: '#64748b', marginRight: '0.2rem', fontSize: '0.7rem', fontWeight: 600 }}>Switch Role:</span>

        <button
          type="button"
          onClick={() => handleSelectRole('LocalProvider')}
          style={{
            background: role === 'LocalProvider' ? '#b84c24' : '#1e293b',
            color: role === 'LocalProvider' ? '#ffffff' : '#cbd5e1',
            border: role === 'LocalProvider' ? '1px solid #f97316' : '1px solid #334155',
            padding: '3px 9px',
            borderRadius: '2px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: role === 'LocalProvider' ? 800 : 500,
          }}
        >
          🏺 Local Provider
        </button>

        <button
          type="button"
          onClick={() => handleSelectRole('TourAgency')}
          style={{
            background: role === 'TourAgency' ? '#1e3a5f' : '#1e293b',
            color: role === 'TourAgency' ? '#ffffff' : '#cbd5e1',
            border: role === 'TourAgency' ? '1px solid #38bdf8' : '1px solid #334155',
            padding: '3px 9px',
            borderRadius: '2px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: role === 'TourAgency' ? 800 : 500,
          }}
        >
          🏢 Tour Agency
        </button>

        <button
          type="button"
          onClick={() => handleSelectRole('UBND')}
          style={{
            background: role === 'UBND' ? '#991b1b' : '#1e293b',
            color: role === 'UBND' ? '#ffffff' : '#cbd5e1',
            border: role === 'UBND' ? '1px solid #f87171' : '1px solid #334155',
            padding: '3px 9px',
            borderRadius: '2px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: role === 'UBND' ? 800 : 500,
          }}
        >
          🏛️ UBND Admin
        </button>

        <button
          type="button"
          onClick={() => handleSelectRole('HDT')}
          style={{ background: role === 'HDT' ? '#6d28d9' : '#1e293b', color: '#ffffff', border: '1px solid #7c3aed', padding: '3px 9px', borderRadius: '2px', fontSize: '0.72rem', cursor: 'pointer' }}
        >
          🏛️ HDT Admin
        </button>

        <button
          type="button"
          onClick={() => handleSelectRole('Guest')}
          style={{
            background: role === 'Guest' ? '#475569' : '#1e293b',
            color: role === 'Guest' ? '#ffffff' : '#cbd5e1',
            border: role === 'Guest' ? '1px solid #94a3b8' : '1px solid #334155',
            padding: '3px 9px',
            borderRadius: '2px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: role === 'Guest' ? 800 : 500,
          }}
        >
          👤 Guest
        </button>
      </div>

      {/* Role-Specific Quick Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', borderLeft: '1px solid #334155', paddingLeft: '0.75rem', flexWrap: 'wrap' }}>
        {/* LUỒNG 1: LOCAL PROVIDER */}
        {role === 'LocalProvider' && (
          <>
            <span style={{ color: '#f97316', fontWeight: 800, fontSize: '0.7rem' }}>LUỒNG XƯỞNG:</span>
            <Link href={`/provider/${providerId}`} style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 700 }}>
              Hồ sơ Xưởng (PRF127)
            </Link>
            <span style={{ color: '#475569' }}>·</span>
            <Link href={`/provider/${providerId}/edit`} style={{ color: '#fdba74', textDecoration: 'none', fontWeight: 700 }}>
              ✏️ Sửa Xưởng (PRF128)
            </Link>
            <span style={{ color: '#475569' }}>·</span>
            <Link href={`/village/${villageId}`} style={{ color: '#fde68a', textDecoration: 'none', fontWeight: 600 }}>
              Làng nghề Bát Tràng (VIL030)
            </Link>
            <span style={{ color: '#475569' }}>·</span>
            <Link href="/messages" style={{ color: '#fca5a5', textDecoration: 'none', fontWeight: 700 }}>
              💬 Chat B2B với Agency
            </Link>
          </>
        )}

        {/* LUỒNG 2: TOUR AGENCY */}
        {role === 'TourAgency' && (
          <>
            <span style={{ color: '#38bdf8', fontWeight: 800, fontSize: '0.7rem' }}>LUỒNG AGENCY:</span>
            <Link href="/explore" style={{ color: '#34d399', textDecoration: 'none', fontWeight: 800, background: '#064e3b', padding: '2px 7px', borderRadius: '3px' }}>
              🔍 KHÁM PHÁ (EXPLORE)
            </Link>
            <span style={{ color: '#475569' }}>·</span>
            <Link href={`/agency/${agencyId}`} style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 700 }}>
              Hồ sơ Agency (PRF019)
            </Link>
            <span style={{ color: '#475569' }}>·</span>
            <Link href={`/agency/${agencyId}/edit`} style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 700 }}>
              ✏️ Sửa Agency (PRF021)
            </Link>
            <span style={{ color: '#475569' }}>·</span>
            <Link href={`/village/${villageId}`} style={{ color: '#fde68a', textDecoration: 'none', fontWeight: 600 }}>
              Làng nghề (VIL030)
            </Link>
            <span style={{ color: '#475569' }}>·</span>
            <Link href="/messages" style={{ color: '#fca5a5', textDecoration: 'none', fontWeight: 700 }}>
              💬 Chat B2B với Xưởng
            </Link>
          </>
        )}

        {/* LUỒNG 3: UBND ADMIN */}
        {role === 'UBND' && (
          <>
            <span style={{ color: '#f87171', fontWeight: 800, fontSize: '0.7rem' }}>LUỒNG ADMIN:</span>
            <Link href="/admin/providers" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 800 }}>Provider review</Link>
            <span style={{ color: '#475569' }}>·</span>
            <Link href={`/village/${ubndVillageId}`} style={{ color: '#fde68a', textDecoration: 'none', fontWeight: 800 }}>
              🏛️ Hồ sơ Làng nghề Hạ Thái
            </Link>
          </>
        )}

        {role === 'HDT' && (
          <><span style={{ color: '#c4b5fd', fontWeight: 800, fontSize: '0.7rem' }}>LUỒNG HDT:</span><Link href="/admin/providers" style={{ color: '#ffffff', textDecoration: 'none', fontWeight: 700 }}>Provider review</Link></>
        )}

        {/* LUỒNG 4: GUEST */}
        {role === 'Guest' && (
          <>
            <span style={{ color: '#94a3b8', fontWeight: 800, fontSize: '0.7rem' }}>KHÁCH VÃNG LAI:</span>
            <Link href="/explore" style={{ color: '#34d399', textDecoration: 'none', fontWeight: 700 }}>
              🔍 Khám phá (Explore)
            </Link>
            <span style={{ color: '#475569' }}>·</span>
            <Link href={`/village/${villageId}`} style={{ color: '#fde68a', textDecoration: 'none' }}>
              Làng gốm Bát Tràng (VIL030)
            </Link>
            <span style={{ color: '#475569' }}>·</span>
            <Link href={`/provider/${providerId}`} style={{ color: '#ffffff', textDecoration: 'none' }}>
              {DEMO_IDENTITIES.provider.displayName}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
