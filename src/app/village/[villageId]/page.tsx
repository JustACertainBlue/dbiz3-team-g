'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import RoleNavbar from '@/app/components/RoleNavbar'
import { getCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'
import {
  IconCheck,
  IconPin,
  IconPhoto,
  IconBus,
  IconShield,
  IconLock,
  IconClock,
  IconUsers,
} from '@/app/components/Icons'

interface VillageInfo {
  village_id: string
  name: string
  vietnamese_name: string
  district: string
  city_province: string
  source_code: string
  lineage: string
  ateliers: string
  proximity: string
  coach_capacity: string
  description: string
}

export default function VillageProfilePage({
  params,
}: {
  params: { villageId: string }
}) {
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [mounted, setMounted] = useState(false)

  const ownProviderId = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
  const competitor1Id = '61a3d9eb-4a05-5d7f-c4f4-b2c0c24d6485'
  const competitor2Id = '72b4e0fc-5b16-6e80-d5a5-c3d1d35e7596'

  const village: VillageInfo = {
    village_id: params.villageId,
    name: 'Bat Trang Ceramic Village',
    vietnamese_name: 'Làng gốm sứ Bát Tràng',
    district: 'Gia Lam',
    city_province: 'Hanoi',
    source_code: 'DEMO-HN-BATTRANG',
    lineage: '1,000+',
    ateliers: '45',
    proximity: '14 KM',
    coach_capacity: '45-SEAT',
    description:
      'Over 1,000 years of ceramic heritage situated along the eastern bank of the Red River. Internationally acknowledged for hand-thrown stoneware, proprietary rice-husk ash glazing, and celebrated celadon, blue-and-white, and crackle glaze lineages operated by multigenerational master kilns.',
  }

  useEffect(() => {
    setMounted(true)
    setRole(getCurrentRole())
    const onRoleChanged = () => setRole(getCurrentRole())
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  if (!mounted) {
    return (
      <div className="spec-portal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p style={{ fontWeight: 700, color: '#4b5563' }}>LOADING VILLAGE PROFILE (VIL030)...</p>
      </div>
    )
  }

  const isLocalProvider = role === 'LocalProvider'
  const isAgency = role === 'TourAgency'
  const isUBND = role === 'UBND'
  const isGuest = role === 'Guest'

  const registeredProviders = [
    {
      id: ownProviderId,
      code: '#BT-PRV-01',
      category: 'GUILD MASTER / OWNER',
      name: 'Hung Thinh Artisan Pottery Workshop',
      vietnameseSubtitle: 'Xưởng gốm nghệ nhân Hưng Thịnh',
      master: 'Master Nguyen Van Hung (4th Generation Guild Master)',
      focus: 'Hand-wheel Throwing, Wood Dragon Kiln & Ash Glaze',
      inventory: '3 Experiences Available',
      isOwn: isLocalProvider,
    },
    {
      id: competitor1Id,
      code: '#BT-PRV-02',
      category: 'FAMILY GUILD (3RD GEN)',
      name: 'Trieu Van Mau Ceramics Studio',
      vietnameseSubtitle: 'Xưởng gốm Triệu Văn Mão',
      master: 'Master Trieu Van Mau Guild',
      focus: 'Celadon Reproduction & Bisque Painting',
      inventory: '2 Experiences Available',
      isOwn: false,
    },
    {
      id: competitor2Id,
      code: '#BT-PRV-03',
      category: 'ARTISAN COLLECTIVE',
      name: 'Dong Huong Heritage Kiln Cooperative',
      vietnameseSubtitle: 'Hợp tác xã gốm cổ Đông Hương',
      master: 'Master Nguyen Thi Dong',
      focus: 'Architectural Terracotta & Ceremonial Vessels',
      inventory: '2 Experiences Available',
      isOwn: false,
    },
  ]

  const featuredExperiences = [
    {
      id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
      providerId: ownProviderId,
      tag: 'HANDS-ON WORKSHOP',
      host: 'Hung Thinh Artisan Pottery Workshop',
      title: 'Hand-Wheel Throwing & Glazing Masterclass — Main Studio',
      desc: '2.5-hour hands-on instruction with a guild master. Learn historical centering, kick-wheel pulling, trimming, and traditional ash glaze dipping.',
      duration: '2.5 Hours',
      capacity: 'Max 15 Pax',
      rateVND: 320000,
    },
    {
      id: 'c8281688-2dc1-5cb1-9ff6-139df04ba562',
      providerId: ownProviderId,
      tag: 'MASTERCLASS',
      host: 'Hung Thinh Artisan Pottery Workshop',
      title: 'Historical Blue-and-White (Men Lam) Painting Workshop',
      desc: 'Discover proprietary rice-husk ash recipes and fine calligraphy brushwork on bisqueware inspired by Le & Nguyen imperial dynasty styles.',
      duration: '3.0 Hours',
      capacity: 'Max 12 Pax',
      rateVND: 270000,
    },
    {
      id: '800b5192-03c7-5953-849b-32a321e12a47',
      providerId: ownProviderId,
      tag: 'DEMONSTRATION & CEREMONY',
      host: 'Hung Thinh Artisan Pottery Workshop',
      title: 'Dragon Kiln Firing & Private Atelier Tea Ceremony',
      desc: 'Curated evening presentation of continuous wood-firing kiln reduction, accompanied by master dialogue and lotus tea service.',
      duration: '4.0 Hours',
      capacity: 'Max 20 Pax',
      rateVND: 420000,
    },
  ]

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#ffffff', minHeight: '100vh' }}>
      <RoleNavbar
        breadcrumbs={
          isLocalProvider ? (
            <>HOME / CRAFT VILLAGES / <span style={{ color: '#111827', fontWeight: 700 }}>{village.name.toUpperCase()}</span></>
          ) : isAgency ? (
            <>HOME / CRAFT VILLAGES / <span style={{ color: '#111827', fontWeight: 700 }}>{village.name.toUpperCase()}</span></>
          ) : isUBND ? (
            <>UBND AUDIT / CRAFT VILLAGES / <span style={{ color: '#ffffff', fontWeight: 700 }}>{village.name.toUpperCase()}</span></>
          ) : (
            <>PUBLIC CATALOG / <span style={{ color: '#111827', fontWeight: 700 }}>{village.name.toUpperCase()} (VIL030)</span></>
          )
        }
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.5rem 2rem 4rem' }}>

        {/* HERO SECTION matching VIL030.png (Split 60/40 layout) */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem',
          marginBottom: '2.5rem', alignItems: 'start',
        }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#f3f4f6', color: '#111827', padding: '3px 8px', borderRadius: '2px', fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
              <IconCheck size={12} color="#111827" />
              <span>National Intangible Cultural Heritage • Est. 14th Century</span>
            </div>

            <h1 style={{ fontSize: '2.3rem', fontWeight: 800, color: '#111827', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
              {village.name}
            </h1>
            <div style={{ fontSize: '1rem', color: '#6b7280', marginBottom: '0.75rem' }}>
              ({village.vietnamese_name})
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6b7280', fontSize: '0.82rem', marginBottom: '1.25rem' }}>
              <IconPin size={14} color="#6b7280" />
              <span>Red River Basin, {village.district} District, {village.city_province} (14km southeast of Old Quarter)</span>
            </div>

            <p style={{ fontSize: '0.86rem', color: '#4b5563', lineHeight: 1.6, margin: 0 }}>
              {village.description}
            </p>
          </div>

          {/* Village hero image */}
          <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
            <img
              src="/craft/bat-trang-pottery.jpg"
              alt="Craft Village"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0,0,0,0.12) 0%, transparent 60%, rgba(0,0,0,0.4) 100%)' }} />
            <div style={{ position: 'absolute', top: '1rem', left: '1rem' }}>
              <span style={{ fontSize: '0.62rem', fontWeight: 800, background: 'rgba(17,24,39,0.8)', backdropFilter: 'blur(4px)', color: '#ffffff', padding: '4px 10px', borderRadius: '4px', letterSpacing: '0.06em' }}>
                DOCUMENTARY
              </span>
            </div>
            <div style={{ position: 'absolute', bottom: '1rem', left: '1rem', right: '1rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                Authentic craft village · Bat Trang, Gia Lam, Hanoi
              </div>
            </div>
          </div>
        </div>

        {/* 4 STAT CARDS matching VIL030.png (SPEC 01 // SPEC 02 // SPEC 03 // SPEC 04) */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3.5rem',
        }}>
          <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', background: '#ffffff' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SPEC 01 // HERITAGE
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: '0.35rem 0 0.15rem 0' }}>
              {village.lineage}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827', marginBottom: '0.35rem' }}>Years Lineage</div>
            <div style={{ fontSize: '0.68rem', color: '#6b7280', lineHeight: 1.4 }}>
              Continuous ceramic manufacturing documentation tracked to Ly dynasty records.
            </div>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', background: '#ffffff' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SPEC 02 // GUILDS
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: '0.35rem 0 0.15rem 0' }}>
              {village.ateliers}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827', marginBottom: '0.35rem' }}>Active Ateliers</div>
            <div style={{ fontSize: '0.68rem', color: '#6b7280', lineHeight: 1.4 }}>
              Verified master studios and registered craft collectives open to delegations.
            </div>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', background: '#ffffff' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SPEC 03 // PROXIMITY
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: '0.35rem 0 0.15rem 0' }}>
              {village.proximity}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827', marginBottom: '0.35rem' }}>From Hanoi Center</div>
            <div style={{ fontSize: '0.68rem', color: '#6b7280', lineHeight: 1.4 }}>
              Direct south-east highway transit corridors; estimated 25-35 minutes vehicle travel.
            </div>
          </div>

          <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', background: '#ffffff' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              SPEC 04 // LOGISTICS
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#111827', margin: '0.35rem 0 0.15rem 0' }}>
              {village.coach_capacity}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#111827', marginBottom: '0.35rem' }}>Coach Staging</div>
            <div style={{ fontSize: '0.68rem', color: '#6b7280', lineHeight: 1.4 }}>
              Designated terminal at Bat Trang Cultural Center with turnaround bay and charging docks.
            </div>
          </div>
        </div>

        {/* [02] GUILD DIRECTORY: hidden from LocalProvider — they cannot see competitor cards */}
        {!isLocalProvider && (
        <section style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                [02] GUILD DIRECTORY
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0.2rem 0 0 0' }}>
                Registered Village Providers
              </h2>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#6b7280', maxWidth: '440px', textAlign: 'right' }}>
              Vetted community partners meeting municipal safety protocols, authentic raw material standards, and group capacity thresholds.
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {registeredProviders.map(p => (
              <div
                key={p.id}
                style={{
                  border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.5rem', background: '#ffffff',
                  display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#4b5563', background: '#f3f4f6', padding: '2px 6px', borderRadius: '2px' }}>
                      {p.category}
                    </span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af' }}>{p.code}</span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: '0 0 0.2rem 0' }}>
                    {p.name}
                  </h3>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
                    {p.vietnameseSubtitle}
                  </div>

                  <div style={{ fontSize: '0.76rem', color: '#4b5563', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                    <div><strong>MASTER:</strong> {p.master}</div>
                    <div><strong>FOCUS:</strong> {p.focus}</div>
                    <div><strong>INVENTORY:</strong> <span style={{ color: '#059669', fontWeight: 700 }}>{p.inventory}</span></div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <Link
                    href={`/provider/${p.id}`}
                    style={{
                      background: '#111827', color: '#ffffff', textAlign: 'center', padding: '0.55rem',
                      borderRadius: '2px', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none',
                    }}
                  >
                    View Provider Profile →
                  </Link>

                  {/* Secondary action: Chat with Provider (only for authenticated Agency) */}
                  {isAgency && (
                    <button
                      onClick={() => alert(`Starting direct chat with ${p.name}`)}
                      style={{
                        background: '#ffffff', color: '#111827', border: '1px solid #d1d5db',
                        padding: '0.45rem', borderRadius: '2px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      Chat with Provider
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
        )}

        {/* [03] BOOKABLE MODULES: Featured Experiences in Village matching VIL030.png */}
        <section style={{ marginBottom: '3.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                [03] BOOKABLE MODULES
              </div>
              <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0.2rem 0 0 0' }}>
                Featured Experiences in Village
              </h2>
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280' }}>
              TOTAL: 07 MODULES
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {featuredExperiences.map(exp => (
              <div
                key={exp.id}
                style={{
                  border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem 1.5rem', background: '#ffffff',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: 1, minWidth: '320px' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#f3f4f6', color: '#111827', padding: '1px 6px', borderRadius: '2px' }}>
                      {exp.tag}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Host: {exp.host}</span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: '0 0 0.35rem 0' }}>
                    {exp.title}
                  </h3>
                  <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: 0, lineHeight: 1.5, maxWidth: '640px' }}>
                    {exp.desc}
                  </p>
                </div>

                {/* Right stats row */}
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', textAlign: 'center', flexShrink: 0 }}>
                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>DURATION</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827', marginTop: '0.15rem' }}>{exp.duration}</div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>CAPACITY</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827', marginTop: '0.15rem' }}>
                      {isGuest ? (
                        <span style={{ color: '#9ca3af', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <IconLock size={10} color="#9ca3af" /> Locked
                        </span>
                      ) : (
                        exp.capacity
                      )}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase' }}>TARIFF</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827', marginTop: '0.15rem' }}>
                      {isGuest ? (
                        <span style={{ color: '#9ca3af', fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <IconLock size={10} color="#9ca3af" /> Locked
                        </span>
                      ) : (
                        `₫${exp.rateVND.toLocaleString()} / pax`
                      )}
                    </div>
                  </div>

                  <div>
                    <Link
                      href={`/provider/${exp.providerId}/experiences/${exp.id}`}
                      style={{
                        background: '#111827', color: '#ffffff', padding: '0.5rem 1rem', borderRadius: '2px',
                        fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none', display: 'inline-block',
                      }}
                    >
                      View Details ›
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* [04] GOVERNANCE & [05] FIELD LOGISTICS matching VIL030.png */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
          {/* [04] Governance */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              [04] GOVERNANCE &amp; ADMINISTRATION
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0.25rem 0 0.5rem 0' }}>
              Village Governance &amp; Heritage Codex
            </h3>
            <p style={{ fontSize: '0.78rem', color: '#6b7280', lineHeight: 1.5, margin: '0 0 1rem 0' }}>
              Bat Trang Ceramic Village operates under joint operational oversight by the Gia Lam District People&apos;s Committee (UBND Xã Bát Tràng) and the Hanoi Department of Tourism. All registered B2B activities comply with Hanoi Municipal Traditional Trade Village Preservation Decree 42/2019.
            </p>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1rem', background: '#fafafa' }}>
              <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                HERITAGE INTEGRITY METRICS
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#4b5563', padding: '0.3rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <span>Raw Ceramic Clay Stewardship:</span>
                <strong>100% Certified</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#4b5563', padding: '0.3rem 0', borderBottom: '1px solid #f3f4f6' }}>
                <span>Kiln Emission Standards:</span>
                <strong>Hanoi Grade A</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#4b5563', padding: '0.3rem 0' }}>
                <span>Artisan Labor Welfare Certification:</span>
                <strong>Annual Audit Jan 2025</strong>
              </div>
            </div>
          </div>

          {/* [05] Field Logistics */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              [05] FIELD LOGISTICS
            </div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0.25rem 0 0.5rem 0' }}>
              Visitor Access &amp; Ground Transport
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '0.85rem 1rem', background: '#fafafa', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <IconBus size={18} color="#111827" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827' }}>
                    Coach Parking &amp; Passenger Staging
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
                    Paved bus parking at Bat Trang Cultural Pier accommodates up to four 45-seat touring coaches concurrently. Free idling up to 30 mins.
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '0.85rem 1rem', background: '#fafafa', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <IconBus size={18} color="#111827" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827' }}>
                    Electric Shuttle Cart Routing
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
                    Transfer from bus bay to communal pavilion and narrow atelier alleys via 8-seater low-emissions electric carts running continuously every 10 minutes.
                  </div>
                </div>
              </div>

              <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '0.85rem 1rem', background: '#fafafa', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <IconShield size={18} color="#111827" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#111827' }}>
                    Agency Field Protocol
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px' }}>
                    Tour managers must display registered digital badges at the Village Administrative Gate for prioritized atelier access.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Footer matching VIL030.png */}
      <footer style={{
        borderTop: '1px solid #e5e7eb', padding: '1.5rem 2rem', background: '#fafafa', fontSize: '0.75rem', color: '#6b7280',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            HANOI ARTISAN BRIDGE © 2025 • B2B Cultural Heritage Operations
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span style={{ cursor: 'pointer' }}>Operator Terms</span>
            <span style={{ cursor: 'pointer' }}>Artisan Privacy Protocol</span>
            <span style={{ cursor: 'pointer' }}>Compliance &amp; Heritage Standards</span>
            <span style={{ cursor: 'pointer' }}>Support Desk</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
