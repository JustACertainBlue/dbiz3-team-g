'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { refreshDemoSession } from '@/lib/prf/client-session'

interface FormData {
  business_name: string
  craft_type: string
  business_registration: string
  location_address: string
  general_description: string
  phone_number: string
  business_email: string
}

export default function EditProviderProfilePage({
  params,
}: {
  params: { providerId: string }
}) {
  const [formData, setFormData] = useState<FormData>({
    business_name: '',
    craft_type: 'Other',
    business_registration: '',
    location_address: '',
    general_description: '',
    phone_number: '',
    business_email: '',
  })
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [status, setStatus] = useState<string>('Verified')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [refining, setRefining] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const session = await refreshDemoSession()
        const canEdit = session.role === 'LocalProvider' && session.providerId === params.providerId
        setAuthorized(canEdit)
        if (!canEdit) return
        const res = await fetch(`/api/prf/provider/${params.providerId}`)
        if (res.ok) {
          const data = await res.json()
          setFormData({
            business_name: data.provider_name || '',
            craft_type: data.craft_type || 'Other',
            business_registration: data.business_registration_number || '',
            location_address: data.location_address || '',
            general_description: data.general_description || '',
            phone_number: data.contact?.phone_number || '',
            business_email: data.contact?.business_email || '',
          })
          if (data.verification_status) {
            setStatus(data.verification_status)
          }
        }
      } catch {
        // default
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.providerId])

  if (!loading && authorized === false) {
    return <main className="prf-container" style={{ padding: '3rem' }}><h1>403 · Không có quyền chỉnh sửa</h1><p>Chỉ chủ sở hữu Local Provider mới được sửa hồ sơ này.</p><Link href={`/provider/${params.providerId}`}>← Xem hồ sơ</Link></main>
  }

  const handleAIRefine = async () => {
    if (!formData.general_description) return
    setRefining(true)
    setMessage(null)
    try {
      const res = await fetch('/api/prf/ai/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          original_description: formData.general_description,
          craft_type: formData.craft_type || 'Ceramics',
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setFormData(prev => ({
          ...prev,
          general_description: data.refined_description_draft || prev.general_description,
        }))
        setMessage({
          type: 'success',
          text: '✨ Đã trau chuốt câu chuyện di sản bằng AI. Bản nháp hiển thị bên dưới, chưa lưu tự động.',
        })
      } else {
        setMessage({ type: 'error', text: 'Dịch vụ AI không khả dụng.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối AI.' })
    } finally {
      setRefining(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/prf/provider/${params.providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (res.ok) {
        setStatus(data.verification_status)
        if (data.new_version_pending) {
          setMessage({
            type: 'success',
            text: '✓ Thay đổi trường trọng yếu đã tạo phiên bản mới chờ UBND thẩm định. Phiên bản hiện tại vẫn hiển thị.',
          })
        } else {
          setMessage({
            type: 'success',
            text: `✓ Lưu thay đổi thành công! Trạng thái: ${data.verification_status}`,
          })
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Lỗi khi lưu hồ sơ.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Lỗi kết nối khi lưu.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="spec-portal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p style={{ fontWeight: 700, color: '#4b5563' }}>LOADING EDIT FORM (PRF128)...</p>
      </div>
    )
  }

  return (
    <div className="spec-portal">
      {/* Top Header matching PRF128.png */}
      <header className="spec-header">
        <div>
          <div className="spec-brand-title">HANOI ARTISAN BRIDGE</div>
          <div className="spec-brand-sub">LOCAL PROVIDER PORTAL</div>
        </div>

        <nav className="spec-nav">
          <Link href={`/provider/${params.providerId}`}>Dashboard</Link>
          <Link href={`/provider/${params.providerId}/experiences`}>Experience Management</Link>
          <Link href={`/provider/${params.providerId}/bookings`}>Bookings</Link>
          <Link href="/schedule">Schedule</Link>
          <Link href="/messages" style={{ color: '#be123c' }}>Messages ●</Link>
        </nav>

        <div className="spec-user-profile">
          <div>
            <div style={{ fontWeight: 800 }}>HUNG THINH WORKSHOP ✓</div>
            <div style={{ color: '#6b7280', fontSize: '0.72rem' }}>Guild Master / Owner</div>
          </div>
          <div className="spec-avatar">NH</div>
          <div style={{ textAlign: 'left', fontSize: '0.75rem', lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700 }}>Nguyễn Văn Hưng</div>
            <div style={{ color: '#6b7280' }}>Lead Artisan</div>
          </div>
        </div>
      </header>

      {/* Subheader Breadcrumbs */}
      <div className="spec-subheader">
        <div>
          HOME / PROVIDER PORTAL / <span style={{ color: '#111827' }}>EDIT WORKSHOP PROFILE</span>
        </div>
        <div>
          ● MODE: <span style={{ color: '#111827' }}>INTERACTIVE EDIT PROFILE</span>
        </div>
      </div>

      <div className="spec-content-wrap">
        {/* Title Action Row matching PRF128.png */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div className="spec-badge-pill" style={{ marginBottom: '0.5rem' }}>
              ✔ VERIFIED GUILD HERITAGE PROVIDER · {formData.business_registration}
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0' }}>
              Edit Provider Profile
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', maxWidth: '800px', margin: 0 }}>
              Update your workshop identity, master artisan credentials, facilities, gallery photos, and operational dispatch details. Affiliated village guild status is verified by Hanoi Department of Tourism.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href={`/provider/${params.providerId}`} className="spec-btn-white">
              CANCEL / DISCARD
            </Link>
            <button onClick={handleSubmit} disabled={saving} className="spec-btn-black">
              {saving ? 'SAVING...' : '✔ SAVE CHANGES'}
            </button>
          </div>
        </div>

        {message && (
          <div style={{ padding: '1rem', background: message.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: message.type === 'success' ? '#065f46' : '#991b1b', marginBottom: '1.5rem', fontWeight: 600 }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* SECTION 01: Core Workshop Identity & Master Artisan matching PRF128.png */}
          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">01 Core Workshop Identity & Master Artisan</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                PUBLIC & B2B VISIBILITY
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem' }}>
              <div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="spec-form-label">WORKSHOP / ENTERPRISE LEGAL NAME</label>
                  <input
                    type="text"
                    className="spec-form-input"
                    value={formData.business_name}
                    onChange={e => setFormData({ ...formData, business_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label className="spec-form-label">MASTER ARTISAN NAME</label>
                    <input type="text" className="spec-form-input" defaultValue="Nguyen Van Hung" />
                  </div>
                  <div>
                    <label className="spec-form-label">GENERATION & GUILD TITLE</label>
                    <input type="text" className="spec-form-input" defaultValue="4th Generation Guild Master" />
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <label className="spec-form-label">AFFILIATED CRAFT VILLAGE GUILD (HERITAGE REGISTRY)</label>
                    <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: 700 }}>🔒 Locked / Certified</span>
                  </div>
                  <input
                    type="text"
                    disabled
                    className="spec-form-input"
                    style={{ background: '#f3f4f6', color: '#4b5563' }}
                    value="Bat Trang Ceramic Village, Gia Lam District, Hanoi (Verified Registry: VN-HN-BTR-1989-04)"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <label className="spec-form-label">ESTABLISHMENT YEAR</label>
                    <input type="text" className="spec-form-input" defaultValue="1989" />
                  </div>
                  <div>
                    <label className="spec-form-label">PRIVATE GROUP CAPACITY (B2B)</label>
                    <input type="text" className="spec-form-input" defaultValue="Private Groups ≤ 40 Pax" />
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="spec-form-label">CRAFT SPECIALTIES & SEARCH TAGS</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className="spec-chip">Hand-wheel Throwing ×</span>
                    <span className="spec-chip">Wood Dragon Kiln ×</span>
                    <span className="spec-chip">Alluvial Red River Clay ×</span>
                    <button type="button" className="spec-chip" style={{ borderStyle: 'dashed', background: 'transparent' }}>
                      + Add Specialty
                    </button>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="spec-form-label">NARRATIVE & CURATORIAL STATEMENT</label>
                    <button
                      type="button"
                      disabled={refining}
                      onClick={handleAIRefine}
                      className="spec-btn-white"
                      style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', borderColor: '#000000' }}
                    >
                      {refining ? 'TRAU CHUỐT...' : '✨ TRAU CHUỐT BẰNG AI'}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    className="spec-form-input"
                    value={formData.general_description}
                    onChange={e => setFormData({ ...formData, general_description: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <span className="spec-form-label">MASTER ARTISAN ARCHIVAL PHOTO (4:3)</span>
                  <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Min 1200×900px</span>
                </div>
                <div className="spec-photo-placeholder" style={{ minHeight: '220px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📷</div>
                  <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.75rem' }}>
                    MASTER_NGUYEN_VAN_HUNG_WHEEL.JPG
                  </div>
                  <div style={{ fontSize: '0.7rem' }}>4:3 · High Resolution Archival Portrait</div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button type="button" className="spec-btn-white" style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem' }}>REPLACE</button>
                    <button type="button" className="spec-btn-white" style={{ padding: '0.25rem 0.5rem', fontSize: '0.68rem' }}>REMOVE</button>
                  </div>
                </div>
                <div className="spec-photo-metrics">
                  <div className="spec-metric-cell">
                    <div className="spec-metric-label">Guild Status</div>
                    <select className="spec-form-input" style={{ padding: '0.2rem', fontSize: '0.75rem', border: 'none' }}>
                      <option>Founding Member</option>
                      <option>Senior Member</option>
                    </select>
                  </div>
                  <div className="spec-metric-cell">
                    <div className="spec-metric-label">Dispatch Coordination</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>Direct Master Access</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 02: Workshop Facilities & Capacity Specifications matching PRF128.png */}
          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">02 Workshop Facilities & Capacity Specifications</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                INFRASTRUCTURE METRICS
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
              <div style={{ border: '1px solid #e5e7eb', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6b7280', marginBottom: '0.5rem' }}>⚙ STATION APPARATUS</div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="spec-form-label">EQUIPMENT TITLE</label>
                  <input type="text" className="spec-form-input" defaultValue="12 Hand Pottery Wheels" />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="spec-form-label">TECHNICAL DETAILS</label>
                  <textarea rows={2} className="spec-form-input" defaultValue="Foot-pedaled solid wood wheels calibrated for traditional throwing and beginner ergonomics." />
                </div>
                <div>
                  <label className="spec-form-label">STATION LOAD METRIC</label>
                  <input type="text" className="spec-form-input" defaultValue="1 Guest / Wheel" />
                </div>
              </div>

              <div style={{ border: '1px solid #e5e7eb', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6b7280', marginBottom: '0.5rem' }}>🏢 STUDIO & GALLERY AREA</div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="spec-form-label">SPACE NAME & AREA</label>
                  <input type="text" className="spec-form-input" defaultValue="200 m² Studio & Gallery" />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="spec-form-label">SPACE CONFIGURATION</label>
                  <textarea rows={2} className="spec-form-input" defaultValue="Covered open-air bisque display hall, raw clay prep tables, and dedicated visitor workshop room." />
                </div>
                <div>
                  <label className="spec-form-label">SEATED CAPACITY</label>
                  <input type="text" className="spec-form-input" defaultValue="Up to 45 Pax" />
                </div>
              </div>

              <div style={{ border: '1px solid #e5e7eb', padding: '1rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#6b7280', marginBottom: '0.5rem' }}>🔥 KILN SPECIFICATION</div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="spec-form-label">KILN STRUCTURE</label>
                  <input type="text" className="spec-form-input" defaultValue="5-Chamber Dragon Kiln" />
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label className="spec-form-label">THERMAL & MATERIAL NOTES</label>
                  <textarea rows={2} className="spec-form-input" defaultValue="Traditional stepped brick kiln operating up to 1,300°C for unglazed wood-ash natural patina." />
                </div>
                <div>
                  <label className="spec-form-label">FIRING CYCLE INTERVAL</label>
                  <input type="text" className="spec-form-input" defaultValue="Monthly Firing Run" />
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 03: Architectural Grounds & Facility Gallery matching PRF128.png */}
          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">03 Architectural Grounds & Facility Gallery</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                GALLERY ASSET MANAGER (6 OF 12 MAX)
              </div>
            </div>

            <div style={{ border: '2px dashed #d1d5db', padding: '2rem', textAlign: 'center', marginBottom: '1.5rem', background: '#f9fafb' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📁</div>
              <div style={{ fontWeight: 800, color: '#111827', fontSize: '0.95rem' }}>Drag & Drop Additional Architectural Photos</div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.35rem 0 1rem' }}>
                Supports PNG, JPG, WebP up to 15MB each · Recommended ratio 21:9 or 16:9
              </div>
              <button type="button" className="spec-btn-white" style={{ fontSize: '0.75rem' }}>
                BROWSE FILES FROM COMPUTER
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '1rem' }}>
              <div style={{ border: '1px solid #111827', padding: '0.5rem', textAlign: 'center' }}>
                <span style={{ fontSize: '0.65rem', background: '#000000', color: '#ffffff', padding: '2px 4px', fontWeight: 800 }}>COVER</span>
                <div style={{ height: '70px', background: '#f3f4f6', margin: '0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖼️</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>01 · Firing Yards</div>
              </div>
              <div style={{ border: '1px solid #e5e7eb', padding: '0.5rem', textAlign: 'center' }}>
                <div style={{ height: '70px', background: '#f3f4f6', margin: '0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖼️</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>02 · Dragon Kiln</div>
              </div>
              <div style={{ border: '1px solid #e5e7eb', padding: '0.5rem', textAlign: 'center' }}>
                <div style={{ height: '70px', background: '#f3f4f6', margin: '0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖼️</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>03 · Glaze Atelier</div>
              </div>
              <div style={{ border: '1px solid #e5e7eb', padding: '0.5rem', textAlign: 'center' }}>
                <div style={{ height: '70px', background: '#f3f4f6', margin: '0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖼️</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>04 · Pottery Wheels</div>
              </div>
              <div style={{ border: '1px solid #e5e7eb', padding: '0.5rem', textAlign: 'center' }}>
                <div style={{ height: '70px', background: '#f3f4f6', margin: '0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖼️</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>05 · Drying Sheds</div>
              </div>
              <div style={{ border: '1px solid #e5e7eb', padding: '0.5rem', textAlign: 'center' }}>
                <div style={{ height: '70px', background: '#f3f4f6', margin: '0.5rem 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖼️</div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700 }}>06 · Tea Pavilion</div>
              </div>
            </div>
          </div>

          {/* SECTION 04: Offered Workshop Experiences matching PRF128.png */}
          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">04 Offered Workshop Experiences (Quick Status)</div>
              <Link href={`/provider/${params.providerId}/experiences`} style={{ fontSize: '0.72rem', fontWeight: 800, color: '#000000', textDecoration: 'none' }}>
                OPEN EXPERIENCE MANAGEMENT PORTAL →
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
              <div style={{ border: '1px solid #e5e7eb', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800 }}>
                  <span>EXP-01</span>
                  <span style={{ color: '#059669' }}>ACTIVE</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', margin: '0.5rem 0' }}>Traditional Wheel-throwing</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>B2B: ₫320,000 / pax</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700 }}>
                  <input type="checkbox" defaultChecked /> LISTED
                </label>
              </div>

              <div style={{ border: '1px solid #e5e7eb', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800 }}>
                  <span>EXP-02</span>
                  <span style={{ color: '#059669' }}>ACTIVE</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', margin: '0.5rem 0' }}>Wood-kiln Ash Glazing</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>B2B: ₫270,000 / pax</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700 }}>
                  <input type="checkbox" defaultChecked /> LISTED
                </label>
              </div>

              <div style={{ border: '1px solid #e5e7eb', padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', fontWeight: 800 }}>
                  <span>EXP-03</span>
                  <span style={{ color: '#059669' }}>ACTIVE</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', margin: '0.5rem 0' }}>Bespoke Imperial Celadon</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.75rem' }}>B2B: Custom Commission</div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.72rem', fontWeight: 700 }}>
                  <input type="checkbox" defaultChecked /> LISTED
                </label>
              </div>
            </div>
          </div>

          {/* SECTION 05: Logistics, Transit & On-Site Dispatch matching PRF128.png */}
          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">05 Logistics, Transit & On-Site Dispatch</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                AGENCY OPERATIONAL ACCESS
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '2rem' }}>
              <div>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="spec-form-label">DIRECT DISPATCH HOTLINE</label>
                  <input
                    type="text"
                    className="spec-form-input"
                    value={formData.phone_number}
                    onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                  />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label className="spec-form-label">WORKSHOP LEAD COORDINATOR</label>
                  <input type="text" className="spec-form-input" defaultValue="Ms. Le Thi Mai (Dispatch in English, French & Vietnamese)" />
                </div>
                <div>
                  <label className="spec-form-label">COACH PARKING & PIER TURNAROUND LOGISTICS</label>
                  <input type="text" className="spec-form-input" defaultValue="Bat Trang Community Pier #3 (Accommodates up to 45-seat tour coaches, designated drop-off 80m from workshop entrance)" />
                </div>
              </div>

              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  VERIFIED ACCESSIBILITY & ON-SITE AMENITIES
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', fontSize: '0.8rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" defaultChecked /> Wheelchair Accessible Studio Ramp (Full ADA compliant)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" defaultChecked /> Covered Tea Pavilion & Visitor Reception
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" defaultChecked /> Air-purified drying room & safe ceramic packing station
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input type="checkbox" defaultChecked /> Secure export-grade crate packaging for international transit
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Bottom Bar matching PRF128.png */}
          <div style={{ background: '#ffffff', borderTop: '1px solid #e5e7eb', padding: '1rem 2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '0.78rem', color: '#6b7280' }}>
              ● Last autosaved 2m ago · All changes synced to B2B verified registry
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link href={`/provider/${params.providerId}`} className="spec-btn-white">
                DISCARD CHANGES
              </Link>
              <button type="submit" disabled={saving} className="spec-btn-black">
                {saving ? 'SAVING...' : '✔ SAVE PROVIDER PROFILE'}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Footer matching PRF128.png */}
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
