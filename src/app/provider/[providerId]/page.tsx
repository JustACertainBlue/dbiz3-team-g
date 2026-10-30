'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'

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

export default function ProviderProfilePage({
  params,
}: {
  params: { providerId: string }
}) {
  const [provider, setProvider] = useState<ProviderData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UBND review panel state
  const [revisionComments, setRevisionComments] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [reviewMessage, setReviewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/prf/provider/${params.providerId}`)
        if (!res.ok) {
          throw new Error(res.status === 404 ? 'Hồ sơ làng nghề chưa công bố hoặc không tồn tại' : 'Lỗi tải dữ liệu')
        }
        const data = await res.json()
        setProvider(data)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Lỗi kết nối')
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
        throw new Error(data.error || 'Lỗi khi thẩm định hồ sơ')
      }
      setProvider(prev => prev ? { ...prev, verification_status: data.verification_status } : null)
      setReviewMessage({
        type: 'success',
        text: `Đã cập nhật trạng thái thẩm định: ${data.verification_status}`,
      })
    } catch (err: unknown) {
      setReviewMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Không thể thực hiện thẩm định',
      })
    } finally {
      setReviewing(false)
    }
  }

  if (loading) {
    return (
      <div className="spec-portal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p style={{ fontWeight: 700, color: '#4b5563' }}>LOADING PROVIDER PROFILE (PRF127)...</p>
      </div>
    )
  }

  if (error || !provider) {
    return (
      <div className="spec-portal" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#be123c', marginBottom: '1rem' }}>Hồ sơ Làng nghề Không tồn tại</h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>{error || 'Nhà cung cấp chưa được kích hoạt.'}</p>
        <Link href="/" className="spec-btn-black">Trang chủ</Link>
      </div>
    )
  }

  const leadArtisan = provider.artisan_names?.[0] || 'Nguyễn Văn Hưng'
  const villageName = provider.village_name || 'Bát Tràng'
  const villageDistrict = provider.village_district || 'Gia Lâm'
  const isVerified = provider.verification_status === 'Verified'

  return (
    <div className="spec-portal">
      {/* Top Portal Header matching PRF127.png */}
      <header className="spec-header">
        <div>
          <div className="spec-brand-title">HANOI ARTISAN BRIDGE</div>
          <div className="spec-brand-sub">LOCAL PROVIDER PORTAL</div>
        </div>

        <nav className="spec-nav">
          <Link href={`/provider/${params.providerId}/dashboard`}>Dashboard</Link>
          <Link href={`/provider/${params.providerId}/experiences`}>Experience Management</Link>
          <Link href={`/provider/${params.providerId}/bookings`}>Bookings</Link>
          <Link href={`/provider/${params.providerId}/schedule`}>Schedule</Link>
          <Link href="/messages" style={{ color: '#be123c' }}>Messages ●</Link>
        </nav>

        <div className="spec-user-profile">
          <div>
            <div style={{ fontWeight: 800 }}>{provider.provider_name} ✓</div>
            <div style={{ color: '#6b7280', fontSize: '0.72rem' }}>Guild Master / Owner</div>
          </div>
          <div className="spec-avatar">NH</div>
          <div style={{ textAlign: 'left', fontSize: '0.75rem', lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700 }}>{leadArtisan}</div>
            <div style={{ color: '#6b7280' }}>Lead Artisan</div>
          </div>
        </div>
      </header>

      {/* Subheader Breadcrumbs */}
      <div className="spec-subheader">
        <div>
          PROVIDER PORTAL / WORKSHOP PROFILE / <span style={{ color: '#111827' }}>{provider.provider_name.toUpperCase()} (LEAD ADMIN)</span>
        </div>
        <div>
          ACCESS LEVEL: <span style={{ color: '#059669' }}>FULL MANAGEMENT</span>
        </div>
      </div>

      <div className="spec-content-wrap">
        {/* Action Bar */}
        <div className="spec-action-bar">
          <div className="spec-action-label">Provider Administration</div>
          <Link href={`/provider/${params.providerId}/edit`} className="spec-btn-black">
            ✏ EDIT PROVIDER PROFILE
          </Link>
          <Link href={`/provider/${params.providerId}/bookings/new`} className="spec-btn-black">
            + CREATE BOOKING
          </Link>
        </div>

        {/* Hero Section matching PRF127.png */}
        <div className="spec-hero-box">
          <div>
            <div className="spec-badge-pill">
              {isVerified ? '✔ VERIFIED HERITAGE PROVIDER' : '⏳ PENDING VERIFICATION'}
            </div>
            <h1 className="spec-hero-title">{provider.provider_name}</h1>
            <div className="spec-hero-subtitle">
              Master Artisan {leadArtisan} (4th Generation Guild Master)
            </div>
            <div className="spec-hero-location">
              <span>📍</span>
              <span>{villageName} Village, {villageDistrict} District, Hanoi</span>
            </div>

            <div className="spec-chips-row">
              <span className="spec-chip">Est. 1989</span>
              <span className="spec-chip">Hand-wheel Throwing</span>
              <span className="spec-chip">Wood Dragon Kiln</span>
              <span className="spec-chip">Alluvial Red River Clay</span>
            </div>

            <Link href="/messages" className="spec-btn-white" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
              💬 DIRECT CHAT WITH MASTER
            </Link>
          </div>

          <div>
            <div className="spec-photo-placeholder">
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
              <div style={{ fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>
                [ WORKSHOP & MASTER ARTISAN PHOTO / PLACEHOLDER ]
              </div>
              <div style={{ fontSize: '0.75rem', maxWidth: '300px' }}>
                Authentic documentary records of studio master at the throwing wheel
              </div>
            </div>
            <div className="spec-photo-metrics">
              <div className="spec-metric-cell">
                <div className="spec-metric-label">Guild Status</div>
                <div className="spec-metric-val">Founding Member</div>
              </div>
              <div className="spec-metric-cell">
                <div className="spec-metric-label">B2B Capacity</div>
                <div className="spec-metric-val">Private Groups ≤ 40</div>
              </div>
            </div>
          </div>
        </div>

        {/* Facilities & Capacity matching PRF127.png */}
        <div className="spec-section-tag">Infrastructure & Master Setup</div>
        <h2 className="spec-section-title">Workshop Facilities & Capacity</h2>
        <div className="spec-facility-grid">
          <div className="spec-facility-card">
            <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>⚙</div>
            <div className="spec-facility-title">12 Hand Pottery Wheels</div>
            <div className="spec-facility-desc">
              Foot-pedaled solid wood wheels calibrated for traditional throwing and beginner ergonomics.
            </div>
            <div className="spec-facility-foot">
              <span>Station Load</span>
              <span style={{ fontWeight: 800 }}>1 Guest / Wheel</span>
            </div>
          </div>

          <div className="spec-facility-card">
            <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>🏢</div>
            <div className="spec-facility-title">200 m² Studio & Gallery</div>
            <div className="spec-facility-desc">
              Covered open-air bisque display hall, raw clay prep tables, and dedicated visitor workshop room.
            </div>
            <div className="spec-facility-foot">
              <span>Seated Capacity</span>
              <span style={{ fontWeight: 800 }}>Up to 45 Pax</span>
            </div>
          </div>

          <div className="spec-facility-card">
            <div style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>🔥</div>
            <div className="spec-facility-title">5-Chamber Dragon Kiln</div>
            <div className="spec-facility-desc">
              Traditional stepped brick kiln operating up to 1,300°C for unglazed wood-ash natural patina.
            </div>
            <div className="spec-facility-foot">
              <span>Firing Cycle</span>
              <span style={{ fontWeight: 800 }}>Monthly Firing Run</span>
            </div>
          </div>
        </div>

        {/* Gallery Slider matching PRF127.png */}
        <div className="spec-gallery-slider">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase' }}>
            <span>● SLIDE 01 / 06</span>
            <span style={{ color: '#9ca3af' }}>21:9 · Architectural Study</span>
          </div>
          <div className="spec-gallery-main">
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🖼️</div>
            <div style={{ fontWeight: 700, color: '#111827' }}>
              [ WORKSHOP FACILITY & ARCHITECTURAL GROUNDS / GALLERY 01/06 ]
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              Architectural perspective showing outdoor firing yards, drying racks, and studio sheds
            </div>
          </div>
          <div className="spec-thumb-strip">
            <div className="spec-thumb" style={{ borderColor: '#000000', fontWeight: 800 }}>01 · FIRING YARDS</div>
            <div className="spec-thumb">02 · DRAGON KILN</div>
            <div className="spec-thumb">03 · GLAZE ATELIER</div>
            <div className="spec-thumb">04 · POTTERY WHEELS</div>
            <div className="spec-thumb">05 · DRYING SHEDS</div>
            <div className="spec-thumb">06 · TEA PAVILION</div>
          </div>
        </div>

        {/* Offered Workshop Experiences matching PRF127.png */}
        <div className="spec-section-tag">Tour Agency Discovery Catalog</div>
        <h2 className="spec-section-title">Offered Workshop Experiences</h2>
        <div className="spec-exp-grid">
          {/* EXP-01 */}
          <div className="spec-exp-card">
            <div className="spec-exp-media">[ MASTERCLASS SESSION / PLACEHOLDER ]</div>
            <div className="spec-exp-body">
              <div className="spec-exp-header-tag">
                <span>EXP-01</span>
                <span style={{ color: '#059669' }}>INSTANT CONFIRM</span>
              </div>
              <div className="spec-exp-specs">🕒 2.5 Hours · 👥 Max 15 Guests · All Levels</div>
              <div className="spec-exp-title">Traditional Wheel-throwing & Clay Sculpting</div>
              <div className="spec-exp-desc">
                Hands-on immersion starting from raw Red River silt preparation, pedal wheel centering, hollow pulling, and leather-hard stage trimming under direct artisan coaching.
              </div>
              <div className="spec-exp-pricing-box">
                <span className="spec-exp-pub-rate">PUBLIC REFERENCE RATE: ₫450,000 / pax</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>AGENCY B2B NET:</span>
                  <span className="spec-exp-b2b-rate">₫320,000 <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>/ pax</span></span>
                </div>
              </div>
              <div className="spec-exp-actions">
                <Link href={`/provider/${params.providerId}/experiences`} style={{ fontSize: '0.78rem', color: '#111827', fontWeight: 700, textDecoration: 'none' }}>
                  View Details
                </Link>
                <button className="spec-btn-black" style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}>
                  BOOKING ⤑
                </button>
              </div>
            </div>
          </div>

          {/* EXP-02 */}
          <div className="spec-exp-card">
            <div className="spec-exp-media">[ GLAZE FORMULATION / PLACEHOLDER ]</div>
            <div className="spec-exp-body">
              <div className="spec-exp-header-tag">
                <span>EXP-02</span>
                <span style={{ color: '#059669' }}>INSTANT CONFIRM</span>
              </div>
              <div className="spec-exp-specs">🕒 1.5 Hours · 👥 Max 12 Guests · Intermediate</div>
              <div className="spec-exp-title">Wood-kiln Ash Glazing Techniques</div>
              <div className="spec-exp-desc">
                Explore mineral-rich natural glaze compounding using local rice husk ash and lime slip. Participants apply ancestral dipping, brushing, and wax-resist patterns on pre-fired bisque.
              </div>
              <div className="spec-exp-pricing-box">
                <span className="spec-exp-pub-rate">PUBLIC REFERENCE RATE: ₫380,000 / pax</span>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>AGENCY B2B NET:</span>
                  <span className="spec-exp-b2b-rate">₫270,000 <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>/ pax</span></span>
                </div>
              </div>
              <div className="spec-exp-actions">
                <Link href={`/provider/${params.providerId}/experiences`} style={{ fontSize: '0.78rem', color: '#111827', fontWeight: 700, textDecoration: 'none' }}>
                  View Details
                </Link>
                <button className="spec-btn-black" style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}>
                  BOOKING ⤑
                </button>
              </div>
            </div>
          </div>

          {/* EXP-03 */}
          <div className="spec-exp-card">
            <div className="spec-exp-media">[ BESPOKE MASTER CHAMBER / PLACEHOLDER ]</div>
            <div className="spec-exp-body">
              <div className="spec-exp-header-tag">
                <span>EXP-03 · BESPOKE</span>
                <span style={{ color: '#b45309' }}>ON REQUEST</span>
              </div>
              <div className="spec-exp-specs">🕒 3 - 5 Days · 👥 Private VIP Cohort · Master-Led</div>
              <div className="spec-exp-title">Bespoke Imperial Celadon Reproduction & Private Kiln Chamber</div>
              <div className="spec-exp-desc">
                Exclusive multi-day masterclass reproducing Ly-Tran dynasty crackled celadon. Includes dedicated 1-on-1 formulation with Master Hung and reserved kiln chamber section.
              </div>
              <div className="spec-exp-pricing-box">
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.2rem' }}>PRICING MODEL: Custom Commission</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#111827' }}>B2B NET: CONTACT FOR PRICING</div>
              </div>
              <div className="spec-exp-actions">
                <Link href="/messages" style={{ fontSize: '0.78rem', color: '#111827', fontWeight: 700, textDecoration: 'none' }}>
                  Inquire via Chat
                </Link>
                <button className="spec-btn-black" style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}>
                  REQUEST QUOTE ⤑
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Village Affiliation matching PRF127.png */}
        <div className="spec-info-box" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.25rem' }}>
              VILLAGE AFFILIATION
            </div>
            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
              <Link href="/villages" style={{ color: '#111827', textDecoration: 'none' }}>
                {villageName} Ceramic Village Guild ↗
              </Link>
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.6 }}>
              {provider.provider_name} operates under the traditional stewardship standards of the {villageName} Ceramic Guild, founded in the 14th century along the banks of the Red River. All experiences comply with heritage preservation benchmarks.
            </p>
          </div>
          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280' }}>
              VERIFIED REGISTRY NO.
            </div>
            <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', margin: '0.35rem 0' }}>
              {provider.business_registration_number || 'VN-HN-BTR-1989-04'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 700 }}>
              Status: Active Commercial Guild
            </div>
          </div>
        </div>

        {/* Agency Logistics & Dispatch matching PRF127.png */}
        <div className="spec-info-box">
          <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280' }}>
            AGENCY LOGISTICS & OPERATIONAL COORDINATION
          </div>
          <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginTop: '0.25rem' }}>
            Master Artisan Logistics & On-Site Dispatch
          </h3>

          <div className="spec-dispatch-grid">
            <div className="spec-dispatch-col">
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.2rem' }}>
                📞 DIRECT DISPATCH & HOTLINE
              </div>
              <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
                {provider.contact?.phone_number || '+84 90 311 8842'}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                Workshop Coordinator: Ms. Le Thi Mai<br />
                English, French & Vietnamese dispatch
              </div>
            </div>

            <div className="spec-dispatch-col">
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.2rem' }}>
                🚌 COACH TURNAROUND & PARKING
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
                Bat Trang Community Pier #3
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                Accommodates up to 45-seat tour coaches.<br />
                Designated drop-off 80m from workshop entrance.
              </div>
            </div>

            <div className="spec-dispatch-col">
              <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.2rem' }}>
                ♿ ACCESS & AMENITIES
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
                Wheelchair Accessible Studio Ramp
              </div>
              <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
                Full ADA compliant ground level ramp, tea pavilion, air-purified drying room, and secure packaging crates.
              </div>
            </div>
          </div>
        </div>

        {/* Administrative UBND Verification Panel */}
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1.5rem', marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ★ UBND THẨM ĐỊNH LÀNG NGHỀ (BR-005)
              </div>
              <div style={{ fontSize: '0.8rem', color: '#7f1d1d' }}>
                Cấp thẩm quyền địa bàn phê duyệt công bố hồ sơ nghệ nhân & trải nghiệm.
              </div>
            </div>
            <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#991b1b' }}>
              Trạng thái hiện tại: {provider.verification_status || 'Verified'}
            </div>
          </div>

          {reviewMessage && (
            <div style={{ padding: '0.75rem', background: '#ffffff', border: '1px solid #d1d5db', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
              {reviewMessage.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input
              type="text"
              value={revisionComments}
              onChange={e => setRevisionComments(e.target.value)}
              placeholder="Nhập nhận xét / lý do yêu cầu sửa đổi..."
              style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.8rem', border: '1px solid #d1d5db' }}
            />
            <button
              onClick={() => handleReview('Request Revision')}
              disabled={reviewing}
              className="spec-btn-white"
              style={{ fontSize: '0.75rem', borderColor: '#b91c1c', color: '#b91c1c' }}
            >
              {reviewing ? 'Đang gửi...' : 'Yêu cầu sửa đổi'}
            </button>
            <button
              onClick={() => handleReview('Approve')}
              disabled={reviewing}
              className="spec-btn-black"
              style={{ fontSize: '0.75rem', background: '#059669' }}
            >
              {reviewing ? 'Đang duyệt...' : '✔ Phê duyệt (Approve)'}
            </button>
          </div>
        </div>
      </div>

      {/* Footer matching PRF127.png */}
      <footer className="spec-footer">
        <div>
          <div style={{ fontWeight: 800, color: '#111827' }}>VIETNAM CRAFT VILLAGES</div>
          <div style={{ fontSize: '0.7rem' }}>TRADITIONAL ARTISANAL HERITAGE · TOUR AGENCY HUB</div>
        </div>
        <div>
          <Link href="/explore">Explore</Link>
          <Link href="/about">About</Link>
          <Link href="/terms">Terms of Service</Link>
          <Link href="/privacy">Privacy Policy</Link>
          <Link href="/support">Agency Support Desk</Link>
        </div>
      </footer>
    </div>
  )
}
