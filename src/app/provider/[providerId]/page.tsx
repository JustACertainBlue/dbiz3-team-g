'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import RoleNavbar from '@/app/components/RoleNavbar'
import { getCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'
import {
  IconCheck,
  IconPin,
  IconClock,
  IconUsers,
  IconGear,
  IconBuilding,
  IconFlame,
  IconPhone,
  IconBus,
  IconAccessibility,
  IconPhoto,
  IconChat,
  IconEdit,
  IconArrowLeft,
  IconArrowRight,
  IconLock,
  IconStar,
} from '@/app/components/Icons'

interface ProviderData {
  provider_id: string
  provider_name: string
  craft_type: string
  general_description: string
  village_id?: string
  village_name?: string
  village_district?: string
  village_city?: string
  village_code?: string
  location_address?: string
  artisan_names?: string[]
  business_registration_number?: string
  pricing?: number
  capacity?: number
  contact?: {
    phone_number?: string
    business_email?: string
  }
  verification_status?: string
}

const GALLERY_SLIDES = [
  { id: '1', title: '01 · FIRING YARDS', label: 'FIRING YARDS & WOOD STORAGE', desc: 'Architectural perspective showing outdoor firing yards, drying racks, and studio sheds' },
  { id: '2', title: '02 · DRAGON KILN', label: 'DRAGON KILN CHAMBERS', desc: '5-chamber traditional stepped brick kiln operating up to 1,300°C along hillside incline' },
  { id: '3', title: '03 · GLAZE ATELIER', label: 'GLAZE ATELIER & FORMULATION', desc: 'Covered open-air bisque display hall, raw clay prep tables, and formulation lab' },
  { id: '4', title: '04 · POTTERY WHEELS', label: 'HAND-THROWING WHEEL STUDIO', desc: '12 synchronous manual kick-wheels calibrated for traditional throwing and guest workshops' },
  { id: '5', title: '05 · DRYING SHEDS', label: 'DRYING SHEDS & BISQUE SHELVES', desc: 'Naturally ventilated open-air brick galleries for unhurried humidity cure' },
  { id: '6', title: '06 · TEA PAVILION', label: 'ARTISAN TEA PAVILION', desc: 'Courtyard pavilion serving traditional lotus tea and master dialogue sessions' },
]

export default function ProviderProfilePage({
  params,
}: {
  params: { providerId: string }
}) {
  const router = useRouter()
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [mounted, setMounted] = useState(false)
  const [provider, setProvider] = useState<ProviderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activePhotoIdx, setActivePhotoIdx] = useState(0)

  // Bát Tràng own provider ID
  const ownProviderId = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'

  // Audit state
  const [revisionComments, setRevisionComments] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [reviewMessage, setReviewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setMounted(true)
    setRole(getCurrentRole())
    const onRoleChanged = () => setRole(getCurrentRole())
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/prf/provider/${params.providerId}`)
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Artisan workshop profile not published or does not exist.' : 'Data loading failure.')
        }
        const data = await res.json()
        setProvider(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Network connection failure.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.providerId])

  const handleReview = async (decision: 'Approve' | 'Request Revision') => {
    setReviewing(true)
    setReviewMessage(null)
    try {
      const res = await fetch(`/api/prf/provider/${params.providerId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          revision_comments: revisionComments,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Verification action failed.')
      }
      setProvider(prev => prev ? { ...prev, verification_status: data.verification_status } : null)
      setReviewMessage({
        type: 'success',
        text: `Compliance status updated: ${data.verification_status}`,
      })
    } catch (err: unknown) {
      setReviewMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to execute audit action.',
      })
    } finally {
      setReviewing(false)
    }
  }

  if (!mounted || loading) {
    return (
      <div className="spec-portal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p style={{ fontWeight: 700, color: '#4b5563', letterSpacing: '0.04em' }}>LOADING PROVIDER PROFILE (PRF127)...</p>
      </div>
    )
  }

  // CROSS-PROVIDER PRIVACY CHECK (BR-002)
  const isCompetitorAccess = role === 'LocalProvider' && params.providerId !== ownProviderId
  if (isCompetitorAccess) {
    return (
      <div className="spec-portal" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div
          style={{
            maxWidth: '680px',
            background: '#ffffff',
            border: '2px solid #ef4444',
            padding: '2.5rem',
            textAlign: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
            borderRadius: '4px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <IconLock size={48} color="#ef4444" />
          </div>
          <span className="spec-badge-pill" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fecaca', marginBottom: '1rem' }}>
            403 FORBIDDEN · BR-002 CROSS-PROVIDER COMPETITIVE PRIVACY
          </span>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: '0.75rem 0' }}>
            Cross-Provider Competitive Privacy Guard
          </h2>
          <p style={{ color: '#4b5563', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            You are logged in as <strong>Local Provider (Hung Thinh Artisan Pottery Workshop)</strong>.
            Under fair trade regulations and confidential business protections (<strong>Rule BR-002</strong>), craft workshops cannot inspect the internal operational capacity, pricing, equipment, or direct transaction channels of competing workshops within the same village.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href={`/provider/${ownProviderId}`} className="spec-btn-black">
              ← Return to Your Workshop Profile
            </Link>
            <Link href="/village/20896522-6235-5699-aeaf-f48b8150d895" className="spec-btn-white">
              Bat Trang Village Profile (VIL030)
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (error || !provider) {
    return (
      <div className="spec-portal" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#be123c', marginBottom: '1rem' }}>Workshop Profile Not Found</h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>{error || 'This artisan workshop is currently unpublished or inactive.'}</p>
        <Link href="/explore" className="spec-btn-black">Explore Catalog</Link>
      </div>
    )
  }

  const isLocalProviderOwner = role === 'LocalProvider' && params.providerId === ownProviderId
  const isAgency = role === 'TourAgency'
  const isUBND = role === 'UBND'
  const isGuest = role === 'Guest'

  const leadArtisan = provider.artisan_names?.[0] || 'Nguyen Van Hung'
  const villageName = provider.village_name || 'Bat Trang'
  const villageDistrict = provider.village_district || 'Gia Lam'

  return (
    <div className="spec-portal" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#ffffff', minHeight: '100vh' }}>
      {/* RoleNavbar */}
      <RoleNavbar
        breadcrumbs={
          isLocalProviderOwner ? (
            <>PROVIDER PORTAL / WORKSHOP PROFILE / <span style={{ color: '#111827' }}>HUNG THINH ARTISAN WORKSHOP (LEAD ADMIN)</span></>
          ) : isAgency ? (
            <>AGENCY PORTAL / EXPLORE ARTISANS / <span style={{ color: '#111827' }}>{provider.provider_name.toUpperCase()}</span></>
          ) : isUBND ? (
            <>UBND AUDIT CONSOLE / LOCAL PROVIDER EVALUATION / <span style={{ color: '#ffffff', fontWeight: 700 }}>{provider.provider_name.toUpperCase()}</span></>
          ) : (
            <>PUBLIC CATALOG / BAT TRANG / <span style={{ color: '#111827' }}>{provider.provider_name.toUpperCase()} (DSC123)</span></>
          )
        }
        accessLevel={
          isLocalProviderOwner ? 'ACCESS LEVEL: FULL MANAGEMENT' : isAgency ? 'B2B CONTRACTING PARTNER' : isUBND ? 'HERITAGE AUDIT & COMPLIANCE' : 'PUBLIC PREVIEW'
        }
        providerId={params.providerId}
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 2rem 4rem' }}>
        {/* Top Action Bar matching PRF127.png */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid #e5e7eb',
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b7280' }}>
            PROVIDER ADMINISTRATION
          </div>
          <div>
            {isLocalProviderOwner && (
              <Link
                href={`/provider/${params.providerId}/edit`}
                id="btn-edit-provider-profile"
                style={{
                  background: '#111827', color: '#ffffff', textDecoration: 'none',
                  padding: '0.5rem 1rem', borderRadius: '3px', fontSize: '0.78rem', fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                }}
              >
                <IconEdit size={13} color="#ffffff" />
                <span>EDIT PROVIDER PROFILE</span>
              </Link>
            )}
            {isAgency && (
              <Link
                href="/messages"
                style={{
                  background: '#111827', color: '#ffffff', textDecoration: 'none',
                  padding: '0.5rem 1rem', borderRadius: '3px', fontSize: '0.78rem', fontWeight: 800,
                  display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                }}
              >
                <IconChat size={13} color="#ffffff" />
                <span>DIRECT CHAT WITH MASTER</span>
              </Link>
            )}
            {isGuest && (
              <span style={{ fontSize: '0.75rem', color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <IconLock size={12} color="#6b7280" />
                <span>B2B Verification Required to Book</span>
              </span>
            )}
          </div>
        </div>

        {/* Hero Section matching PRF127.png (split 60/40) */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem',
          marginBottom: '3rem', alignItems: 'start',
        }}>
          {/* Left Column (60%) */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#f3f4f6', color: '#111827', padding: '3px 8px', borderRadius: '2px', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              <IconCheck size={12} color="#111827" />
              <span>VERIFIED HERITAGE PROVIDER</span>
            </div>

            <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0', lineHeight: 1.15, letterSpacing: '-0.02em' }}>
              {provider.provider_name}
            </h1>

            <div style={{ fontSize: '1.05rem', color: '#374151', fontWeight: 600, marginBottom: '0.75rem' }}>
              Master Artisan {leadArtisan} (4th Generation Guild Master)
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
              <IconPin size={14} color="#6b7280" />
              <span>{villageName} Village, {villageDistrict} District, Hanoi</span>
            </div>

            {/* Chips */}
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.75rem' }}>
              <span className="spec-chip">Est. 1989</span>
              <span className="spec-chip">Hand-wheel Throwing</span>
              <span className="spec-chip">Wood Dragon Kiln</span>
              <span className="spec-chip">Alluvial Red River Clay</span>
            </div>

            {/* Direct Chat CTA */}
            <div>
              <button
                onClick={() => router.push('/messages')}
                style={{
                  background: '#ffffff', color: '#111827', border: '1.5px solid #111827',
                  padding: '0.6rem 1.25rem', borderRadius: '3px', fontSize: '0.78rem', fontWeight: 800,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                }}
              >
                <IconChat size={14} color="#111827" />
                <span>DIRECT CHAT WITH MASTER</span>
              </button>
            </div>
          </div>

          {/* Right Column (40%) Archival Photo Card */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', overflow: 'hidden', background: '#ffffff' }}>
            <div style={{
              background: '#f3f4f6', aspectRatio: '4/3',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              position: 'relative', padding: '1.5rem', textAlign: 'center',
            }}>
              <span style={{ position: 'absolute', top: '0.6rem', right: '0.75rem', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', letterSpacing: '0.04em' }}>
                4:3 · ARCHIVAL
              </span>
              <IconPhoto size={36} color="#9ca3af" />
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#4b5563', margin: '0.5rem 0 0.25rem 0' }}>
                [ WORKSHOP &amp; MASTER ARTISAN PHOTO / PLACEHOLDER ]
              </div>
              <div style={{ fontSize: '0.68rem', color: '#9ca3af', maxWidth: '280px', lineHeight: 1.4 }}>
                Authentic documentary records of studio master at the throwing wheel
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderTop: '1px solid #e5e7eb', background: '#ffffff' }}>
              <div style={{ padding: '0.85rem 1rem', borderRight: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  GUILD STATUS
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827', marginTop: '0.2rem' }}>
                  Founding Member
                </div>
              </div>
              <div style={{ padding: '0.85rem 1rem' }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  B2B CAPACITY
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827', marginTop: '0.2rem' }}>
                  {isGuest ? (
                    <span style={{ color: '#9ca3af', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <IconLock size={11} color="#9ca3af" /> Locked
                    </span>
                  ) : (
                    'Private Groups ≤ 40'
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 02: Workshop Facilities & Capacity (3 cards matching PRF127.png) */}
        <section style={{ marginBottom: '3rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 1.25rem 0' }}>
            Workshop Facilities &amp; Capacity
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {/* Card 1: 12 Hand Pottery Wheels */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.5rem', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ marginBottom: '0.75rem', color: '#4b5563' }}>
                  <IconGear size={20} color="#111827" />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0' }}>
                  12 Hand Pottery Wheels
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
                  Foot-pedaled solid wood wheels calibrated for traditional throwing and beginner ergonomics.
                </p>
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700 }}>
                <span style={{ color: '#9ca3af', textTransform: 'uppercase' }}>STATION LOAD:</span>
                <span style={{ color: '#111827' }}>1 GUEST / WHEEL</span>
              </div>
            </div>

            {/* Card 2: 200 m² Studio & Gallery */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.5rem', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ marginBottom: '0.75rem', color: '#4b5563' }}>
                  <IconBuilding size={20} color="#111827" />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0' }}>
                  200 m² Studio &amp; Gallery
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
                  Covered open-air bisque display hall, raw clay prep tables, and dedicated visitor workshop room.
                </p>
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700 }}>
                <span style={{ color: '#9ca3af', textTransform: 'uppercase' }}>SEATED CAPACITY:</span>
                <span style={{ color: '#111827' }}>Up to 45 Pax</span>
              </div>
            </div>

            {/* Card 3: 5-Chamber Dragon Kiln */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.5rem', background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ marginBottom: '0.75rem', color: '#4b5563' }}>
                  <IconFlame size={20} color="#111827" />
                </div>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0' }}>
                  5-Chamber Dragon Kiln
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.5, margin: '0 0 1.5rem 0' }}>
                  Traditional stepped brick kiln operating up to 1,300°C for unglazed wood-ash natural patina.
                </p>
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700 }}>
                <span style={{ color: '#9ca3af', textTransform: 'uppercase' }}>FIRING CYCLE:</span>
                <span style={{ color: '#111827' }}>Monthly Firing Run</span>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 03: Photo Gallery matching PRF127.png */}
        <section style={{ marginBottom: '3.5rem' }}>
          <div style={{
            border: '1px solid #e5e7eb', borderRadius: '3px', overflow: 'hidden', background: '#ffffff',
          }}>
            {/* Slide Header */}
            <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid #e5e7eb', fontSize: '0.72rem', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>● SLIDE 0{activePhotoIdx + 1} / 06</span>
            </div>

            {/* Main Stage */}
            <div style={{
              background: '#f3f4f6', height: '360px', position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '2rem', textAlign: 'center',
            }}>
              {/* Prev/Next arrows */}
              <button
                onClick={() => setActivePhotoIdx(p => (p === 0 ? GALLERY_SLIDES.length - 1 : p - 1))}
                style={{
                  position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)',
                  width: '36px', height: '36px', borderRadius: '50%', background: '#ffffff', border: '1px solid #d1d5db',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <IconArrowLeft size={16} color="#111827" />
              </button>

              <button
                onClick={() => setActivePhotoIdx(p => (p === GALLERY_SLIDES.length - 1 ? 0 : p + 1))}
                style={{
                  position: 'absolute', right: '1rem', top: '50%', transform: 'translateY(-50%)',
                  width: '36px', height: '36px', borderRadius: '50%', background: '#ffffff', border: '1px solid #d1d5db',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <IconArrowRight size={16} color="#111827" />
              </button>

              <IconPhoto size={48} color="#9ca3af" />
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#4b5563', margin: '0.75rem 0 0.35rem 0' }}>
                [ WORKSHOP FACILITY &amp; ARCHITECTURAL GROUNDS / GALLERY 0{activePhotoIdx + 1}/06 ]
              </div>
              <div style={{ fontSize: '0.74rem', color: '#6b7280', maxWidth: '480px' }}>
                {GALLERY_SLIDES[activePhotoIdx].desc}
              </div>

              <span style={{ position: 'absolute', bottom: '0.75rem', right: '1rem', fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af' }}>
                21:9 · ARCHITECTURAL STUDY
              </span>
            </div>

            {/* 6 Thumbnails Strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', borderTop: '1px solid #e5e7eb' }}>
              {GALLERY_SLIDES.map((slide, idx) => (
                <div
                  key={slide.id}
                  onClick={() => setActivePhotoIdx(idx)}
                  style={{
                    padding: '1rem 0.75rem',
                    background: activePhotoIdx === idx ? '#f9fafb' : '#ffffff',
                    borderRight: idx < 5 ? '1px solid #e5e7eb' : 'none',
                    borderTop: activePhotoIdx === idx ? '2.5px solid #111827' : '2.5px solid transparent',
                    cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: '75px', textAlign: 'center',
                  }}
                >
                  <IconPhoto size={18} color={activePhotoIdx === idx ? '#111827' : '#9ca3af'} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: activePhotoIdx === idx ? '#111827' : '#6b7280', marginTop: '0.35rem', textTransform: 'uppercase' }}>
                    {slide.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 04: Offered Workshop Experiences (3 cards matching PRF127.png) */}
        <section style={{ marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 1.25rem 0' }}>
            Offered Workshop Experiences
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {/* Card 1: EXP-01 */}
            <div style={{
              border: '1px solid #e5e7eb', borderRadius: '3px', background: '#ffffff', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div>
                {/* Placeholder Image */}
                <div style={{
                  background: '#f3f4f6', aspectRatio: '16/9', position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '1rem', textAlign: 'center',
                }}>
                  <span style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: '#111827', color: '#ffffff', fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '2px' }}>
                    EXP-01
                  </span>
                  <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.62rem', fontWeight: 700, color: '#15803d' }}>
                    INSTANT CONFIRM
                  </span>
                  <IconPhoto size={24} color="#9ca3af" />
                  <span style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.25rem' }}>[ MASTERCLASS SESSION / PLACEHOLDER ]</span>
                </div>

                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', color: '#6b7280', marginBottom: '0.4rem', fontWeight: 600 }}>
                    <IconClock size={12} color="#6b7280" />
                    <span>2.5 Hours</span>
                    <span>·</span>
                    <IconUsers size={12} color="#6b7280" />
                    <span>Max 15 Guests</span>
                    <span>·</span>
                    <span>All Levels</span>
                  </div>

                  <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0', lineHeight: 1.35 }}>
                    Traditional Wheel-throwing &amp; Clay Sculpting
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                    Hands-on immersion starting from raw Red River silt preparation, pedal wheel centering, hollow pulling, and leather-hard stage trimming under direct artisan coaching.
                  </p>
                </div>
              </div>

              {/* Pricing & Booking Row */}
              <div style={{ padding: '0 1rem 1rem 1rem' }}>
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                  {isGuest ? (
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <IconLock size={12} color="#9ca3af" />
                      <span>Pricing &amp; Allotment Locked</span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>
                        AGENCY TARIFF:
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>
                        ₫320,000 <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>/ pax</span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link
                    href={`/provider/${params.providerId}/experiences/c9f9faf7-2987-5ae4-b1ed-95c095fcce69`}
                    style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827', textDecoration: 'none' }}
                  >
                    View Details
                  </Link>
                  {isAgency && (
                    <button
                      onClick={() => router.push('/messages')}
                      style={{
                        background: '#111827', color: '#ffffff', border: 'none',
                        padding: '0.35rem 0.75rem', borderRadius: '2px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                      }}
                    >
                      BOOKING ↗
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: EXP-02 */}
            <div style={{
              border: '1px solid #e5e7eb', borderRadius: '3px', background: '#ffffff', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  background: '#f3f4f6', aspectRatio: '16/9', position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '1rem', textAlign: 'center',
                }}>
                  <span style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: '#111827', color: '#ffffff', fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '2px' }}>
                    EXP-02
                  </span>
                  <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.62rem', fontWeight: 700, color: '#15803d' }}>
                    INSTANT CONFIRM
                  </span>
                  <IconPhoto size={24} color="#9ca3af" />
                  <span style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.25rem' }}>[ GLAZE FORMULATION / PLACEHOLDER ]</span>
                </div>

                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', color: '#6b7280', marginBottom: '0.4rem', fontWeight: 600 }}>
                    <IconClock size={12} color="#6b7280" />
                    <span>1.5 Hours</span>
                    <span>·</span>
                    <IconUsers size={12} color="#6b7280" />
                    <span>Max 12 Guests</span>
                    <span>·</span>
                    <span>Intermediate</span>
                  </div>

                  <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0', lineHeight: 1.35 }}>
                    Wood-kiln Ash Glazing Techniques
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                    Explore mineral-rich natural glaze compounding using local rice husk ash and lime slip. Participants apply ancestral dipping, brushing, and wax-resist patterns on pre-fired bisque.
                  </p>
                </div>
              </div>

              {/* Pricing & Booking Row */}
              <div style={{ padding: '0 1rem 1rem 1rem' }}>
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                  {isGuest ? (
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <IconLock size={12} color="#9ca3af" />
                      <span>Pricing &amp; Allotment Locked</span>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>
                        AGENCY TARIFF:
                      </div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>
                        ₫270,000 <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>/ pax</span>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Link
                    href={`/provider/${params.providerId}/experiences/c8281688-2dc1-5cb1-9ff6-139df04ba562`}
                    style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827', textDecoration: 'none' }}
                  >
                    View Details
                  </Link>
                  {isAgency && (
                    <button
                      onClick={() => router.push('/messages')}
                      style={{
                        background: '#111827', color: '#ffffff', border: 'none',
                        padding: '0.35rem 0.75rem', borderRadius: '2px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                      }}
                    >
                      BOOKING ↗
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: EXP-03 BESPOKE */}
            <div style={{
              border: '1px solid #e5e7eb', borderRadius: '3px', background: '#ffffff', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{
                  background: '#f3f4f6', aspectRatio: '16/9', position: 'relative',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '1rem', textAlign: 'center',
                }}>
                  <span style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', background: '#111827', color: '#ffffff', fontSize: '0.62rem', fontWeight: 800, padding: '2px 6px', borderRadius: '2px' }}>
                    EXP-03 · BESPOKE
                  </span>
                  <span style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', fontSize: '0.62rem', fontWeight: 700, color: '#d97706' }}>
                    ON REQUEST
                  </span>
                  <IconStar size={24} color="#9ca3af" />
                  <span style={{ fontSize: '0.65rem', color: '#9ca3af', marginTop: '0.25rem' }}>[ BESPOKE MASTER CHAMBER / PLACEHOLDER ]</span>
                </div>

                <div style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', color: '#6b7280', marginBottom: '0.4rem', fontWeight: 600 }}>
                    <IconClock size={12} color="#6b7280" />
                    <span>3 - 5 Days</span>
                    <span>·</span>
                    <IconUsers size={12} color="#6b7280" />
                    <span>Private VIP Cohort</span>
                    <span>·</span>
                    <span>Master-Led</span>
                  </div>

                  <h3 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0', lineHeight: 1.35 }}>
                    Bespoke Imperial Celadon Reproduction &amp; Private Kiln Chamber
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                    Exclusive multi-day masterclass reproducing Ly-Tran dynasty crackled celadon. Includes dedicated 1-on-1 formulation with Master Hung and reserved kiln chamber section.
                  </p>
                </div>
              </div>

              {/* Pricing & Booking Row */}
              <div style={{ padding: '0 1rem 1rem 1rem' }}>
                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>
                    PRICING MODEL:
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#111827' }}>
                    Custom Commission / On Request
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    onClick={() => router.push('/messages')}
                    style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827', cursor: 'pointer' }}
                  >
                    Inquire via Chat
                  </span>
                  {isAgency && (
                    <button
                      onClick={() => router.push('/messages')}
                      style={{
                        background: '#111827', color: '#ffffff', border: 'none',
                        padding: '0.35rem 0.75rem', borderRadius: '2px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer',
                      }}
                    >
                      REQUEST QUOTE ↗
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 05: Village Affiliation matching PRF127.png */}
        <section style={{ marginBottom: '3.5rem' }}>
          <div style={{
            border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.5rem', background: '#ffffff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem',
          }}>
            <div style={{ maxWidth: '720px' }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
                VILLAGE AFFILIATION
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0' }}>
                Bat Trang Ceramic Village Guild
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', lineHeight: 1.5, margin: 0 }}>
                Hung Thinh Artisan Pottery Workshop operates under the traditional stewardship standards of the Bat Trang Ceramic Guild, founded in the 14th century along the banks of the Red River. All experiences comply with heritage preservation benchmarks.
              </p>
            </div>

            <div style={{
              background: '#f9fafb', border: '1px solid #e5e7eb', padding: '1rem 1.25rem', borderRadius: '3px', minWidth: '220px',
            }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                VERIFIED REGISTRY NO.
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827', margin: '0.2rem 0' }}>
                VN-HN-BTR-1989-04
              </div>
              <div style={{ fontSize: '0.68rem', color: '#059669', fontWeight: 700 }}>
                Status: Active Commercial Guild
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 06: Agency Logistics & On-Site Dispatch (3 columns matching PRF127.png) */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>
            AGENCY LOGISTICS &amp; OPERATIONAL COORDINATION
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827', margin: '0 0 1.25rem 0' }}>
            Master Artisan Logistics &amp; On-Site Dispatch
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {/* Column 1: Hotline */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.68rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                <IconPhone size={14} color="#111827" />
                <span>DIRECT DISPATCH &amp; HOTLINE</span>
              </div>
              {isGuest ? (
                <div style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 700 }}>
                  <IconLock size={12} color="#9ca3af" /> Contact Masked for Guest
                </div>
              ) : (
                <>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
                    +84 90 311 8842
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.2rem' }}>
                    Workshop Coordinator: Ms. Le Thi Mai
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                    English, French &amp; Vietnamese dispatch
                  </div>
                </>
              )}
            </div>

            {/* Column 2: Parking */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.68rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                <IconBus size={14} color="#111827" />
                <span>COACH TURNAROUND &amp; PARKING</span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
                Bat Trang Community Pier #3
              </div>
              <div style={{ fontSize: '0.74rem', color: '#6b7280', lineHeight: 1.45 }}>
                Accommodates up to 45-seat tour coaches. Designated drop-off 80m from workshop entrance.
              </div>
            </div>

            {/* Column 3: Access */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', background: '#ffffff' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.68rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                <IconAccessibility size={14} color="#111827" />
                <span>ACCESS &amp; AMENITIES</span>
              </div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
                Wheelchair Accessible Studio Ramp
              </div>
              <div style={{ fontSize: '0.74rem', color: '#6b7280', lineHeight: 1.45 }}>
                Full ADA compliant ground level ramp, tea pavilion, air-purified drying room, and secure packaging crates.
              </div>
            </div>
          </div>
        </section>

        {/* Administrative UBND Compliance Panel (only for UBND role) */}
        {isUBND && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fecaca', padding: '1.5rem', marginBottom: '2.5rem', borderRadius: '3px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  BAT TRANG COMMUNE UBND COMPLIANCE AUDIT PANEL
                </div>
                <div style={{ fontSize: '0.75rem', color: '#7f1d1d' }}>
                  Responsible for accreditation of public profile, artisan identity, and workshop hygiene standards.
                </div>
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#991b1b' }}>
                Status: <strong>{provider.verification_status || 'Verified'}</strong>
              </div>
            </div>

            {reviewMessage && (
              <div style={{ padding: '0.5rem 0.75rem', background: '#ffffff', border: '1px solid #d1d5db', fontSize: '0.78rem', marginBottom: '0.75rem', fontWeight: 600 }}>
                {reviewMessage.text}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={revisionComments}
                onChange={e => setRevisionComments(e.target.value)}
                placeholder="Enter regulatory review notes or revision requirements..."
                style={{ flex: 1, minWidth: '240px', padding: '0.45rem 0.75rem', fontSize: '0.78rem', border: '1px solid #d1d5db', borderRadius: '2px' }}
              />
              <button
                onClick={() => handleReview('Request Revision')}
                disabled={reviewing}
                className="spec-btn-white"
                style={{ fontSize: '0.72rem', borderColor: '#b91c1c', color: '#b91c1c' }}
              >
                {reviewing ? 'Submitting...' : 'Request Revision'}
              </button>
              <button
                onClick={() => handleReview('Approve')}
                disabled={reviewing}
                className="spec-btn-black"
                style={{ fontSize: '0.72rem', background: '#059669', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <IconCheck size={12} color="#ffffff" />
                <span>{reviewing ? 'Approving...' : 'Approve Profile'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer matching PRF127.png */}
      <footer style={{
        borderTop: '1px solid #e5e7eb', padding: '2rem', background: '#ffffff', fontSize: '0.75rem', color: '#6b7280',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.85rem' }}>VIETNAM CRAFT VILLAGES</div>
            <div style={{ fontSize: '0.65rem', color: '#9ca3af', letterSpacing: '0.04em', marginTop: '2px' }}>
              TRADITIONAL ARTISANAL HERITAGE · TOUR AGENCY HUB
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1.25rem' }}>
            <Link href="/explore" style={{ color: '#4b5563', textDecoration: 'none' }}>Explore</Link>
            <span style={{ cursor: 'pointer' }}>About</span>
            <span style={{ cursor: 'pointer' }}>Terms of Service</span>
            <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
            <span style={{ cursor: 'pointer' }}>Agency Support Desk</span>
          </div>
        </div>
        <div style={{ maxWidth: '1200px', margin: '1rem auto 0', display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
          <span>© 2025 VIETNAM CRAFT VILLAGES NETWORK. ALL RIGHTS RESERVED.</span>
          <span>SYSTEM REF: WIREFRAME-B2B-V1.0</span>
        </div>
      </footer>
    </div>
  )
}
