'use client'

// PRF127 Provider profile (US-3, FR-003; UBND review US-6). Everything shown comes from
// GET /api/prf/provider/:id (checklist §3 #40): no fixed demo text. Edit / Create Booking only for the
// owning Local Provider; the UBND review panel only for UBND while a version is Pending Verification (#33).

import React, { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import MediaImage from '@/app/components/MediaImage'
import { readSessionContext } from '@/lib/auth/client-session'
import type { SessionContext } from '@/lib/auth/session'
import { providerPageView } from '@/lib/prf/provider-page-view'
import { providerBkgLinks } from '@/lib/booking/nav-links'
import StatusBadge from '@/app/components/StatusBadge'
import { statusLabel } from '@/lib/status-labels'

interface ProviderExperience {
  experience_id: string
  name: string
  category?: string
  duration_minutes?: number
  max_participants?: number
  price_per_person?: number
}

interface ProviderData {
  provider_id: string
  provider_name: string
  craft_type: string
  general_description: string
  village_id?: string
  village_name?: string
  village_district?: string
  village_city?: string
  location_address?: string
  artisan_names?: string[]
  business_registration_number?: string
  contact?: { phone_number?: string; business_email?: string }
  verification_status?: string
  pricing?: number
  capacity?: number
  availability?: unknown
  public_images?: string[]
  booking_conditions?: unknown
  experiences?: ProviderExperience[]
}

const vnd = (value?: number) => (value ?? 0).toLocaleString('vi-VN')

export default function ProviderProfilePage({
  params,
}: {
  params: { providerId: string }
}) {
  const [provider, setProvider] = useState<ProviderData | null>(null)
  const [session, setSession] = useState<SessionContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [revisionComments, setRevisionComments] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [reviewMessage, setReviewMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadProfile = useCallback(async () => {
    const res = await fetch(`/api/prf/provider/${params.providerId}`)
    if (!res.ok) {
      throw new Error(res.status === 404 ? 'Hồ sơ làng nghề chưa công bố hoặc không tồn tại' : 'Lỗi tải dữ liệu')
    }
    setProvider(await res.json())
  }, [params.providerId])

  useEffect(() => {
    async function load() {
      try {
        const [viewer] = await Promise.all([readSessionContext(), loadProfile()])
        setSession(viewer)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Lỗi kết nối')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [loadProfile])

  const handleReview = async (decision: 'Approve' | 'Request Revision') => {
    setReviewing(true)
    setReviewMessage(null)
    try {
      const res = await fetch(`/api/prf/provider/${params.providerId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, revision_comments: revisionComments }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lỗi khi thẩm định hồ sơ')
      setReviewMessage({ type: 'success', text: `Đã cập nhật trạng thái thẩm định: ${statusLabel('provider', data.verification_status)}` })
      await loadProfile()
    } catch (err: unknown) {
      setReviewMessage({ type: 'error', text: err instanceof Error ? err.message : 'Không thể thực hiện thẩm định' })
    } finally {
      setReviewing(false)
    }
  }

  if (loading) {
    return (
      <div className="spec-portal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <p style={{ fontWeight: 700, color: '#4b5563' }}>Đang tải hồ sơ xưởng…</p>
      </div>
    )
  }

  if (error || !provider || !session) {
    return (
      <div className="spec-portal" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#be123c', marginBottom: '1rem' }}>Hồ sơ Làng nghề Không tồn tại</h2>
        <p style={{ color: '#6b7280', marginBottom: '2rem' }}>{error || 'Nhà cung cấp chưa được kích hoạt.'}</p>
        <Link href="/" className="spec-btn-black">Trang chủ</Link>
      </div>
    )
  }

  const view = providerPageView(provider, session)
  const village = [provider.village_name, provider.village_district, provider.village_city].filter(Boolean).join(', ')
  const experienceHref = (id: string) => view.canEdit
    ? `/provider/${params.providerId}/experiences/${id}`
    : `/explore/experiences/${id}`

  return (
    <div className="spec-portal">

      <div className="spec-content-wrap"><section className="prf-section-card"><h2>Hình ảnh xưởng</h2><div className="provider-media-grid">{provider.public_images?.length?provider.public_images.map((url,index)=><MediaImage key={url} src={url} alt={`Ảnh xưởng ${index+1}`}/>):<p>Xưởng chưa có ảnh công khai.</p>}</div></section>
        {(view.canEdit || view.canCreateBooking) && (
          <div className="spec-action-bar">
            <div className="spec-action-label">Quản lý xưởng</div>
            {view.canEdit && (
              <Link href={`/provider/${params.providerId}/edit`} className="spec-btn-black">Chỉnh sửa hồ sơ</Link>
            )}
            {view.canCreateBooking && (
              <Link href={`/provider/${params.providerId}/bookings/new`} className="spec-btn-black">+ Tạo booking</Link>
            )}
            {view.experiencesHref && (
              <Link href={view.experiencesHref} className="spec-btn-black">Quản lý trải nghiệm</Link>
            )}
          </div>
        )}

        <div className="spec-hero-box">
          <div>
            {provider.verification_status && (
              <div className="spec-badge-pill">{provider.verification_status === 'Verified' ? '✔ VERIFIED PROVIDER' : `⏳ ${provider.verification_status.toUpperCase()}`}</div>
            )}
            <h1 className="spec-hero-title">{provider.provider_name}</h1>
            <div className="spec-hero-subtitle">{provider.craft_type}</div>
            {village && (
              <div className="spec-hero-location"><span>📍</span><span>{view.villageHref ? <Link href={view.villageHref}>{village}</Link> : village}</span></div>
            )}
            {provider.location_address && (
              <div style={{ fontSize: '0.85rem', color: '#4b5563', marginBottom: '0.75rem' }}>{provider.location_address}</div>
            )}
            {(view.pricingLine || view.capacityLine) && (
              <div data-testid="prf127-pricing" style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem' }}>
                {[view.pricingLine, view.capacityLine].filter(Boolean).join(' · ')}
              </div>
            )}
            {provider.artisan_names && provider.artisan_names.length > 0 && (
              <div className="spec-chips-row">
                {provider.artisan_names.map(name => <span key={name} className="spec-chip">{name}</span>)}
              </div>
            )}
          </div>
          <div>
            <p style={{ fontSize: '0.95rem', color: '#374151', lineHeight: 1.6 }}>{provider.general_description}</p>
            {provider.business_registration_number && (
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.75rem' }}>
                Mã đăng ký kinh doanh: <strong>{provider.business_registration_number}</strong>
              </div>
            )}
          </div>
        </div>

        {provider.experiences && (
          <>
            <h2 className="spec-section-title">Trải nghiệm</h2>
            {provider.experiences.length === 0 && <p style={{ color: '#6b7280' }}>Chưa có trải nghiệm.</p>}
            <div className="spec-exp-grid">
              {provider.experiences.map(exp => (
                <div key={exp.experience_id} className="spec-exp-card">
                  <div className="spec-exp-body">
                    <div className="spec-exp-header-tag"><span>{exp.category}</span></div>
                    <div className="spec-exp-specs">🕒 {exp.duration_minutes} phút · 👥 Tối đa {exp.max_participants} khách</div>
                    <div className="spec-exp-title">{exp.name}</div>
                    <div className="spec-exp-pricing-box">
                      <span className="spec-exp-b2b-rate">{vnd(exp.price_per_person)} ₫ <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>/ khách</span></span>
                    </div>
                    <div className="spec-exp-actions">
                      <Link href={experienceHref(exp.experience_id)} style={{ fontSize: '0.78rem', color: '#111827', fontWeight: 700 }}>Xem chi tiết</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {(provider.contact || view.operatingHours.length > 0 || view.bookingConditions.length > 0) && (
          <div className="spec-info-box">
            <div className="spec-dispatch-grid">
              {provider.contact && (
                <div className="spec-dispatch-col">
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280' }}>Liên hệ</div>
                  {provider.contact.phone_number && <div style={{ fontWeight: 800 }}>{provider.contact.phone_number}</div>}
                  {provider.contact.business_email && <div style={{ fontSize: '0.85rem' }}>{provider.contact.business_email}</div>}
                </div>
              )}
              {provider.availability !== undefined && (
                <div className="spec-dispatch-col">
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280' }}>Giờ hoạt động</div>
                  {view.operatingHours.length === 0 && <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>Chưa có giờ mở cửa.</div>}
                  {view.operatingHours.map(line => <div key={line} style={{ fontSize: '0.85rem' }}>{line}</div>)}
                </div>
              )}
              {provider.booking_conditions !== undefined && (
                <div className="spec-dispatch-col">
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280' }}>Điều kiện đón đoàn</div>
                  {view.bookingConditions.length === 0 && <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>—</div>}
                  {view.bookingConditions.map(line => <div key={line} style={{ fontSize: '0.85rem' }}>{line}</div>)}
                </div>
              )}
            </div>
          </div>
        )}

        {view.canReview && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '1.5rem', marginTop: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                UBND thẩm định hồ sơ (US-6, BR-005)
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#991b1b' }}>
                Trạng thái: <StatusBadge family="provider" status={provider.verification_status} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <input
                type="text"
                aria-label="Nhận xét yêu cầu sửa đổi"
                value={revisionComments}
                onChange={e => setRevisionComments(e.target.value)}
                placeholder="Nhập nhận xét / lý do yêu cầu sửa đổi..."
                style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.8rem', border: '1px solid #d1d5db' }}
              />
              <button onClick={() => handleReview('Request Revision')} disabled={reviewing} className="spec-btn-white" style={{ fontSize: '0.75rem', borderColor: '#b91c1c', color: '#b91c1c' }}>
                {reviewing ? 'Đang gửi...' : 'Yêu cầu sửa đổi'}
              </button>
              <button onClick={() => handleReview('Approve')} disabled={reviewing} className="spec-btn-black" style={{ fontSize: '0.75rem', background: '#059669' }}>
                {reviewing ? 'Đang duyệt...' : '✔ Phê duyệt (Approve)'}
              </button>
            </div>
          </div>
        )}
        {reviewMessage && (
          <div role="status" style={{ padding: '0.75rem', background: '#ffffff', border: '1px solid #d1d5db', fontSize: '0.8rem', marginTop: '1rem', fontWeight: 600 }}>
            {reviewMessage.text}
          </div>
        )}
      </div>
    </div>
  )
}
