'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

interface AgencyData {
  agency_id: string
  agency_name: string
  company_type: string
  location?: {
    street?: string
    district?: string
    city_province?: string
  }
  team_size?: number
  contact?: {
    contact_person_name?: string
    phone_number?: string
    business_email?: string
  }
  tax_id?: string
  tour_types?: string[]
  description?: string
  account_status?: string
}

export default function AgencyProfilePage({
  params,
}: {
  params: { agencyId: string }
}) {
  const [agency, setAgency] = useState<AgencyData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/prf/agency/${params.agencyId}`)
        if (res.ok) {
          const data = await res.json()
          setAgency(data)
        }
      } catch {
        // default
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.agencyId])

  if (loading) {
    return (
      <div className="spec-portal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p style={{ fontWeight: 700, color: '#4b5563' }}>LOADING AGENCY PROFILE (PRF019)...</p>
      </div>
    )
  }

  const agencyName = agency?.agency_name || 'Tour Agency'
  const taxId = agency?.tax_id || '—'
  const contactName = agency?.contact?.contact_person_name || 'Đại diện Agency'
  const contactInitials = contactName.split(/\s+/).filter(Boolean).slice(-2).map(part => part[0]).join('').toUpperCase() || 'TA'
  const address = [agency?.location?.street, agency?.location?.district, agency?.location?.city_province].filter(Boolean).join(', ') || 'Hà Nội'

  return (
    <div className="spec-portal">
      {/* Top Header matching PRF019.png */}
      <header className="spec-header">
        <div>
          <div className="spec-brand-title">HANOI ARTISAN BRIDGE</div>
          <div className="spec-brand-sub">B2B PORTAL</div>
        </div>

        <nav className="spec-nav">
          <Link href="/explore">Explore</Link>
          <Link href="/matching">AI Tour Matching</Link>
          <Link href={`/agency/${params.agencyId}/bookings`}>Bookings</Link>
          <Link href={`/agency/${params.agencyId}/schedule`}>Schedule</Link>
          <Link href="/messages" style={{ color: '#be123c' }}>Messages ●</Link>
        </nav>

        <div className="spec-user-profile">
          <div className="spec-avatar" style={{ background: '#1e3a5f' }}>{contactInitials}</div>
          <div style={{ textAlign: 'left', fontSize: '0.75rem', lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700 }}>{contactName}</div>
            <div style={{ color: '#6b7280' }}>{agency?.company_type || 'Tour Agency'}</div>
          </div>
        </div>
      </header>

      {/* Subheader Breadcrumbs */}
      <div className="spec-subheader">
        <div>
          HOME / TRAVEL AGENCIES / <span style={{ color: '#111827' }}>{agencyName.toUpperCase()}</span>
        </div>
        <div>
          <Link href="/messages" style={{ color: '#b45309', textDecoration: 'none' }}>
            💬 TRUY CẬP TỪ TIN NHẮN B2B (MESSAGES LINK)
          </Link>
        </div>
      </div>

      <div className="spec-content-wrap">
        {/* Top Header Row matching PRF019.png */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              VNAT #01-1452/2020/TCDL-GP LHQT
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', margin: '0 0 0.25rem 0' }}>
              {agencyName}
            </h1>
            <div style={{ color: '#4b5563', fontSize: '0.9rem', fontStyle: 'italic', marginBottom: '1rem' }}>
              {agency?.company_type || 'Tour Agency'} · {agency?.account_status || 'Public profile'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontSize: '0.82rem', color: '#6b7280', flexWrap: 'wrap' }}>
              <div>📍 {address}</div>
              <div>👥 {agency?.team_size || '—'} thành viên</div>
              <div>
                MST: <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#111827' }}>{taxId}</span>{' '}
                <span style={{ fontSize: '0.65rem', background: '#e5e7eb', padding: '2px 5px', fontWeight: 800 }}>VERIFIED</span>
              </div>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <Link href="/messages" className="spec-btn-white" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                💬 Contact Agency (Chat)
              </Link>
              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Previewing verified B2B layout (Local Provider View)
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '1rem' }}>
            <Link href={`/agency/${params.agencyId}/edit`} className="spec-btn-black">
              ✏ EDIT PROFILE
            </Link>

            <div style={{ display: 'flex', gap: '1px', background: '#e5e7eb', border: '1px solid #e5e7eb' }}>
              <div style={{ background: '#ffffff', padding: '0.6rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>13+</div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase' }}>Years Active</div>
              </div>
              <div style={{ background: '#ffffff', padding: '0.6rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>100%</div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase' }}>Fair Remuneration</div>
              </div>
              <div style={{ background: '#ffffff', padding: '0.6rem 1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 800 }}>4</div>
                <div style={{ fontSize: '0.65rem', color: '#6b7280', textTransform: 'uppercase' }}>Craft Hubs</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Layout matching PRF019.png */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1fr', gap: '2rem' }}>
          {/* Left Column */}
          <div>
            {/* Legal Credentials */}
            <div className="spec-info-box">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>■ Legal Credentials & Enterprise Registry</h3>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, background: '#f3f4f6', padding: '2px 6px', color: '#4b5563' }}>
                  HANOI DEPT. TOURISM SYNCHRONIZED
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#6b7280', marginBottom: '1.25rem' }}>
                Official statutory registration and certified international tour operating credentials under Vietnamese tourism legislation.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: '#f9fafb', border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>CORPORATE TAX ID (MST)</div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, fontFamily: 'monospace' }}>{taxId}</div>
                  <div style={{ fontSize: '0.7rem', color: '#059669' }}>Active & Tax Compliant · Registered 2012</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 700 }}>INBOUND OPERATOR LICENSE</div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>01-1452/2020/TCDL-GP LHQT</div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Vietnam National Authority of Tourism (VNAT)</div>
                </div>
              </div>

              <div style={{ border: '1px solid #e5e7eb', padding: '0.75rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span>📄</span>
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>Legal document repository</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Không có tệp pháp lý công khai trong dữ liệu demo hiện tại.</div>
                  </div>
                </div>
                <button type="button" className="spec-btn-white" style={{ fontSize: '0.72rem', padding: '0.35rem 0.65rem' }}>
                  Chưa có tài liệu
                </button>
              </div>
            </div>

            {/* Company Profile & Curatorial Statement */}
            <div className="spec-info-box">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                ■ Company Profile & Curatorial Statement
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#374151', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {agency?.description || 'Agency chưa cập nhật phần giới thiệu.'}
              </p>

              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, marginBottom: '0.35rem' }}>Core Client Demographics</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>
                  Delegations routed through Hanoi Artisan Bridge are vetted according to ethical access guidelines and cultural respect charters.
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '0.65rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800 }}>LUXURY FIT</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>High-net-worth private patrons seeking bespoke artisan acquisitions.</div>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '0.65rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800 }}>ACADEMIC SCHOLARS</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>Anthropological, ethnological, and textile university faculties.</div>
                  </div>
                  <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', padding: '0.65rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 800 }}>STUDY DELEGATIONS</div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>Curatorial delegations from Europe, North America, and Japan.</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', textAlign: 'center' }}>
                <div style={{ background: '#f3f4f6', padding: '0.4rem', fontSize: '0.72rem', fontWeight: 700 }}>Europe (France, UK, DE)</div>
                <div style={{ background: '#f3f4f6', padding: '0.4rem', fontSize: '0.72rem', fontWeight: 700 }}>North America (USA, Canada)</div>
                <div style={{ background: '#f3f4f6', padding: '0.4rem', fontSize: '0.72rem', fontWeight: 700 }}>East Asia (Japan, Korea)</div>
                <div style={{ background: '#f3f4f6', padding: '0.4rem', fontSize: '0.72rem', fontWeight: 700 }}>Oceania (Australia, NZ)</div>
              </div>
            </div>

            {/* Tour Preferences & Operating Characteristics */}
            <div className="spec-info-box">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                ■ Tour Preferences & Operating Characteristics
              </h3>

              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Frequently Sourced Group Sizes (Quy mô đoàn hay tìm kiếm)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <div style={{ border: '1px solid #e5e7eb', padding: '0.65rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>Bespoke VIP Cohorts</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>4–8 pax · High Touch</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', padding: '0.65rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>Curated Inbound Groups</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>10–18 pax · Masterclass</div>
                  </div>
                  <div style={{ border: '1px solid #e5e7eb', padding: '0.65rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 800 }}>Academic Delegations</div>
                    <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>≤ 25 pax · Curatorial</div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  Target Craft Disciplines (Ngành nghề thủ công ưu tiên)
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="spec-chip">Silk Weaving & Botanical Dyeing</span>
                  <span className="spec-chip">High-Fire Wood Kiln Ceramics</span>
                  <span className="spec-chip">Traditional Sơn Mài Natural Lacquer</span>
                  <span className="spec-chip">Bamboo & Filigree Artistry</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {/* Contact & Field Liaison */}
            <div className="spec-info-box">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.75rem' }}>
                ■ Contact & Field Liaison
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '1.25rem' }}>
                Operational dispatches are monitored around the clock by bilingual logistics supervisors stationed in Hoan Kiem.
              </p>

              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '1rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, background: '#000000', color: '#ffffff', display: 'inline-block', padding: '2px 5px', marginBottom: '0.35rem' }}>
                  LEAD TOUR DIRECTOR
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800 }}>{contactName}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>{agency?.company_type || 'Tour Agency'}</div>

                <div style={{ fontSize: '0.78rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div>📞 <span style={{ fontWeight: 700 }}>{agency?.contact?.phone_number || 'Chưa công khai'}</span></div>
                  <div>✉️ {agency?.contact?.business_email || 'Chưa công khai'}</div>
                </div>
              </div>

              <div style={{ background: '#f3f4f6', padding: '0.75rem', fontSize: '0.75rem', textAlign: 'center' }}>
                <span style={{ fontWeight: 700 }}>AVERAGE RESPONSE VELOCITY:</span> &lt; 90 Minutes<br />
                <span style={{ color: '#6b7280' }}>Direct encrypted messaging open to registered artisan guilds.</span>
              </div>
            </div>

            {/* Trust Badge */}
            <div className="spec-info-box" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ fontSize: '2rem' }}>🛡️</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>Verified Operator Trust Badge</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Compliant with Hanoi Department of Tourism B2B Artisan Fair Pay Regulations (2024-2026).
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer matching PRF019.png */}
      <footer className="spec-footer">
        <div>
          HANOI ARTISAN BRIDGE © 2025 · B2B Cultural Heritage Operations
        </div>
        <div>
          <Link href="/terms">Operator Terms</Link>
          <Link href="/privacy">Artisan Privacy Protocol</Link>
          <Link href="/standards">Compliance & Heritage Standards</Link>
          <Link href="/support">Support Desk</Link>
        </div>
      </footer>
    </div>
  )
}
