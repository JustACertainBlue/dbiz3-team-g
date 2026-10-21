'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import RoleNavbar from '@/app/components/RoleNavbar'
import { getCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'
import {
  IconPin,
  IconClock,
  IconFileText,
  IconChat,
  IconEdit,
  IconEye,
  IconPhone,
  IconMail,
  IconShield,
  IconInfo,
  IconLock,
} from '@/app/components/Icons'

interface AgencyData {
  agency_id: string
  agency_name: string
  company_type: string
  location?: {
    street?: string
    district?: string
    city_province?: string
  }
  contact?: {
    contact_person_name?: string
    phone_number?: string
    business_email?: string
  }
  tax_id?: string
}

export default function AgencyProfilePage({
  params,
}: {
  params: { agencyId: string }
}) {
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [mounted, setMounted] = useState(false)
  const [agency, setAgency] = useState<AgencyData | null>(null)
  const [loading, setLoading] = useState(true)

  const ownAgencyId = '5fecc699-71e4-5bf0-ac1b-2090e05c2cd9'

  useEffect(() => {
    setMounted(true)
    setRole(getCurrentRole())
    const onRoleChanged = () => setRole(getCurrentRole())
    window.addEventListener('hab_role_changed', onRoleChanged)

    async function load() {
      try {
        const res = await fetch(`/api/prf/agency/${params.agencyId}`)
        if (res.ok) {
          const data = await res.json()
          setAgency(data)
        }
      } catch {
        // fallback
      } finally {
        setLoading(false)
      }
    }
    load()

    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [params.agencyId])

  if (!mounted || loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh', fontFamily: 'sans-serif' }}>
        <p style={{ fontWeight: 700, color: '#4b5563', letterSpacing: '0.04em' }}>LOADING AGENCY PROFILE (PRF019)...</p>
      </div>
    )
  }

  const isTourAgencyOwner = role === 'TourAgency' && params.agencyId === ownAgencyId
  const isGuest = role === 'Guest'

  const agencyName = agency?.agency_name || 'Indochina Heritage Voyages Co., Ltd.'
  const taxId = agency?.tax_id || '0108923456'

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fbfbfb', minHeight: '100vh', color: '#111827' }}>
      {/* Sub-bar navigation */}
      <RoleNavbar
        breadcrumbs={
          <>HOME / TRAVEL AGENCIES / <span style={{ color: '#111827', fontWeight: 700 }}>INDOCHINA HERITAGE VOYAGES</span></>
        }
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.75rem 2rem 4rem' }}>

        {/* HERO SECTION matching PRF019.png */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                VNAT #01-1452/2020/TCDL-GP LHQT
              </div>
              <h1 style={{ fontSize: '2.3rem', fontWeight: 800, color: '#111827', margin: '0 0 0.25rem 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                {agencyName}
              </h1>
              <div style={{ fontSize: '0.92rem', color: '#6b7280', fontStyle: 'italic', marginBottom: '1.25rem' }}>
                Công ty TNHH Du lịch Di sản Đông Dương
              </div>

              {/* Strip */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', fontSize: '0.8rem', color: '#4b5563', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <IconPin size={13} color="#6b7280" />
                  <span>42B Ly Thuong Kiet, Hoan Kiem District, Hanoi</span>
                </div>
                <span>•</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <IconClock size={13} color="#6b7280" />
                  <span>Est. 2012 • Active Operations</span>
                </div>
                <span>•</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <IconFileText size={13} color="#6b7280" />
                  <span>MST: <strong style={{ color: '#111827' }}>{taxId}</strong></span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#e5e7eb', padding: '1px 5px', borderRadius: '2px', color: '#374151', marginLeft: '4px' }}>
                    VERIFIED
                  </span>
                </div>
              </div>

              {/* Action row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                {isGuest ? (
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a',
                    padding: '6px 12px', borderRadius: '3px', fontSize: '0.75rem', fontWeight: 600,
                  }}>
                    <IconLock size={12} color="#92400e" />
                    <span>B2B contracting and direct operator chat restricted to verified accounts.</span>
                  </div>
                ) : (
                  <>
                    <Link
                      href="/messages"
                      style={{
                        background: '#ffffff', border: '1px solid #111827', color: '#111827',
                        padding: '0.55rem 1rem', borderRadius: '2px', fontSize: '0.78rem', fontWeight: 800,
                        textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                      }}
                    >
                      <IconChat size={14} color="#111827" />
                      <span>Contact Agency</span>
                    </Link>
                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      Previewing verified B2B layout
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Right side: Edit Button & 3-metric block matching PRF019.png */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1.25rem' }}>
              {isTourAgencyOwner && (
                <Link
                  href={`/agency/${params.agencyId}/edit`}
                  style={{
                    background: '#111827', color: '#ffffff', padding: '0.55rem 1.15rem',
                    borderRadius: '2px', fontSize: '0.75rem', fontWeight: 800, textDecoration: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
                  }}
                >
                  <IconEdit size={13} color="#ffffff" />
                  <span>EDIT PROFILE</span>
                </Link>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', background: '#f3f4f6', padding: '0.85rem 1.25rem', borderRadius: '4px', textAlign: 'center', minWidth: '320px' }}>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>13+</div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>Years Active</div>
                </div>
                <div style={{ borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>100%</div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>Fair Remuneration</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>4</div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>Craft Hubs</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-COLUMN LAYOUT matching PRF019.png */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Block 1: Legal Credentials & Enterprise Registry matching PRF019.png */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem' }}>■</span> Legal Credentials &amp; Enterprise Registry
                </h2>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, background: '#f3f4f6', color: '#4b5563', padding: '2px 6px', borderRadius: '2px', letterSpacing: '0.04em' }}>
                  HANOI DEPT. TOURISM SYNCHRONIZED
                </span>
              </div>

              <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
                Official statutory registration and certified international tour operating credentials under Vietnamese tourism legislation.
              </p>

              {/* 2-box grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '3px' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                    CORPORATE TAX ID (MST)
                  </div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: '0.35rem 0 0.15rem 0', fontFamily: 'monospace' }}>
                    {taxId}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>
                    Active &amp; Tax Compliant • Registered 2012
                  </div>
                </div>

                <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '1rem', borderRadius: '3px' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                    INBOUND OPERATOR LICENSE
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', margin: '0.35rem 0 0.15rem 0', fontFamily: 'monospace' }}>
                    01-1452/2020/TCDL-GP LHQT
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>
                    Vietnam National Authority of Tourism (VNAT)
                  </div>
                </div>
              </div>

              {/* Document download pill */}
              <div style={{
                border: '1px solid #e5e7eb', borderRadius: '3px', padding: '0.85rem 1rem', background: '#fafafa',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <IconFileText size={20} color="#6b7280" />
                  <div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#111827' }}>
                      GPKD_Indochina_Heritage_Voyages_Certified.pdf
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>
                      PDF • 2.4 MB • Verified &amp; Locked by Hanoi Dept. of Tourism
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => alert('Viewing statutory credentials document')}
                  style={{
                    background: '#ffffff', border: '1px solid #d1d5db', color: '#111827',
                    padding: '0.35rem 0.75rem', borderRadius: '2px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: '0.35rem',
                  }}
                >
                  <IconEye size={12} color="#111827" />
                  <span>View Document</span>
                </button>
              </div>
            </div>

            {/* Block 2: Company Profile & Curatorial Statement matching PRF019.png */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem' }}>■</span> Company Profile &amp; Curatorial Statement
              </h2>

              <p style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
                Specializing in high-end academic, architectural, and craft masterclass delegations across traditional Red River artisan villages since 2012. We operate as an academic bridge linking scholarly inquiries, cultural preservationists, and discerning collectors directly with traditional guilds.
              </p>

              {/* Core Client Demographics */}
              <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#111827', marginBottom: '0.35rem' }}>
                  Core Client Demographics
                </div>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 1rem 0' }}>
                  Delegations routed through Hanoi Artisan Bridge are vetted according to ethical access guidelines and cultural respect charters.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#111827', textTransform: 'uppercase' }}>
                      LUXURY FIT
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.2rem', lineHeight: 1.4 }}>
                      High-net-worth private patrons seeking bespoke artisan acquisitions.
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#111827', textTransform: 'uppercase' }}>
                      ACADEMIC SCHOLARS
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.2rem', lineHeight: 1.4 }}>
                      Anthropological, ethnological, and textile university faculties.
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#111827', textTransform: 'uppercase' }}>
                      STUDY DELEGATIONS
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.2rem', lineHeight: 1.4 }}>
                      Curatorial delegations from Europe, North America, and Japan.
                    </div>
                  </div>
                </div>
              </div>

              {/* Geographic Pills */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                <div style={{ background: '#f3f4f6', padding: '0.55rem', borderRadius: '2px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#111827' }}>Europe</div>
                  <div style={{ fontSize: '0.62rem', color: '#6b7280' }}>France, UK, DE</div>
                </div>
                <div style={{ background: '#f3f4f6', padding: '0.55rem', borderRadius: '2px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#111827' }}>North America</div>
                  <div style={{ fontSize: '0.62rem', color: '#6b7280' }}>USA, Canada</div>
                </div>
                <div style={{ background: '#f3f4f6', padding: '0.55rem', borderRadius: '2px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#111827' }}>East Asia</div>
                  <div style={{ fontSize: '0.62rem', color: '#6b7280' }}>Japan, Korea</div>
                </div>
                <div style={{ background: '#f3f4f6', padding: '0.55rem', borderRadius: '2px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#111827' }}>Oceania</div>
                  <div style={{ fontSize: '0.62rem', color: '#6b7280' }}>Australia, NZ</div>
                </div>
              </div>
            </div>

            {/* Block 3: Tour Preferences & Operating Characteristics matching PRF019.png */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem' }}>■</span> Tour Preferences &amp; Operating Characteristics
                </h2>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.35rem' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#111827' }}>
                  Frequent Search &amp; Sourcing Preferences
                </div>
                <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                  ACTIVE B2B CRITERIA
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 1.25rem 0' }}>
                Pre-set operating parameters and matchmaking filters utilized for tour inquiries &amp; guild reservations.
              </p>

              {/* Group sizes */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  FREQUENTLY SOURCED GROUP SIZES (QUY MÔ ĐOÀN HAY TÌM KIẾM)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>Bespoke VIP Cohorts</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>4–8 pax • High Touch</div>
                  </div>
                  <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>Curated Inbound Groups</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>10–18 pax • Masterclass</div>
                  </div>
                  <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>Academic Delegations</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>≤ 25 pax • Curatorial</div>
                  </div>
                </div>
              </div>

              {/* Service Types */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  PREFERRED EXPERIENCE &amp; SERVICE TYPES (LOẠI HÌNH TRẢI NGHIỆM &amp; DỊCH VỤ)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>01 Hands-on Masterclasses</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>Deep-dive 2.5h–4h artisan instruction with raw material preparation</div>
                  </div>
                  <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>02 Master Artisan Dialogue</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>Private studio symposium, living treasure interviews &amp; translation</div>
                  </div>
                  <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>03 Kiln &amp; Studio Commission Access</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>Direct observation of wood kilns and confidential custom order review</div>
                  </div>
                  <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>04 Wholesale &amp; Sourcing</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>B2B purchase protocol, authentic origin certification &amp; export packing</div>
                  </div>
                </div>
              </div>

              {/* Disciplines */}
              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  TARGET CRAFT DISCIPLINES (NGÀNH NGHỀ THỦ CÔNG ƯU TIÊN)
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', background: '#f3f4f6', color: '#111827', padding: '3px 8px', borderRadius: '2px', border: '1px solid #e5e7eb' }}>
                    Silk Weaving &amp; Botanical Dyeing
                  </span>
                  <span style={{ fontSize: '0.72rem', background: '#f3f4f6', color: '#111827', padding: '3px 8px', borderRadius: '2px', border: '1px solid #e5e7eb' }}>
                    High-Fire Wood Kiln Ceramics
                  </span>
                  <span style={{ fontSize: '0.72rem', background: '#f3f4f6', color: '#111827', padding: '3px 8px', borderRadius: '2px', border: '1px solid #e5e7eb' }}>
                    Traditional Sơn Mài Natural Lacquer
                  </span>
                  <span style={{ fontSize: '0.72rem', background: '#f3f4f6', color: '#111827', padding: '3px 8px', borderRadius: '2px', border: '1px solid #e5e7eb' }}>
                    Bamboo &amp; Filigree Artistry
                  </span>
                </div>
              </div>

              {/* Callout */}
              <div style={{
                background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.85rem 1rem', borderRadius: '3px',
                display: 'flex', gap: '0.75rem', alignItems: 'center',
              }}>
                <IconInfo size={16} color="#6b7280" />
                <span style={{ fontSize: '0.74rem', color: '#4b5563', lineHeight: 1.45 }}>
                  <strong>Specialized Mobility Request Protocol:</strong> Step-free workshop itineraries and adapted transit options available upon advance request for designated heritage ateliers.
                </span>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* Block 4: Contact & Field Liaison matching PRF019.png */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem' }}>■</span> Contact &amp; Field Liaison
              </h2>
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0 0 1.25rem 0' }}>
                Operational dispatches are monitored around the clock by bilingual logistics supervisors stationed in Hoan Kiem.
              </p>

              {/* Contact 1 */}
              <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', marginBottom: '1rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '28px', height: '28px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#374151' }}>
                  EV
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#ffffff', background: '#111827', display: 'inline-block', padding: '1px 5px', borderRadius: '2px', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  LEAD TOUR DIRECTOR
                </div>
                <div style={{ fontSize: '0.98rem', fontWeight: 800, color: '#111827' }}>
                  Dr. Eleanor Vance
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                  Ph.D. Southeast Asian Material Culture
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.75rem', color: '#374151' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <IconPhone size={12} color="#6b7280" />
                    <span>+84 91 245 8890 (Direct Hanoi Hotline)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <IconPhone size={12} color="#6b7280" />
                    <span>+33 6 42 19 04 22 (Paris Office Direct)</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <IconMail size={12} color="#6b7280" />
                    <span>dispatch@indochina-heritage.vn</span>
                  </div>
                </div>
              </div>

              {/* Contact 2 */}
              <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', marginBottom: '1.25rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '28px', height: '28px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#374151' }}>
                  MS
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#4b5563', background: '#e5e7eb', display: 'inline-block', padding: '1px 5px', borderRadius: '2px', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  SECONDARY FIELD LIAISON
                </div>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#111827' }}>
                  Marcus Sterling
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                  Ground Transit &amp; Route Safety Coordinator
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', color: '#374151' }}>
                  <IconMail size={12} color="#6b7280" />
                  <span>transit@indochina-heritage.vn</span>
                </div>
              </div>

              {/* Velocity box */}
              <div style={{ background: '#f3f4f6', border: '1px solid #e5e7eb', borderRadius: '3px', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '0.62rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>AVERAGE RESPONSE VELOCITY</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>&lt; 90 Minutes</span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>
                  Direct encrypted messaging open to registered artisan guilds.
                </div>
              </div>
            </div>

            {/* Block 5: Verified Operator Trust Badge matching PRF019.png */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '4px', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconShield size={20} color="#111827" />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#111827' }}>
                  Verified Operator Trust Badge
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '2px', lineHeight: 1.4 }}>
                  Compliant with Hanoi Department of Tourism B2B Artisan Fair Pay Regulations (2024-2026).
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Footer matching PRF019.png */}
      <footer style={{ borderTop: '1px solid #e5e7eb', padding: '2rem', background: '#fafafa', fontSize: '0.75rem', color: '#6b7280' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong>HANOI ARTISAN BRIDGE</strong> © 2025 • B2B Cultural Heritage Operations
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem' }}>
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
