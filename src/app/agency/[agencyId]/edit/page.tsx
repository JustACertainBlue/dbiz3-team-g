'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getCurrentRole, refreshDemoSession, setCurrentRole, getAuthHeaders, type CurrentUserRole } from '@/lib/prf/client-session'

interface AgencyFormData {
  company_name: string
  tax_id: string
  company_type: string
  street: string
  ward: string
  district: string
  city_province: string
  description: string
  team_size: number
  contact_person_name: string
  phone_number: string
  business_email: string
  tour_types: string[]
}

export default function EditAgencyProfilePage({
  params,
}: {
  params: { agencyId: string }
}) {
  const router = useRouter()
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [mounted, setMounted] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null)

  const [formData, setFormData] = useState<AgencyFormData>({
    company_name: '',
    tax_id: '',
    company_type: 'Tour Operator',
    street: '',
    ward: '',
    district: '',
    city_province: '',
    description: '',
    team_size: 1,
    contact_person_name: '',
    phone_number: '',
    business_email: '',
    tour_types: [],
  })

  useEffect(() => {
    setMounted(true)
    refreshDemoSession().then(session => setRole(session.role)).finally(() => setSessionReady(true))

    const onRoleChanged = () => {
      setRole(getCurrentRole())
    }
    window.addEventListener('hab_role_changed', onRoleChanged)

    // Load agency profile if exists
    fetch(`/api/prf/agency/${params.agencyId}`, {
      headers: { ...getAuthHeaders(params.agencyId) },
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setFormData(prev => ({
            ...prev,
            company_name: data.agency_name || prev.company_name,
            tax_id: data.tax_id || prev.tax_id,
            company_type: data.company_type || prev.company_type,
            description: data.description || prev.description,
            team_size: data.team_size || prev.team_size,
            street: data.location?.street || prev.street,
            ward: data.location?.ward || prev.ward,
            district: data.location?.district || prev.district,
            city_province: data.location?.city_province || prev.city_province,
            contact_person_name: data.contact?.contact_person_name || prev.contact_person_name,
            phone_number: data.contact?.phone_number || prev.phone_number,
            business_email: data.contact?.business_email || prev.business_email,
            tour_types: data.tour_types || prev.tour_types,
          }))
        }
      })
      .catch(() => {})
      .finally(() => setProfileReady(true))

    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [params.agencyId])

  if (!mounted || !sessionReady || !profileReady) {
    return <div className="spec-portal" style={{ minHeight: '70vh', display: 'grid', placeItems: 'center' }}>Đang tải hồ sơ Agency…</div>
  }

  // HARD PERMISSION GUARD: Local Provider (or any non-Agency role) is strictly FORBIDDEN
  if (mounted && role !== 'TourAgency') {
    return (
      <div className="spec-portal" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div
          style={{
            maxWidth: '540px',
            width: '100%',
            background: '#ffffff',
            border: '2px solid #ef4444',
            padding: '2.5rem',
            textAlign: 'center',
            borderRadius: '4px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚫</div>
          <div className="spec-badge-pill" style={{ background: '#fef2f2', color: '#991b1b', borderColor: '#fca5a5', marginBottom: '1rem' }}>
            403 FORBIDDEN · ACCESS DENIED (BR-001)
          </div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', margin: '0 0 0.75rem 0' }}>
            Quyền Truy Cập Bị Từ Chối
          </h1>
          <p style={{ fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.6, margin: '0 0 1.5rem 0' }}>
            Tài khoản <strong>{role === 'LocalProvider' ? 'Local Provider (Chủ xưởng)' : role}</strong> không có quyền truy cập vào màn hình chỉnh sửa hồ sơ của Công ty Lữ hành (Tour Agency). Theo quy định an toàn hệ thống, chỉ chủ sở hữu tài khoản Agency mới có quyền quản lý hồ sơ này.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374" className="spec-btn-black">
              ← Về Hồ sơ Xưởng của tôi (PRF127)
            </Link>
            <button
              onClick={() => {
                setCurrentRole('TourAgency')
                setRole('TourAgency')
              }}
              className="spec-btn-white"
            >
              Chuyển sang tài khoản Agency
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleToggleTourType = (type: string) => {
    setFormData(prev => {
      const exists = prev.tour_types.includes(type)
      return {
        ...prev,
        tour_types: exists
          ? prev.tour_types.filter(t => t !== type)
          : [...prev.tour_types, type],
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const payload = {
        company_name: formData.company_name,
        tax_id: formData.tax_id,
        company_type: formData.company_type,
        description: formData.description,
        team_size: Number(formData.team_size),
        location: {
          street: formData.street,
          ward: formData.ward,
          district: formData.district,
          city_province: formData.city_province,
        },
        contact_info: {
          contact_person_name: formData.contact_person_name,
          phone_number: formData.phone_number,
          business_email: formData.business_email,
        },
        tour_types: formData.tour_types,
      }

      const res = await fetch(`/api/prf/agency/${params.agencyId}`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(params.agencyId),
        },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Cập nhật thất bại')
      }

      if (data.requires_hdt_rereview) {
        setMessage({
          type: 'warning',
          text: '✓ Thay đổi trường trọng yếu (Tên doanh nghiệp / MST) đã gửi yêu cầu thẩm định lại đến Hội đồng Thẩm định (HDT - BR-017). Tài khoản vẫn duy trì hoạt động.',
        })
      } else {
        setMessage({
          type: 'success',
          text: '✓ Cập nhật hồ sơ Công ty Lữ hành thành công!',
        })
      }
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu hồ sơ.',
      })
    } finally {
      setSaving(false)
    }
  }

  const availableTourTypes = [
    'Cultural/Heritage',
    'Craft Village/Experiential',
    'Educational/Study Tour',
    'Artisan Apprenticeship & Masterclasses',
    'Eco-Tourism & Rural Gastronomy',
    'High-End MICE & VIP Delegations',
  ]

  return (
    <div className="spec-portal">
      {/* Top Header matching PRF021.png wireframe style */}
      <header className="spec-header">
        <div>
          <div className="spec-brand-title">HANOI ARTISAN BRIDGE</div>
          <div className="spec-brand-sub">TOUR AGENCY PORTAL</div>
        </div>

        <nav className="spec-nav">
          <Link href="/explore">Khám phá (Explore)</Link>
          <Link href={`/agency/${params.agencyId}`}>Hồ sơ Agency</Link>
          <Link href={`/agency/${params.agencyId}/edit`} className="active" style={{ color: '#1e3a5f', fontWeight: 800 }}>
            Sửa Agency
          </Link>
          <Link href="/messages" style={{ color: '#be123c' }}>Hộp thư B2B ●</Link>
        </nav>

        <div className="spec-user-profile">
          <div>
            <div style={{ fontWeight: 800 }}>{formData.company_name || 'TOUR AGENCY'} ✓</div>
            <div style={{ color: '#6b7280', fontSize: '0.72rem' }}>Tour Operator · B2B Lead</div>
          </div>
          <div className="spec-avatar" style={{ background: '#1e3a5f', color: '#ffffff' }}>IH</div>
          <div style={{ textAlign: 'left', fontSize: '0.75rem', lineHeight: 1.2 }}>
            <div style={{ fontWeight: 700 }}>{formData.contact_person_name || 'Đại diện Agency'}</div>
            <div style={{ color: '#6b7280' }}>{formData.company_type}</div>
          </div>
        </div>
      </header>

      {/* Subheader Breadcrumbs */}
      <div className="spec-subheader">
        <div>
          HOME / AGENCY PORTAL / <span style={{ color: '#111827' }}>EDIT AGENCY PROFILE (PRF021)</span>
        </div>
        <div>
          ● MODE: <span style={{ color: '#111827' }}>INTERACTIVE EDIT PROFILE</span>
        </div>
      </div>

      <div className="spec-content-wrap">
        {/* Title Action Row matching PRF021.png */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div className="spec-badge-pill" style={{ marginBottom: '0.5rem' }}>
              ✔ APPROVED TOUR OPERATOR · TAX ID: {formData.tax_id}
            </div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0' }}>
              Edit Agency Profile
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', maxWidth: '800px', margin: 0 }}>
              Update your enterprise legal identity, curatorial tour specializations, operations team, and field liaison contact for artisan village partnerships. Major legal changes trigger HDT re-review.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link href={`/agency/${params.agencyId}`} className="spec-btn-white">
              CANCEL / DISCARD
            </Link>
            <button onClick={handleSubmit} disabled={saving} className="spec-btn-black">
              {saving ? 'SAVING...' : '✔ SAVE CHANGES'}
            </button>
          </div>
        </div>

        {message && (
          <div
            style={{
              padding: '1rem',
              background: message.type === 'success' ? '#ecfdf5' : message.type === 'warning' ? '#fffbeb' : '#fef2f2',
              border: `1px solid ${message.type === 'success' ? '#a7f3d0' : message.type === 'warning' ? '#fde68a' : '#fecaca'}`,
              color: message.type === 'success' ? '#065f46' : message.type === 'warning' ? '#92400e' : '#991b1b',
              marginBottom: '1.5rem',
              fontWeight: 600,
            }}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* SECTION 01: Core Legal Identity & Enterprise Details matching PRF021.png */}
          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">01 Core Legal Identity & Enterprise Details</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                LEGAL CREDENTIALS & HDT REGISTRY (BR-017)
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2rem' }}>
              <div>
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className="spec-form-label">COMPANY LEGAL ENTERPRISE NAME</label>
                    <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 700 }}>
                      ⚠️ HDT RE-REVIEW ON CHANGE (BR-017)
                    </span>
                  </div>
                  <input
                    type="text"
                    required
                    className="spec-form-input"
                    value={formData.company_name}
                    onChange={e => setFormData({ ...formData, company_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="spec-form-label">TAX IDENTIFICATION (MST)</label>
                      <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: 700 }}>BR-017</span>
                    </div>
                    <input
                      type="text"
                      required
                      className="spec-form-input"
                      value={formData.tax_id}
                      onChange={e => setFormData({ ...formData, tax_id: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="spec-form-label">COMPANY / OPERATOR TYPE</label>
                    <select
                      className="spec-form-input"
                      value={formData.company_type}
                      onChange={e => setFormData({ ...formData, company_type: e.target.value })}
                    >
                      <option value="Tour Operator">Tour Operator (Nhà tổ chức Tour)</option>
                      <option value="Travel Agency">Travel Agency (Đại lý Lữ hành)</option>
                      <option value="TMC">TMC (Quản lý Du lịch Doanh nghiệp)</option>
                      <option value="DMC">DMC (Công ty Quản lý Điểm đến)</option>
                    </select>
                  </div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="spec-form-label">HEADQUARTERS REGISTERED ADDRESS</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '0.75rem' }}>
                    <input
                      type="text"
                      placeholder="Street address"
                      className="spec-form-input"
                      value={formData.street}
                      onChange={e => setFormData({ ...formData, street: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="Ward"
                      className="spec-form-input"
                      value={formData.ward}
                      onChange={e => setFormData({ ...formData, ward: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="District"
                      className="spec-form-input"
                      value={formData.district}
                      onChange={e => setFormData({ ...formData, district: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="City/Province"
                      className="spec-form-input"
                      value={formData.city_province}
                      onChange={e => setFormData({ ...formData, city_province: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Read-Only Status Panel matching PRF021.png */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '1.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#111827', marginBottom: '1rem', letterSpacing: '0.05em' }}>
                    CURRENT APPROVED LEGAL STATUS
                  </div>

                  <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', color: '#4b5563' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.35rem' }}>
                      <span>Account Approval:</span>
                      <strong style={{ color: '#059669' }}>APPROVED (HDT CERTIFIED)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.35rem' }}>
                      <span>Regulatory Authority:</span>
                      <strong>Hanoi Dept of Tourism</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '0.35rem' }}>
                      <span>B2B Contract Authority:</span>
                      <span>Full Access</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Organization UUID:</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{params.agencyId.slice(0, 18)}...</span>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: '#ffffff', border: '1px solid #e5e7eb', fontSize: '0.72rem', color: '#6b7280', lineHeight: 1.4 }}>
                  ℹ️ <strong>System Rule SR-001:</strong> Major updates (Company Name, Tax ID) require HDT re-verification without interrupting ongoing tour dispatches.
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 02: Curatorial Statement & Market Focus */}
          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">02 Curatorial Statement & Market Focus</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                TOUR POSITIONING & TEAM CAPACITY
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label className="spec-form-label">CURATORIAL NARRATIVE & AGENCY PROFILE (MAX 1000 CHARACTERS)</label>
              <textarea
                rows={4}
                className="spec-form-textarea"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', marginBottom: '1.25rem' }}>
              <div>
                <label className="spec-form-label">OPERATIONS TEAM SIZE</label>
                <input
                  type="number"
                  min={1}
                  className="spec-form-input"
                  value={formData.team_size}
                  onChange={e => setFormData({ ...formData, team_size: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="spec-form-label">TOUR SPECIALIZATION DOMAINS (SELECT ALL THAT APPLY)</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.5rem', marginTop: '0.35rem' }}>
                  {availableTourTypes.map(t => {
                    const selected = formData.tour_types.includes(t)
                    return (
                      <div
                        key={t}
                        onClick={() => handleToggleTourType(t)}
                        style={{
                          border: selected ? '2px solid #1e3a5f' : '1px solid #d1d5db',
                          background: selected ? '#f0f9ff' : '#ffffff',
                          padding: '0.65rem 0.85rem',
                          borderRadius: '2px',
                          cursor: 'pointer',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          fontWeight: selected ? 800 : 500,
                          color: selected ? '#1e3a5f' : '#374151',
                        }}
                      >
                        <input type="checkbox" checked={selected} readOnly style={{ cursor: 'pointer' }} />
                        <span>{t}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 03: Field Liaison & Operational Contact */}
          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">03 Field Liaison & Operational Contact</div>
              <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6b7280', textTransform: 'uppercase' }}>
                DIRECT ARTISAN ATELIER COMMUNICATIONS
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label className="spec-form-label">LEAD LIAISON OFFICER NAME</label>
                <input
                  type="text"
                  required
                  className="spec-form-input"
                  value={formData.contact_person_name}
                  onChange={e => setFormData({ ...formData, contact_person_name: e.target.value })}
                />
              </div>

              <div>
                <label className="spec-form-label">HOTLINE / DISPATCH PHONE</label>
                <input
                  type="tel"
                  required
                  className="spec-form-input"
                  value={formData.phone_number}
                  onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                />
              </div>

              <div>
                <label className="spec-form-label">OPERATIONS & B2B EMAIL</label>
                <input
                  type="email"
                  required
                  className="spec-form-input"
                  value={formData.business_email}
                  onChange={e => setFormData({ ...formData, business_email: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Bottom Sticky Action Bar matching PRF128/PRF021 */}
          <div className="spec-sticky-bar">
            <div className="spec-sticky-bar-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span className="spec-badge-pill" style={{ background: '#ecfdf5', color: '#059669', borderColor: '#a7f3d0' }}>
                  ACTIVE REGULATORY APPROVAL
                </span>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Major changes (Company Name, Tax ID) flag HDT review automatically (BR-017).
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Link href={`/agency/${params.agencyId}`} className="spec-btn-white">
                  CANCEL / DISCARD
                </Link>
                <button type="submit" disabled={saving} className="spec-btn-black">
                  {saving ? 'SAVING...' : '✔ SAVE CHANGES'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
