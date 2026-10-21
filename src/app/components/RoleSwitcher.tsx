'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getCurrentRole, setCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'
import { IconVase, IconBriefcase, IconLandmark, IconUser } from '@/app/components/Icons'

export default function RoleSwitcher() {
  const router = useRouter()
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [mounted, setMounted] = useState(false)

  const villageId = '20896522-6235-5699-aeaf-f48b8150d895'

  useEffect(() => {
    setMounted(true)
    setRole(getCurrentRole())

    const handleRoleChange = () => {
      setRole(getCurrentRole())
    }
    window.addEventListener('hab_role_changed', handleRoleChange)
    return () => window.removeEventListener('hab_role_changed', handleRoleChange)
  }, [])

  if (!mounted) return null

  const handleSelectRole = (newRole: CurrentUserRole) => {
    setCurrentRole(newRole)
    setRole(newRole)

    if (newRole === 'LocalProvider') {
      router.push(`/village/${villageId}`)
    } else if (newRole === 'TourAgency') {
      router.push('/explore')
    } else if (newRole === 'UBND') {
      router.push(`/village/${villageId}`)
    } else if (newRole === 'Guest') {
      router.push('/explore')
    }
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
          CURRENT ACTIVE ROLE:
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
            gap: '0.45rem',
          }}
        >
          {role === 'LocalProvider' && (
            <>
              <IconVase size={14} color="#ffffff" />
              <span>LOCAL PROVIDER · HUNG THINH ARTISAN WORKSHOP</span>
            </>
          )}
          {role === 'TourAgency' && (
            <>
              <IconBriefcase size={14} color="#ffffff" />
              <span>TOUR AGENCY · INDOCHINA HERITAGE VOYAGES</span>
            </>
          )}
          {role === 'UBND' && (
            <>
              <IconLandmark size={14} color="#ffffff" />
              <span>COMMUNE AUDIT ADMIN · BAT TRANG HERITAGE COUNCIL</span>
            </>
          )}
          {role === 'Guest' && (
            <>
              <IconUser size={14} color="#ffffff" />
              <span>GUEST · PUBLIC CATALOG VIEWER</span>
            </>
          )}
        </span>
      </div>

      {/* Role Switcher Action Buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ color: '#94a3b8', marginRight: '0.2rem', fontSize: '0.7rem', fontWeight: 600 }}>Switch Role:</span>

        <button
          type="button"
          onClick={() => handleSelectRole('LocalProvider')}
          style={{
            background: role === 'LocalProvider' ? '#b84c24' : '#1e293b',
            color: role === 'LocalProvider' ? '#ffffff' : '#cbd5e1',
            border: role === 'LocalProvider' ? '1px solid #f97316' : '1px solid #334155',
            padding: '4px 10px',
            borderRadius: '2px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: role === 'LocalProvider' ? 800 : 500,
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <IconVase size={13} color={role === 'LocalProvider' ? '#ffffff' : '#cbd5e1'} />
          <span>Local Provider</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectRole('TourAgency')}
          style={{
            background: role === 'TourAgency' ? '#1e3a5f' : '#1e293b',
            color: role === 'TourAgency' ? '#ffffff' : '#cbd5e1',
            border: role === 'TourAgency' ? '1px solid #38bdf8' : '1px solid #334155',
            padding: '4px 10px',
            borderRadius: '2px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: role === 'TourAgency' ? 800 : 500,
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <IconBriefcase size={13} color={role === 'TourAgency' ? '#ffffff' : '#cbd5e1'} />
          <span>Tour Agency</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectRole('UBND')}
          style={{
            background: role === 'UBND' ? '#991b1b' : '#1e293b',
            color: role === 'UBND' ? '#ffffff' : '#cbd5e1',
            border: role === 'UBND' ? '1px solid #f87171' : '1px solid #334155',
            padding: '4px 10px',
            borderRadius: '2px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: role === 'UBND' ? 800 : 500,
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <IconLandmark size={13} color={role === 'UBND' ? '#ffffff' : '#cbd5e1'} />
          <span>UBND Admin</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectRole('Guest')}
          style={{
            background: role === 'Guest' ? '#475569' : '#1e293b',
            color: role === 'Guest' ? '#ffffff' : '#cbd5e1',
            border: role === 'Guest' ? '1px solid #94a3b8' : '1px solid #334155',
            padding: '4px 10px',
            borderRadius: '2px',
            fontSize: '0.72rem',
            cursor: 'pointer',
            fontWeight: role === 'Guest' ? 800 : 500,
            transition: 'all 0.15s ease',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <IconUser size={13} color={role === 'Guest' ? '#ffffff' : '#cbd5e1'} />
          <span>Guest</span>
        </button>
      </div>
    </div>
  )
}
