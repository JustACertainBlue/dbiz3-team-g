'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'
import { IconLock, IconClock, IconEdit } from '@/app/components/Icons'

interface ExperienceItem {
  experience_id: string
  name: string
  category: string
  duration_minutes: number
  price_per_person: number
  max_participants: number
  notice_period_hours?: number
  has_active_bookings?: boolean
}

export default function ExperienceManagementPage({
  params,
}: {
  params: { providerId: string }
}) {
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [experiences, setExperiences] = useState<ExperienceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setRole(getCurrentRole())
    const onRoleChanged = () => {
      setRole(getCurrentRole())
    }
    window.addEventListener('hab_role_changed', onRoleChanged)

    // Demo data for experiences belonging to this provider
    setExperiences([
      {
        experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
        name: 'Traditional Hand-Wheel Pottery Throwing & Glazing',
        category: 'Workshop/Hands-on',
        duration_minutes: 90,
        price_per_person: 150000,
        max_participants: 25,
        notice_period_hours: 24,
        has_active_bookings: true,
      },
      {
        experience_id: 'e1a2b3c4-5555-6666-7777-888899990000',
        name: 'Ancient Dragon Kiln Tour & Proprietary Ash Glazing',
        category: 'Sightseeing/Masterclass',
        duration_minutes: 120,
        price_per_person: 220000,
        max_participants: 15,
        notice_period_hours: 48,
        has_active_bookings: false,
      },
    ])
    setLoading(false)

    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [params.providerId])

  const isLocalProvider = role === 'LocalProvider'

  if (!isLocalProvider) {
    return (
      <div className="prf-container" style={{ padding: '3rem 1rem', textAlign: 'center' }}>
        <div style={{ maxWidth: '560px', margin: '0 auto', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '4px', padding: '2rem', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <IconLock size={40} color="#b84c24" />
          </div>
          <span className="prf-badge prf-badge-warning" style={{ marginBottom: '1rem', display: 'inline-block' }}>
            PERMISSION RESTRICTION · BR-001
          </span>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: '0.5rem 0' }}>
            Local Provider Authorization Required
          </h2>
          <p style={{ color: '#4b5563', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            You are currently viewing with the role <strong>{role}</strong>. Only the authenticated <strong>Local Provider</strong> (Workshop Owner) has authorization to manage, price, or configure experiences.
          </p>
          <Link href={`/provider/${params.providerId}`} className="prf-btn prf-btn-primary">
            ← Return to Workshop Profile (PRF127)
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="prf-container" style={{ paddingBottom: '5rem' }}>
      {/* Header */}
      <div className="prf-spec-header">
        <div>
          <span className="prf-spec-code">SCREEN ID: EXP067 · EXPERIENCE MANAGEMENT</span>
          <h1 className="prf-spec-title">Manage Workshop Experiences &amp; Cultural Programs</h1>
          <p className="prf-spec-subtitle">
            Catalogue of cultural activities, pottery workshops, and tours directly offered by the atelier to guests and B2B tour groups
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link
            href={`/provider/${params.providerId}`}
            className="prf-btn prf-btn-outline"
            style={{ fontSize: '0.8rem' }}
          >
            ← Workshop Profile (PRF127)
          </Link>
          <Link
            href={`/provider/${params.providerId}/experiences/new`}
            className="prf-btn prf-btn-primary"
            style={{ fontSize: '0.8rem' }}
          >
            + Add New Experience (EXP069)
          </Link>
        </div>
      </div>

      {/* Stat Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div className="prf-section-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
            Total Active Experiences
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginTop: '0.25rem' }}>
            {experiences.length} programs
          </div>
        </div>

        <div className="prf-section-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
            Visual Standard (BR-009)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>
            100% COMPLIANT
          </div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>All 3 mandatory image categories fulfilled</div>
        </div>

        <div className="prf-section-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
            Active Tour Reservations
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b84c24', marginTop: '0.25rem' }}>
            1 Active B2B Booking
          </div>
        </div>
      </div>

      {/* Experiences List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {experiences.map(exp => (
          <div
            key={exp.experience_id}
            className="prf-section-card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span className="prf-badge prf-badge-verified">{exp.category}</span>
                <span className="prf-badge" style={{ background: '#f3f4f6', color: '#374151', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <IconClock size={11} color="#374151" />
                  <span>{exp.duration_minutes} mins</span>
                </span>
                {exp.has_active_bookings && (
                  <span className="prf-badge prf-badge-warning">
                    LOCKED FIELDS: ACTIVE BOOKINGS (SR-003)
                  </span>
                )}
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#111827' }}>
                {exp.name}
              </h3>

              <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', color: '#4b5563', flexWrap: 'wrap' }}>
                <div>
                  <strong>Listed Tariff:</strong>{' '}
                  <span style={{ color: '#b84c24', fontWeight: 700 }}>
                    {exp.price_per_person.toLocaleString('en-US')} VND / guest
                  </span>
                </div>
                <div>
                  <strong>Max Capacity:</strong> {exp.max_participants} guests / slot
                </div>
                <div>
                  <strong>Notice Period:</strong> {exp.notice_period_hours} hours
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link
                href={`/provider/${params.providerId}/experiences/${exp.experience_id}/edit`}
                className="prf-btn prf-btn-primary"
                style={{ fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <IconEdit size={12} color="#ffffff" />
                <span>Edit Experience (EXP070)</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
