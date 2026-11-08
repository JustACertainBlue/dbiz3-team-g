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
    window.location.assign(newRole === 'TourAgency' ? '/explore' : newRole === 'LocalProvider' ? `/provider/${providerId}` : newRole === 'UBND' ? '/admin' : newRole === 'HDT' ? '/admin' : '/explore')
  }

  return (
    <div
      style={{
        background: 'var(--palette-blue-11)',
        color: 'var(--palette-white)',
        borderBottom: 'var(--border-width-2) solid var(--palette-orange-43)',
        padding: 'var(--space-0p45rem) var(--space-1p25rem)',
        fontSize: 'var(--font-size-0p75rem)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 'var(--space-0p75rem)',
        zIndex: 1000,
        position: 'sticky',
        top: 0,
        boxShadow: '0 var(--space-2) var(--space-8) var(--alpha-black-30)',
      }}
    >
      {/* Active Account Pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-0p65rem)' }}>
        <span style={{ fontWeight: 800, color: 'var(--palette-blue-65)', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: 'var(--font-size-0p7rem)' }}>
          TÀI KHOẢN ĐANG ĐĂNG NHẬP:
        </span>
        <span
          style={{
            background:
              role === 'LocalProvider'
                ? 'var(--palette-orange-43)'
                : role === 'TourAgency'
                ? 'var(--palette-blue-25)'
                : role === 'UBND'
                ? 'var(--palette-red-35)'
                : 'var(--palette-blue-35)',
            color: 'var(--palette-white)',
            padding: 'var(--space-3) var(--space-10)',
            borderRadius: 'var(--radius-3)',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.03em',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 'var(--space-0p35rem)',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-0p4rem)' }}>
        <span style={{ color: 'var(--palette-blue-47)', marginRight: 'var(--space-0p2rem)', fontSize: 'var(--font-size-0p7rem)', fontWeight: 600 }}>Switch Role:</span>

        <button
          type="button"
          onClick={() => handleSelectRole('LocalProvider')}
          style={{
            background: role === 'LocalProvider' ? 'var(--palette-orange-43)' : 'var(--palette-blue-17)',
            color: role === 'LocalProvider' ? 'var(--palette-white)' : 'var(--palette-sky-84)',
            border: role === 'LocalProvider' ? 'var(--border-width-1) solid var(--palette-orange-53)' : 'var(--border-width-1) solid var(--palette-blue-27)',
            padding: 'var(--space-3) var(--space-9)',
            borderRadius: 'var(--radius-2)',
            fontSize: 'var(--font-size-0p72rem)',
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
            background: role === 'TourAgency' ? 'var(--palette-blue-25)' : 'var(--palette-blue-17)',
            color: role === 'TourAgency' ? 'var(--palette-white)' : 'var(--palette-sky-84)',
            border: role === 'TourAgency' ? 'var(--border-width-1) solid var(--palette-sky-60)' : 'var(--border-width-1) solid var(--palette-blue-27)',
            padding: 'var(--space-3) var(--space-9)',
            borderRadius: 'var(--radius-2)',
            fontSize: 'var(--font-size-0p72rem)',
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
            background: role === 'UBND' ? 'var(--palette-red-35)' : 'var(--palette-blue-17)',
            color: role === 'UBND' ? 'var(--palette-white)' : 'var(--palette-sky-84)',
            border: role === 'UBND' ? 'var(--border-width-1) solid var(--palette-red-71)' : 'var(--border-width-1) solid var(--palette-blue-27)',
            padding: 'var(--space-3) var(--space-9)',
            borderRadius: 'var(--radius-2)',
            fontSize: 'var(--font-size-0p72rem)',
            cursor: 'pointer',
            fontWeight: role === 'UBND' ? 800 : 500,
          }}
        >
          🏛️ UBND Admin
        </button>

        <button
          type="button"
          onClick={() => handleSelectRole('HDT')}
          style={{ background: role === 'HDT' ? 'var(--palette-violet-50)' : 'var(--palette-blue-17)', color: 'var(--palette-white)', border: 'var(--border-width-1) solid var(--palette-violet-58)', padding: 'var(--space-3) var(--space-9)', borderRadius: 'var(--radius-2)', fontSize: 'var(--font-size-0p72rem)', cursor: 'pointer' }}
        >
          🏛️ HDT Admin
        </button>

        <button
          type="button"
          onClick={() => handleSelectRole('Guest')}
          style={{
            background: role === 'Guest' ? 'var(--palette-blue-35)' : 'var(--palette-blue-17)',
            color: role === 'Guest' ? 'var(--palette-white)' : 'var(--palette-sky-84)',
            border: role === 'Guest' ? 'var(--border-width-1) solid var(--palette-blue-65)' : 'var(--border-width-1) solid var(--palette-blue-27)',
            padding: 'var(--space-3) var(--space-9)',
            borderRadius: 'var(--radius-2)',
            fontSize: 'var(--font-size-0p72rem)',
            cursor: 'pointer',
            fontWeight: role === 'Guest' ? 800 : 500,
          }}
        >
          👤 Guest
        </button>
      </div>

      {/* Role-Specific Quick Navigation Links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-0p65rem)', borderLeft: 'var(--border-width-1) solid var(--palette-blue-27)', paddingLeft: 'var(--space-0p75rem)', flexWrap: 'wrap' }}>
        {/* LUỒNG 1: LOCAL PROVIDER */}
        {role === 'LocalProvider' && (
          <>
            <span style={{ color: 'var(--palette-orange-53)', fontWeight: 800, fontSize: 'var(--font-size-0p7rem)' }}>LUỒNG XƯỞNG:</span>
            <Link href={`/provider/${providerId}`} style={{ color: 'var(--palette-white)', textDecoration: 'none', fontWeight: 700 }}>
              Hồ sơ Xưởng (PRF127)
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href={`/provider/${providerId}/dashboard`} style={{ color: 'var(--palette-teal-52)', textDecoration: 'none', fontWeight: 700 }}>
              Dashboard
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href={`/provider/${providerId}/experiences`} style={{ color: 'var(--palette-amber-77)', textDecoration: 'none', fontWeight: 700 }}>
              Experiences
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href={`/provider/${providerId}/bookings`} style={{ color: 'var(--palette-sky-78)', textDecoration: 'none', fontWeight: 700 }}>
              Bookings
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href={`/provider/${providerId}/schedule`} style={{ color: 'var(--palette-indigo-85)', textDecoration: 'none', fontWeight: 700 }}>
              Schedule
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href={`/provider/${providerId}/edit`} style={{ color: 'var(--palette-orange-72)', textDecoration: 'none', fontWeight: 700 }}>
              ✏️ Sửa Xưởng (PRF128)
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href={`/village/${villageId}`} style={{ color: 'var(--palette-amber-77)', textDecoration: 'none', fontWeight: 600 }}>
              Làng nghề Bát Tràng (VIL030)
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href="/messages" style={{ color: 'var(--palette-red-82)', textDecoration: 'none', fontWeight: 700 }}>
              💬 Chat B2B với Agency
            </Link>
          </>
        )}

        {/* LUỒNG 2: TOUR AGENCY */}
        {role === 'TourAgency' && (
          <>
            <span style={{ color: 'var(--palette-sky-60)', fontWeight: 800, fontSize: 'var(--font-size-0p7rem)' }}>LUỒNG AGENCY:</span>
            <Link href="/explore" style={{ color: 'var(--palette-teal-52)', textDecoration: 'none', fontWeight: 800, background: 'var(--palette-teal-16)', padding: 'var(--space-2) var(--space-7)', borderRadius: 'var(--radius-3)' }}>
              🔍 KHÁM PHÁ (EXPLORE)
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href="/ai-matching" style={{ color: 'var(--palette-amber-56)', textDecoration: 'none', fontWeight: 800 }}>
              ✦ AI Matching
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href={`/agency/${agencyId}/bookings`} style={{ color: 'var(--palette-sky-78)', textDecoration: 'none', fontWeight: 700 }}>
              Bookings
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href={`/agency/${agencyId}`} style={{ color: 'var(--palette-white)', textDecoration: 'none', fontWeight: 700 }}>
              Hồ sơ Agency (PRF019)
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href={`/agency/${agencyId}/edit`} style={{ color: 'var(--palette-sky-60)', textDecoration: 'none', fontWeight: 700 }}>
              ✏️ Sửa Agency (PRF021)
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href={`/village/${villageId}`} style={{ color: 'var(--palette-amber-77)', textDecoration: 'none', fontWeight: 600 }}>
              Làng nghề (VIL030)
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href="/messages" style={{ color: 'var(--palette-red-82)', textDecoration: 'none', fontWeight: 700 }}>
              💬 Chat B2B với Xưởng
            </Link>
          </>
        )}

        {/* LUỒNG 3: UBND ADMIN */}
        {role === 'UBND' && (
          <>
            <span style={{ color: 'var(--palette-red-71)', fontWeight: 800, fontSize: 'var(--font-size-0p7rem)' }}>LUỒNG ADMIN:</span>
            <Link href="/admin" style={{ color: 'var(--palette-white)', textDecoration: 'none', fontWeight: 800, background: 'var(--palette-red-35)', padding: 'var(--space-2) var(--space-7)', borderRadius: 'var(--radius-3)' }}>📊 Dashboard (ADM079)</Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href="/admin/providers" style={{ color: 'var(--palette-white)', textDecoration: 'none', fontWeight: 800 }}>Provider review</Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href={`/village/${ubndVillageId}`} style={{ color: 'var(--palette-amber-77)', textDecoration: 'none', fontWeight: 800 }}>
              🏛️ Hồ sơ Làng nghề Hạ Thái
            </Link>
          </>
        )}

        {role === 'HDT' && (
          <><span style={{ color: 'var(--palette-indigo-85)', fontWeight: 800, fontSize: 'var(--font-size-0p7rem)' }}>LUỒNG HDT:</span><Link href="/admin" style={{ color: 'var(--palette-white)', textDecoration: 'none', fontWeight: 800, background: 'var(--palette-violet-50)', padding: 'var(--space-2) var(--space-7)', borderRadius: 'var(--radius-3)' }}>📊 Dashboard (ADM079)</Link><span style={{ color: 'var(--palette-blue-35)' }}> · </span><Link href="/admin/providers" style={{ color: 'var(--palette-white)', textDecoration: 'none', fontWeight: 700 }}>Provider review</Link></>
        )}

        {/* LUỒNG 4: GUEST */}
        {role === 'Guest' && (
          <>
            <span style={{ color: 'var(--palette-blue-65)', fontWeight: 800, fontSize: 'var(--font-size-0p7rem)' }}>KHÁCH VÃNG LAI:</span>
            <Link href="/explore" style={{ color: 'var(--palette-teal-52)', textDecoration: 'none', fontWeight: 700 }}>
              🔍 Khám phá (Explore)
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href={`/village/${villageId}`} style={{ color: 'var(--palette-amber-77)', textDecoration: 'none' }}>
              Làng gốm Bát Tràng (VIL030)
            </Link>
            <span style={{ color: 'var(--palette-blue-35)' }}>·</span>
            <Link href={`/provider/${providerId}`} style={{ color: 'var(--palette-white)', textDecoration: 'none' }}>
              {DEMO_IDENTITIES.provider.displayName}
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
