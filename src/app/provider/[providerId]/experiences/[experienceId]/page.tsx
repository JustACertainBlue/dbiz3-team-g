'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import RoleNavbar from '@/app/components/RoleNavbar'
import { getCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'
import {
  IconCheck,
  IconClock,
  IconUsers,
  IconAccessibility,
  IconGear,
  IconPhoto,
  IconLock,
  IconArrowLeft,
  IconEdit,
} from '@/app/components/Icons'

interface ExperienceDetail {
  experience_id: string
  name: string
  category: string
  description: string
  duration_minutes: number
  price_per_person: number
  max_participants: number
  notice_period_hours?: number
  location_address?: string
}

export default function ExperienceDetailPage({
  params,
}: {
  params: { providerId: string; experienceId: string }
}) {
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [experience, setExperience] = useState<ExperienceDetail | null>(null)
  const [selectedImage, setSelectedImage] = useState<{ url: string; label: string; cat: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setRole(getCurrentRole())
    const onRoleChanged = () => setRole(getCurrentRole())
    window.addEventListener('hab_role_changed', onRoleChanged)

    async function load() {
      try {
        const res = await fetch(`/api/prf/experience/${params.experienceId}`)
        if (res.ok) {
          const data = await res.json()
          setExperience(data)
        }
      } catch {
        // fallback
      } finally {
        setLoading(false)
      }
    }
    load()

    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [params.experienceId])

  const sampleImages = [
    {
      url: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1200&q=80',
      label: 'Centering & Kick-Wheel Throwing',
      cat: 'Category 1 · Artisan Working (BR-009)',
    },
    {
      url: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=1200&q=80',
      label: 'Main Studio & Glaze Lab Space',
      cat: 'Category 2 · Workshop Space (BR-009)',
    },
    {
      url: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1200&q=80',
      label: 'Finished High-Fire Celadon Tea Sets',
      cat: 'Category 3 · Finished Product (BR-009)',
    },
  ]

  const isAgency = role === 'TourAgency'
  const isLocalProviderOwner = role === 'LocalProvider'
  const isGuest = role === 'Guest'

  const expName = experience?.name || 'Traditional Hand-Wheel Throwing & Glazing Masterclass'
  const expDuration = experience?.duration_minutes ? (experience.duration_minutes / 60).toFixed(1) + ' Hours' : '2.5 Hours'
  const expPrice = experience?.price_per_person || 320000
  const expMaxPax = experience?.max_participants || 15

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', minHeight: '100vh', background: '#ffffff' }}>
      <RoleNavbar
        providerId={params.providerId}
        breadcrumbs={
          <>
            <Link href={`/provider/${params.providerId}`} style={{ color: '#6b7280', textDecoration: 'none' }}>
              WORKSHOP PROFILE
            </Link>{' '}
            / EXPERIENCES / <span style={{ color: '#111827', fontWeight: 700 }}>{expName.toUpperCase()}</span>
          </>
        }
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 2rem 4rem' }}>
        {/* Top Header Controls matching EXP068.png */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb' }}>
          <Link
            href={`/provider/${params.providerId}`}
            style={{
              fontSize: '0.72rem', fontWeight: 800, color: '#111827', textDecoration: 'none',
              letterSpacing: '0.05em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}
          >
            <IconArrowLeft size={13} color="#111827" />
            <span>BACK TO EXPERIENCE MANAGEMENT</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{
              background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0',
              padding: '2px 8px', borderRadius: '3px', fontSize: '0.68rem', fontWeight: 800,
              display: 'inline-flex', alignItems: 'center', gap: '4px',
            }}>
              <span style={{ fontSize: '0.6rem' }}>●</span> ACTIVE LISTING
            </span>

            {isLocalProviderOwner && (
              <Link
                href={`/provider/${params.providerId}/edit`}
                style={{
                  background: '#111827', color: '#ffffff', textDecoration: 'none',
                  padding: '0.45rem 0.85rem', borderRadius: '2px', fontSize: '0.72rem', fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                }}
              >
                <IconEdit size={12} color="#ffffff" />
                <span>EDIT EXPERIENCE</span>
              </Link>
            )}
          </div>
        </div>

        {/* Title and Subtitle matching EXP068.png */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
            {expName}
          </h1>
          <p style={{ fontSize: '0.9rem', color: '#4b5563', margin: 0, maxWidth: '850px', lineHeight: 1.6 }}>
            {experience?.description ||
              'Transform vibrant raw Red River alluvial silt into high-fired glazed ceramic masterpieces. Guided by master artisans of the Bat Trang Ceramic Guild.'}
          </p>
        </div>

        {/* Two-Column Grid: Left 65% Main Content / Right 35% Sidebar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* LEFT COLUMN */}
          <div>
            {/* Gallery Grid (3 Photos layout per EXP068.png) */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '0.75rem', marginBottom: '2.5rem',
            }}>
              {/* Big Photo 1 */}
              <div
                onClick={() => setSelectedImage(sampleImages[0])}
                style={{
                  background: '#f3f4f6', aspectRatio: '4/3', borderRadius: '3px', border: '1px solid #e5e7eb',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  position: 'relative', cursor: 'pointer', padding: '1.5rem', textAlign: 'center',
                }}
              >
                <IconPhoto size={36} color="#9ca3af" />
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4b5563', marginTop: '0.5rem' }}>
                  [ PRIMARY WORKSHOP COVER PLACEHOLDER ]
                </div>
                <div style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                  1200 × 800 Recommended Ratio
                </div>
                <span style={{
                  position: 'absolute', bottom: '0.6rem', left: '0.6rem',
                  background: '#ffffff', color: '#111827', fontSize: '0.62rem', fontWeight: 800,
                  padding: '2px 6px', borderRadius: '2px', border: '1px solid #e5e7eb',
                }}>
                  MAIN WORKSHOP SPACE
                </span>
              </div>

              {/* Stacked Photos 2 & 3 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div
                  onClick={() => setSelectedImage(sampleImages[1])}
                  style={{
                    flex: 1, background: '#f3f4f6', borderRadius: '3px', border: '1px solid #e5e7eb',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: '1rem', textAlign: 'center', minHeight: '120px',
                  }}
                >
                  <IconPhoto size={22} color="#9ca3af" />
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4b5563', marginTop: '0.3rem' }}>
                    [ GALLERY 02 - GLAZE FORMULATION ]
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#9ca3af' }}>600 × 400 Ratio</div>
                </div>

                <div
                  onClick={() => setSelectedImage(sampleImages[2])}
                  style={{
                    flex: 1, background: '#f3f4f6', borderRadius: '3px', border: '1px solid #e5e7eb',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', padding: '1rem', textAlign: 'center', minHeight: '120px',
                  }}
                >
                  <IconPhoto size={22} color="#9ca3af" />
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#4b5563', marginTop: '0.3rem' }}>
                    [ GALLERY 03 - EXHIBITION ]
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#9ca3af' }}>600 × 400 Ratio</div>
                </div>
              </div>
            </div>

            {/* Curatorial Overview & Cultural Significance */}
            <div style={{ marginBottom: '2.5rem', borderTop: '1px solid #f3f4f6', paddingTop: '1.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 0.35rem 0' }}>
                Curatorial Overview &amp; Cultural Significance
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
                Background context presented to travelers exploring authentic craft lineages.
              </div>

              <p style={{ fontSize: '0.84rem', color: '#374151', lineHeight: 1.65, margin: '0 0 1rem 0' }}>
                Hung Thinh Workshop is a founding atelier based in Bat Trang ceramic village, dedicated to preserving 700-year-old manual wheel-throwing techniques while sharing authentic artisanal discipline. This 2.5-hour immersive session invites guests to look closely at the tactile qualities of Red River clay.
              </p>
              <p style={{ fontSize: '0.84rem', color: '#374151', lineHeight: 1.65, margin: 0 }}>
                Participants learn how to prepare clay, center on foot-pedal wheels, hollow and pull wall silhouettes, and apply traditional ash glazes. Every ticket directly supports the atelier apprentices and expands community cultural heritage archives.
              </p>
            </div>

            {/* Session Structure & Schedule matching EXP068.png */}
            <div style={{ marginBottom: '2.5rem', borderTop: '1px solid #f3f4f6', paddingTop: '1.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 0.35rem 0' }}>
                Session Structure &amp; Schedule
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
                Step-by-step breakdown of the on-site experience.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1rem', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#9ca3af', fontWeight: 700, marginBottom: '0.4rem' }}>
                    <span>00:00 - 00:30</span>
                    <span>Step 1</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#111827', marginBottom: '0.35rem' }}>
                    Introduction &amp; Heritage
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', lineHeight: 1.45 }}>
                    History of Bat Trang pottery and introduction to the guild mentors.
                  </div>
                </div>

                <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1rem', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#9ca3af', fontWeight: 700, marginBottom: '0.4rem' }}>
                    <span>00:30 - 02:00</span>
                    <span>Step 2</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#111827', marginBottom: '0.35rem' }}>
                    Centering &amp; Throwing
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', lineHeight: 1.45 }}>
                    Clay preparation, foot-wheel centering, and master-guided pulling.
                  </div>
                </div>

                <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1rem', background: '#ffffff' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#9ca3af', fontWeight: 700, marginBottom: '0.4rem' }}>
                    <span>02:00 - 02:30</span>
                    <span>Step 3</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#111827', marginBottom: '0.35rem' }}>
                    Glazing &amp; Reflection
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', lineHeight: 1.45 }}>
                    Ancient ash glaze dipping, tea ceremony, and packaging review.
                  </div>
                </div>
              </div>
            </div>

            {/* Participant Guidelines & Accessibility */}
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1.5rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 0.35rem 0' }}>
                Participant Guidelines &amp; Accessibility
              </h2>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
                Studio policies, accessibility guarantees, and safety standards.
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <IconAccessibility size={20} color="#111827" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#111827', marginBottom: '0.2rem' }}>
                      Full Wheelchair Access
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#6b7280', lineHeight: 1.45 }}>
                      Workshop studio features flat ramp entry and fully accessible facilities.
                    </div>
                  </div>
                </div>

                <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                  <IconGear size={20} color="#111827" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: '#111827', marginBottom: '0.2rem' }}>
                      Tool Safety
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#6b7280', lineHeight: 1.45 }}>
                      Ergonomic wire cutters and wooden ribs provided; professional guidance given during all steps.
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT SIDEBAR COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            {/* Standard Rate Box */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.5rem', background: '#ffffff' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                STANDARD RATE
              </div>

              {isGuest ? (
                /* GUEST: STRICTLY HIDE PRICE AND AVAILABILITY */
                <div style={{ padding: '0.5rem 0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#92400e', fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                    <IconLock size={15} color="#92400e" />
                    <span>Price &amp; Allotment Locked</span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.5 }}>
                    Please sign in as a verified tour agency to access live contracting tariffs, direct master chat, and instant allotment booking.
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: '#111827', lineHeight: 1, marginBottom: '0.25rem' }}>
                    {expPrice.toLocaleString()} <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>VND</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '1rem' }}>
                    / per person
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#6b7280', lineHeight: 1.5, borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
                    Includes all raw clay materials, pedal kick-wheel station, specialized trimming tools, curatorial instruction &amp; packaging.
                  </div>
                </>
              )}
            </div>

            {/* Capacity & Logistics Box */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.5rem', background: '#ffffff' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem' }}>
                CAPACITY &amp; LOGISTICS
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.75rem' }}>
                <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <IconUsers size={14} color="#6b7280" /> Max Capacity
                </span>
                <strong style={{ color: '#111827' }}>
                  {isGuest ? (
                    <span style={{ color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <IconLock size={11} color="#9ca3af" /> Locked
                    </span>
                  ) : (
                    `${expMaxPax} Guests`
                  )}
                </strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.75rem' }}>
                <span style={{ color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <IconClock size={14} color="#6b7280" /> Duration
                </span>
                <strong style={{ color: '#111827' }}>{expDuration}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', fontSize: '0.75rem' }}>
                <span style={{ color: '#6b7280' }}>Languages</span>
                <strong style={{ color: '#111827' }}>Vietnamese, English</strong>
              </div>
            </div>

            {/* Location Box */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.5rem', background: '#ffffff' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                LOCATION
              </div>
              <div style={{ fontSize: '0.78rem', color: '#374151', lineHeight: 1.5 }}>
                House No. 18, Bat Trang Ancient Village, Gia Lam District, Hanoi
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Lightbox Modal (BR-016) */}
      {selectedImage && (
        <div
          onClick={() => setSelectedImage(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '2rem', zIndex: 10000, cursor: 'pointer',
          }}
        >
          <div style={{ maxWidth: '900px', width: '100%', textAlign: 'center' }}>
            <img
              src={selectedImage.url}
              alt={selectedImage.label}
              style={{ maxWidth: '100%', maxHeight: '75vh', borderRadius: '4px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}
            />
            <div style={{ color: '#ffffff', marginTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#f97316', fontWeight: 800, textTransform: 'uppercase' }}>
                {selectedImage.cat}
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, marginTop: '0.25rem' }}>
                {selectedImage.label}
              </div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>
                (Click anywhere to dismiss Lightbox)
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
