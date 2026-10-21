'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCurrentRole, setCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'
import RoleNavbar from '@/app/components/RoleNavbar'
import {
  IconSearch,
  IconSparkles,
  IconLock,
  IconPhoto,
} from '@/app/components/Icons'

// EXP017 — Explore Craft Villages & Artisan Experiences (for Tour Agency)
// EXP120 — Public Explore Craft Villages (for Guest)
// Spec: B2B Discovery & Wholesale Booking | Registry Codex VN-2025
// Sections: Featured Craft Village Experiences | Immersive Masterclasses | Half-Day Excursions | Endangered & Living Heritage

const agencyId = '5fecc699-71e4-5bf0-ac1b-2090e05c2cd9'
const batTrangId = '20896522-6235-5699-aeaf-f48b8150d895'
const vanPhucId = 'c0d0d95f-d59c-5c35-946a-f397e380dd14'
const phuVinhId = 'e482884e-7190-56cf-bc03-4e69614b1fe5'
const chuongId = '688d408b-9d98-5b66-bfa7-659a67462108'

const provider1Id = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'

export default function ExplorePage() {
  const router = useRouter()
  const [role, setRole] = useState<CurrentUserRole>('TourAgency')
  const [searchTerm, setSearchTerm] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  useEffect(() => {
    setRole(getCurrentRole())
    const onRoleChanged = () => setRole(getCurrentRole())
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  const handleExperienceClick = (name: string, providerId?: string, experienceId?: string) => {
    if (providerId && experienceId) {
      router.push(`/provider/${providerId}/experiences/${experienceId}`)
    } else {
      setToastMessage(`Experience details for "${name}" (EXP068) are under development.`)
      setTimeout(() => setToastMessage(null), 3500)
    }
  }

  const isGuest = role === 'Guest'
  const isAgency = role === 'TourAgency'

  const craftVillages = [
    {
      id: batTrangId,
      highlight: 'CLUSTER HIGHLIGHT',
      highlightDist: '14km from OQ',
      location: 'Gia Lam • Hanoi',
      era: 'EST. 14TH CENTURY',
      type: 'HIGH POTTERY',
      name: 'Bat Trang Pottery Village',
      desc: 'Centuries-old riverbank commune specializing in high-fired white clay ceramics, multi-generational master kilns, and bespoke commissions.',
      slots: 'Available',
      tags: ['Ceramics', 'Wood-Kiln', 'Celadon'],
      img: '/craft/bat-trang-pottery.jpg',
    },
    {
      id: vanPhucId,
      highlight: 'TEXTILE HUB',
      location: 'Ha Dong • Hanoi',
      era: 'EST. 10TH CENTURY',
      type: 'SILK DAMASK',
      name: 'Van Phuc Silk Village',
      desc: 'Revered source of fine silk renowned for smooth breathable density, jacquard pattern loom weaving, and authentic natural botanical vat dyes.',
      slots: 'Available',
      tags: ['Jacquard Silk', 'Natural Dye'],
      img: '/craft/van-phuc-silk.jpg',
    },
    {
      id: phuVinhId,
      highlight: 'BAMBOO / LEAF',
      location: 'Thanh Oai • Hanoi',
      era: 'EST. 17TH CENTURY',
      type: 'PALM & BAMBOO',
      name: 'Chuong Conical Hat Village',
      desc: 'Specialized craft collective producing iconic conical hats from sun-cured palm leaves, 16 bamboo scaffolds, and intricate ceremonial silk.',
      slots: 'Available',
      tags: ['Palm Leaves', 'Bamboo Frame'],
      img: '/craft/chuong-conical-hat.jpg',
    },
    {
      id: chuongId,
      highlight: 'METALWORK',
      location: 'Ba Dinh • Hanoi',
      era: 'EST. 17TH CENTURY',
      type: 'LOST-WAX BRONZE',
      name: 'Ngu Xa Bronze Casting',
      desc: 'Urban artisan peninsula known for ceremonial bronze bells, copper statuary, and ancient beeswax lost-mold foundry methods.',
      slots: 'Available',
      tags: ['Lost-Wax', 'Copper Statuary'],
      img: '/craft/ngu-xa-bronze.jpg',
    },
  ]

  const masterclasses = [
    {
      id: provider1Id,
      providerId: provider1Id,
      experienceId: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
      village: 'Bat Trang',
      duration: '3.0 Hours',
      type: 'Centering & Glaze',
      capacityAgency: 'Capacity: 4 - 16 Pax',
      capacityGuest: 'Pax: 6 - 14',
      name: 'Wheel-Throwing & Celadon Glaze Masterclass',
      rateVND: 320000,
      desc: 'Hands-on instruction from national pottery masters. Includes personal potter\'s wheel station, high-fire wood & gas kiln explanations, and export-grade bubble packing for finished work.',
      label: 'BAT TRANG CERAMIC',
      booking: 'INSTANT BOOK ALLOTMENT',
      img: '/craft/wheel-throwing-masterclass.jpg',
    },
    {
      id: 'van-phuc-1',
      providerId: '70efa801-a908-5e16-8510-fd094fbdc020',
      experienceId: 'c8281688-2dc1-5cb1-9ff6-139df04ba562',
      village: 'Van Phuc',
      duration: '3.5 Hours',
      type: 'Treadle Loom & Indigo',
      capacityAgency: 'Capacity: 4 - 10 Pax',
      capacityGuest: 'Pax: 4 - 10',
      name: 'Silk Jacquard Weaving & Organic Indigo Dye',
      rateVND: 380000,
      desc: 'Master artisan demonstration of 1,000-year-old shuttle weaving techniques followed by natural fermented indigo dye bath for pure silk scarves.',
      label: 'VAN PHUC SILK',
      booking: 'INSTANT BOOK ALLOTMENT',
      img: '/craft/van-phuc-silk.jpg',
    },
  ]

  const excursions = [
    {
      village: 'Thanh Oai',
      duration: '1.5 Hours',
      name: 'Palm Leaf Conical Hat Stitching',
      capacity: '≤ 25 pax',
      rateVND: 180000,
      desc: 'Interactive stitching session in village communal yard. Each guest crafts a personalized Non La with silk chin-strap under elder guidance.',
      label: 'CHUONG VILLAGE',
      providerId: '867719ea-c962-56a1-a88c-3f96e8d0af65',
      experienceId: 'b70bd0fa-6a81-5aec-9ff6-5303210b2fad',
      img: '/craft/chuong-conical-hat.jpg',
    },
    {
      village: 'Thuong Tin',
      duration: '2.0 Hours',
      name: 'Eggshell Inlay & Lacquer Polishing',
      capacity: '≤ 18 pax',
      rateVND: 390000,
      desc: 'Fine natural resin layering, real duck eggshell cracked mosaic inlay, and water-sandpaper polishing on wooden lacquered plates.',
      label: 'HA THAI LACQUER',
      providerId: '3a5d2ffc-79fa-5b75-a1e6-82beea3bed59',
      experienceId: '800b5192-03c7-5953-849b-32a321e12a47',
      img: '/craft/lacquer-excursion.jpg',
    },
    {
      village: 'Thach That',
      duration: '1.5 Hours',
      name: 'Bamboo Paper Fan Calligraphy',
      capacity: '≤ 30 pax',
      rateVND: 160000,
      desc: 'Assembly of 32-rib bamboo folding fans and traditional Sino-Vietnamese brush calligraphy with elder village scholar.',
      label: 'CHANG SON FANS',
      img: '/craft/bat-trang-pottery.jpg',
    },
  ]

  const specialistGuilds = [
    {
      rank: '01',
      location: 'Ngu Xa Peninsula',
      type: 'Wax-Clay Mold Casting',
      capacity: 'Max 8 Pax',
      name: 'Beeswax Core Modeling & Precision Copper Chasing',
      desc: 'Exclusive atelier visit to Hanoi\'s last remaining bronze lost-wax master. Observe red-hot crucibles, molten alloy blending, and cold burin chasing.',
      rateVND: 420000,
      label: 'BRONZE FOUNDRY',
    },
    {
      rank: '02',
      location: 'Chuyen My Village',
      type: 'Abalone Shell Inlay',
      capacity: 'Max 10 Pax',
      name: 'Abalone Shell Sawing & Rosewood Marquetry',
      desc: 'Delicate micro-fretwork sawing of luminescent abalone and mother-of-pearl nacre, fitted meticulously into aged timber relief carvings.',
      rateVND: 350000,
      label: 'MOTHER-OF-PEARL',
    },
  ]

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#ffffff', minHeight: '100vh' }}>
      <RoleNavbar
        agencyId={agencyId}
        breadcrumbs={
          isGuest ? (
            <>PUBLIC CATALOG / <span style={{ color: '#111827' }}>EXPLORE CRAFT VILLAGES (EXP120)</span></>
          ) : (
            <>B2B DISCOVERY &amp; WHOLESALE BOOKING / <strong>REGISTRY CODEX VN-2025</strong></>
          )
        }
      />

      {/* Page header */}
      <div style={{ padding: '1.5rem 2rem 0.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#111827', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
          Explore Craft Villages &amp; Artisan Experiences
        </h1>
        <p style={{ fontSize: '0.88rem', color: '#6b7280', margin: '0 0 1.25rem 0', lineHeight: 1.6 }}>
          {isGuest
            ? 'Discover traditional Vietnamese craft heritage, multi-tier village clusters, and book verified master workshops tailored for inbound itineraries.'
            : 'Discover traditional Vietnamese craft heritage, verified village clusters, and direct allotment master workshops for inbound itineraries.'}
        </p>

        {/* Search bar — matching EXP017.png and EXP120.png */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center' }}>
              <IconSearch size={16} color="#9ca3af" />
            </span>
            <input
              type="text"
              placeholder={isGuest ? 'Filter craft type, village, or keywords...' : 'Search craft type, village, or keyword (or describe tour group)...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.75rem 1rem 0.75rem 2.6rem',
                border: '1px solid #d1d5db', borderRadius: '3px',
                fontSize: '0.88rem', color: '#111827',
              }}
            />
          </div>

          {/* AI Tour Matching button */}
          {isAgency && (
            <Link
              href="/matching"
              style={{
                background: '#111827', color: '#ffffff', border: 'none',
                padding: '0.75rem 1.25rem', borderRadius: '3px',
                fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '0.5rem',
                flexShrink: 0,
              }}
            >
              <IconSparkles size={14} color="#ffffff" />
              <span>AI TOUR MATCHING</span>
            </Link>
          )}

          {isGuest && (
            <button
              onClick={() => {
                setToastMessage('AI Tour Matching requires verified Tour Agency authentication.')
                setTimeout(() => setToastMessage(null), 3000)
              }}
              style={{
                background: '#111827', color: '#ffffff', border: 'none',
                padding: '0.75rem 1.25rem', borderRadius: '3px',
                fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              AI Tour Matching
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 4rem' }}>

        {/* SECTION 1: Featured Craft Village Experiences */}
        <section style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 1rem 0' }}>
            Featured Craft Village Experiences
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {craftVillages.map(v => (
              <div key={v.id} style={{
                border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden',
                background: '#ffffff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.2s ease, transform 0.2s ease',
              }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
              >
                <div>
                  {/* Real craft image with overlay badges */}
                  <div style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden' }}>
                    <img
                      src={v.img}
                      alt={v.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                    {/* Dark gradient overlay at bottom */}
                    <div style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, transparent 45%, rgba(0,0,0,0.55) 100%)'
                    }} />
                    {/* Top badge */}
                    <div style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', right: '0.6rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.05em',
                        background: 'rgba(17,24,39,0.85)', backdropFilter: 'blur(4px)',
                        color: '#ffffff', padding: '3px 7px', borderRadius: '3px',
                      }}>
                        {isGuest ? v.highlight : 'VERIFIED CLUSTER'}
                      </span>
                      {isGuest && v.highlightDist && (
                        <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#ffffff', background: 'rgba(0,0,0,0.45)', padding: '2px 6px', borderRadius: '3px' }}>
                          {v.highlightDist}
                        </span>
                      )}
                    </div>
                    {/* Bottom overlay: location */}
                    <div style={{ position: 'absolute', bottom: '0.6rem', left: '0.75rem', right: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#ffffff', textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}>{v.type}</div>
                        {!isGuest && <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.8)' }}>{v.location}</div>}
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '0.9rem' }}>
                    <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>{v.era}</div>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#111827', marginBottom: '0.4rem', lineHeight: 1.3 }}>{v.name}</div>

                    {isGuest && v.tags && (
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                        {v.tags.map(t => (
                          <span key={t} style={{ fontSize: '0.6rem', color: '#4b5563', background: '#f3f4f6', padding: '2px 7px', borderRadius: '20px', border: '1px solid #e5e7eb', fontWeight: 600 }}>
                            {t}
                          </span>
                        ))}
                      </div>
                    )}

                    <div style={{ fontSize: '0.74rem', color: '#6b7280', lineHeight: 1.5, marginBottom: '0.5rem' }}>{v.desc}</div>
                  </div>
                </div>

                <div style={{ padding: '0 0.9rem 0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: isGuest ? 'flex-end' : 'space-between', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '0.65rem' }}>
                    {!isGuest && (
                      <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                        {v.slots}
                      </span>
                    )}
                    <Link
                      href={`/village/${v.id}`}
                      style={{ fontSize: '0.72rem', fontWeight: 800, color: '#111827', textDecoration: 'none', letterSpacing: '0.02em' }}
                    >
                      {isGuest ? 'Details →' : 'VIEW DETAILS →'}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* EXP120 GUEST BANNER: B2B CONTRACT RATES & PRIVATE MASTER SLOTS */}
        {isGuest && (
          <div style={{
            border: '1px solid #e5e7eb', borderRadius: '4px', padding: '1.25rem 1.5rem',
            marginBottom: '2.5rem', background: '#fafafa',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.3rem' }}>
                <IconLock size={12} color="#4b5563" />
                <span>B2B Contract Rates &amp; Private Master Slots</span>
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginBottom: '0.2rem' }}>
                Are you a Tour Operator or Inbound Agency?
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280', maxWidth: '680px' }}>
                Sign in to access live artisan schedules, real-time group allotment confirmation, and net B2B wholesale rates with dedicated coordinators.
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.6rem' }}>
              <button
                onClick={() => {
                  setCurrentRole('TourAgency')
                  setRole('TourAgency')
                  router.push('/explore')
                }}
                className="spec-btn-black"
                style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700 }}
              >
                Sign In to Access
              </button>
              <button
                onClick={() => {
                  setCurrentRole('TourAgency')
                  setRole('TourAgency')
                  router.push('/explore')
                }}
                className="spec-btn-white"
                style={{ padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700 }}
              >
                Register Agency
              </button>
            </div>
          </div>
        )}

        {/* SECTION 2: Immersive Masterclasses */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
                Immersive Masterclasses (Group &amp; Academic Focus)
              </h2>
              {isGuest && (
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                  Comprehensive 2.5h - 4h hands-on training with verified village masters. Includes individual workstations.
                </p>
              )}
            </div>
            <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>
              {isAgency ? (
                <>Currency Display: <strong>VND (₫) Net Rate</strong></>
              ) : (
                <>Min 4 — Max 15 Pax</>
              )}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {masterclasses.map(m => (
              <div
                key={m.id}
                onClick={() => handleExperienceClick(m.name, m.providerId, m.experienceId)}
                style={{
                  border: '1px solid #e5e7eb', borderRadius: '8px', background: '#ffffff',
                  display: 'grid', gridTemplateColumns: isGuest ? '140px 1fr auto' : '140px 1fr auto',
                  gap: '1.25rem', alignItems: 'center',
                  padding: '1rem', cursor: 'pointer', transition: 'all 0.2s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 6px 20px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
              >
                {/* Real workshop image */}
                <div style={{ position: 'relative', borderRadius: '6px', overflow: 'hidden', aspectRatio: '4/3', flexShrink: 0 }}>
                  <img src={m.img} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', bottom: '0.4rem', left: '0.4rem' }}>
                    <span style={{ fontSize: '0.55rem', fontWeight: 800, background: 'rgba(17,24,39,0.82)', backdropFilter: 'blur(3px)', color: '#fff', padding: '2px 5px', borderRadius: '2px', letterSpacing: '0.04em' }}>{m.label}</span>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', fontSize: '0.72rem', color: '#6b7280', fontWeight: 600, alignItems: 'center' }}>
                    <span>{m.village}</span>
                    <span>·</span>
                    <span>{m.duration}</span>
                    <span>·</span>
                    <span>{m.type}</span>
                    {!isGuest && (
                      <>
                        <span>·</span>
                        <span>{m.capacityAgency}</span>
                      </>
                    )}
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      handleExperienceClick(m.name, m.providerId, m.experienceId)
                    }}
                    style={{ fontWeight: 800, fontSize: '1rem', color: '#111827', marginBottom: '0.35rem', cursor: 'pointer' }}
                  >
                    {m.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.5 }}>{m.desc}</div>

                  {/* Guest capacity pill per EXP120 */}
                  {isGuest && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.68rem', color: '#4b5563', background: '#f3f4f6', border: '1px solid #e5e7eb', padding: '1px 6px', borderRadius: '2px' }}>
                        {m.capacityGuest}
                      </span>
                    </div>
                  )}
                </div>

                {/* Right action/pricing column */}
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {/* CRITICAL: ONLY SHOW PRICE FOR TOUR AGENCY, STRICTLY HIDE FOR GUEST */}
                  {!isGuest ? (
                    <>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#111827' }}>₫{m.rateVND.toLocaleString()}</div>
                      <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>/ pax</div>
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', justifyContent: 'flex-end' }}>
                        <Link
                          href={`/provider/${m.providerId}/experiences/${m.experienceId}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            border: '1px solid #111827', background: '#ffffff', color: '#111827', padding: '0.4rem 0.75rem',
                            borderRadius: '2px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none',
                          }}
                        >
                          View Details
                        </Link>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            router.push('/messages')
                          }}
                          style={{
                            background: '#111827', color: '#ffffff', border: 'none',
                            padding: '0.4rem 0.75rem', borderRadius: '2px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          {m.booking}
                        </button>
                      </div>
                    </>
                  ) : (
                    /* GUEST VIEW: NO PRICE, LOCKED RATE & SLOTS BUTTON */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                      <Link
                        href={`/provider/${m.providerId}/experiences/${m.experienceId}`}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          border: '1px solid #d1d5db', background: '#ffffff', color: '#111827', padding: '0.4rem 0.75rem',
                          borderRadius: '2px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none',
                        }}
                      >
                        View Details
                      </Link>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setToastMessage('Pricing and schedules are restricted to verified Tour Operators.')
                          setTimeout(() => setToastMessage(null), 3000)
                        }}
                        style={{
                          background: '#f9fafb', color: '#4b5563', border: '1px solid #d1d5db',
                          padding: '0.4rem 0.75rem', borderRadius: '2px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                        }}
                      >
                        <IconLock size={12} color="#6b7280" />
                        <span>Agency Rate &amp; Slots</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: Half-Day & Cultural Excursions */}
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              Half-Day &amp; Cultural Excursions
            </h2>
            {isGuest && (
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                Shorter format (1.5h - 2h) ideal for pairing with city tours, culinary excursions, and school travel.
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            {excursions.map(ex => (
              <div
                key={ex.name}
                onClick={() => handleExperienceClick(ex.name, ex.providerId, ex.experienceId)}
                style={{
                  border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', background: '#ffffff',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                  cursor: 'pointer', transition: 'all 0.2s ease',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.05)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)' }}
              >
                <div>
                  {/* Real excursion image */}
                  <div style={{ position: 'relative', aspectRatio: '16/9', overflow: 'hidden' }}>
                    <img src={ex.img ?? '/craft/bat-trang-pottery.jpg'} alt={ex.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.5) 100%)' }} />
                    <div style={{ position: 'absolute', bottom: '0.5rem', left: '0.6rem' }}>
                      <span style={{ fontSize: '0.58rem', fontWeight: 800, background: 'rgba(17,24,39,0.8)', backdropFilter: 'blur(3px)', color: '#fff', padding: '2px 6px', borderRadius: '2px', letterSpacing: '0.04em' }}>{ex.label}</span>
                    </div>
                  </div>

                  <div style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.3rem' }}>
                      <span>{ex.village}</span>
                      <span>{ex.duration}</span>
                    </div>
                    <div
                      onClick={(e) => {
                        e.stopPropagation()
                        handleExperienceClick(ex.name, ex.providerId, ex.experienceId)
                      }}
                      style={{ fontWeight: 800, fontSize: '0.92rem', color: '#111827', marginBottom: '0.4rem', cursor: 'pointer' }}
                    >
                      {ex.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#4b5563', lineHeight: 1.5, marginBottom: '0.6rem' }}>Capacity: {ex.capacity}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', lineHeight: 1.5, marginBottom: '0.75rem' }}>{ex.desc}</div>
                  </div>
                </div>

                <div style={{ padding: '0 1rem 1rem 1rem', display: 'flex', justifyContent: isGuest ? 'center' : 'space-between', alignItems: 'center' }}>
                  {/* CRITICAL: ONLY SHOW PRICE FOR TOUR AGENCY, HIDE FOR GUEST */}
                  {!isGuest ? (
                    <>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', color: '#111827' }}>
                          ₫{ex.rateVND.toLocaleString()} <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#6b7280' }}>/ pax</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push('/messages')
                        }}
                        style={{
                          background: '#111827', color: '#ffffff', border: 'none',
                          padding: '0.45rem 0.85rem', borderRadius: '2px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        Book Experience
                      </button>
                    </>
                  ) : (
                    /* GUEST VIEW: LOCK CALLOUT BUTTON */
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setToastMessage('Group quotes are restricted to verified Tour Operators.')
                        setTimeout(() => setToastMessage(null), 3000)
                      }}
                      style={{
                        width: '100%',
                        border: '1px solid #d1d5db', background: '#f9fafb', color: '#374151',
                        padding: '0.45rem', borderRadius: '2px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                      }}
                    >
                      <IconLock size={12} color="#6b7280" />
                      <span>Agency Group Quote</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 4: Endangered & Living Heritage */}
        <section>
          <div style={{ marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              Endangered &amp; Living Heritage (Specialist Guilds)
            </h2>
            {isGuest && (
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
                Low-volume, master-led cultural preservation visits. Strict pax caps and advance agency verification.
              </p>
            )}
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', overflow: 'hidden', background: '#ffffff' }}>
            {specialistGuilds.map((g, idx) => (
              <div
                key={g.rank}
                onClick={() => handleExperienceClick(g.name)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isGuest ? '110px 1fr auto' : '40px 1fr auto',
                  gap: '1.25rem', alignItems: 'center',
                  padding: '1rem 1.25rem', borderBottom: idx < specialistGuilds.length - 1 ? '1px solid #f3f4f6' : 'none',
                  cursor: 'pointer', transition: 'background 0.15s ease',
                }}
              >
                {isGuest ? (
                  <div style={{
                    background: '#f3f4f6', height: '65px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', color: '#9ca3af', textAlign: 'center', borderRadius: '2px', padding: '0.25rem',
                  }}>
                    <IconPhoto size={18} color="#9ca3af" />
                    <span style={{ marginTop: '2px' }}>[ {g.label} ]</span>
                  </div>
                ) : (
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#9ca3af' }}>{g.rank}</div>
                )}

                <div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.2rem' }}>
                    <span>{g.location}</span> · <span>{g.type}</span>
                    {!isGuest && <> · <span>{g.capacity}</span></>}
                  </div>
                  <div
                    onClick={(e) => {
                      e.stopPropagation()
                      handleExperienceClick(g.name)
                    }}
                    style={{ fontWeight: 800, fontSize: '0.9rem', color: '#111827', cursor: 'pointer', marginBottom: '0.2rem' }}
                  >
                    {g.name}
                  </div>
                  {isGuest && (
                    <div style={{ fontSize: '0.73rem', color: '#6b7280', lineHeight: 1.45 }}>{g.desc}</div>
                  )}
                </div>

                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {/* CRITICAL: ONLY SHOW PRICE FOR TOUR AGENCY, HIDE FOR GUEST */}
                  {!isGuest ? (
                    <>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>₫{g.rateVND.toLocaleString()}</div>
                      <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>/ pax</div>
                    </>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>{g.capacity}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setToastMessage('Master availability is restricted to verified Tour Operators.')
                          setTimeout(() => setToastMessage(null), 3000)
                        }}
                        style={{
                          background: '#f9fafb', color: '#374151', border: '1px solid #d1d5db',
                          padding: '0.4rem 0.75rem', borderRadius: '2px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.35rem',
                        }}
                      >
                        <IconLock size={12} color="#6b7280" />
                        <span>Request Master Availability</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>

      {/* Footer matching EXP017 / EXP120 */}
      <footer style={{
        borderTop: '1px solid #e5e7eb', padding: '1.5rem 2rem', background: '#fafafa', fontSize: '0.75rem', color: '#6b7280',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong>HANOI ARTISAN BRIDGE</strong> · TRADITIONAL ARTISANAL HERITAGE · CURATED B2B PLATFORM
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span style={{ cursor: 'pointer' }}>OPERATOR COMPLIANCE</span>
            <span style={{ cursor: 'pointer' }}>MASTER VILLAGE CODEX</span>
            <span style={{ cursor: 'pointer' }}>B2B DISPATCH SUPPORT</span>
          </div>
        </div>
        <div style={{ maxWidth: '1200px', margin: '0.5rem auto 0', fontSize: '0.68rem', color: '#9ca3af' }}>
          © 2025 VIETNAM CRAFT VILLAGES NETWORK. ALL RIGHTS RESERVED.
        </div>
      </footer>

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div style={{
          position: 'fixed', top: '70px', right: '24px', zIndex: 9999,
          background: '#111827', color: '#ffffff', border: '1px solid #374151',
          padding: '0.85rem 1.25rem', borderRadius: '4px', fontSize: '0.82rem',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)', maxWidth: '440px', lineHeight: 1.5,
        }}>
          {toastMessage}
        </div>
      )}
    </div>
  )
}
