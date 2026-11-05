'use client'

// PRF128 Edit Provider Profile (US-4, FR-004). Every field comes from the API; Save sends only the
// changed fields (decision Q1 2026-11-04: no hard-coded demo values, only FR-004 inputs).
// Image and registration-certificate uploads (BR-008) are not on this page yet: see checklist §3.

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { refreshDemoSession } from '@/lib/prf/client-session'
import { providerBkgLinks } from '@/lib/booking/nav-links'
import {
  PROVIDER_CRAFT_TYPES,
  WEEKDAY_LABELS,
  buildProviderPatch,
  profileToForm,
  type ProviderEditForm,
} from '@/lib/prf/provider-edit-form'

const EMPTY_FORM: ProviderEditForm = {
  business_name: '', craft_type: '', business_registration: '', location_address: '',
  general_description: '', artisan_names: '', phone_number: '', business_email: '', operating_hours: [],
}

export default function EditProviderProfilePage({
  params,
}: {
  params: { providerId: string }
}) {
  const [initial, setInitial] = useState<ProviderEditForm>(EMPTY_FORM)
  const [formData, setFormData] = useState<ProviderEditForm>(EMPTY_FORM)
  const [authorized, setAuthorized] = useState<boolean | null>(null)
  const [status, setStatus] = useState<string>('')
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
        const [profileRes, scheduleRes] = await Promise.all([
          fetch(`/api/prf/provider/${params.providerId}`),
          fetch(`/api/bkg/providers/${params.providerId}/schedule`),
        ])
        if (!profileRes.ok) {
          setMessage({ type: 'error', text: 'Không tải được hồ sơ Provider.' })
          return
        }
        const profile = await profileRes.json()
        const schedule = scheduleRes.ok ? await scheduleRes.json() : null
        const form = profileToForm(profile, schedule?.data?.operating_hours)
        setInitial(form)
        setFormData(form)
        setStatus(profile.verification_status || '')
      } catch {
        setMessage({ type: 'error', text: 'Lỗi kết nối khi tải hồ sơ.' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.providerId])

  if (!loading && authorized === false) {
    return <main className="prf-container" style={{ padding: '3rem' }}><h1>403 · Không có quyền chỉnh sửa</h1><p>Chỉ chủ sở hữu Local Provider mới được sửa hồ sơ này.</p><Link href={`/provider/${params.providerId}`}>← Xem hồ sơ</Link></main>
  }

  const set = (field: keyof ProviderEditForm, value: string) => setFormData(prev => ({ ...prev, [field]: value }))

  const setHour = (index: number, field: 'weekday' | 'local_start' | 'local_end', value: string) =>
    setFormData(prev => ({
      ...prev,
      operating_hours: prev.operating_hours.map((row, i) => i === index ? { ...row, [field]: field === 'weekday' ? Number(value) : value } : row),
    }))

  const addHour = () => setFormData(prev => ({ ...prev, operating_hours: [...prev.operating_hours, { weekday: 1, local_start: '08:00', local_end: '17:00' }] }))
  const removeHour = (index: number) => setFormData(prev => ({ ...prev, operating_hours: prev.operating_hours.filter((_, i) => i !== index) }))

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
          craft_type: formData.craft_type || 'Other',
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
          text: '✨ Đã tạo bản nháp AI trong ô mô tả. Bản nháp chưa được lưu; bấm Save để chấp nhận.',
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
    const patch = buildProviderPatch(initial, formData)
    if (Object.keys(patch).length === 0) {
      setMessage({ type: 'success', text: 'Không có thay đổi nào để lưu.' })
      return
    }
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/prf/provider/${params.providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (res.ok) {
        setInitial(formData)
        if (data.new_version_pending) {
          setMessage({
            type: 'success',
            text: `✓ Đã lưu. Bản sửa đổi đang ở trạng thái ${data.verification_status} chờ UBND thẩm định; phiên bản đã xác minh vẫn hiển thị công khai.`,
          })
        } else {
          setStatus(data.verification_status)
          setMessage({ type: 'success', text: `✓ Lưu thay đổi thành công. Trạng thái: ${data.verification_status}` })
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

  const field = (label: string, name: keyof ProviderEditForm, hint?: string) => (
    <div style={{ marginBottom: '1.25rem' }}>
      <label className="spec-form-label" htmlFor={`prf128-${name}`}>{label}</label>
      <input
        id={`prf128-${name}`}
        type="text"
        className="spec-form-input"
        value={formData[name] as string}
        onChange={e => set(name, e.target.value)}
      />
      {hint && <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.25rem' }}>{hint}</div>}
    </div>
  )

  return (
    <div className="spec-portal">
      <header className="spec-header">
        <div>
          <div className="spec-brand-title">HANOI ARTISAN BRIDGE</div>
          <div className="spec-brand-sub">LOCAL PROVIDER PORTAL</div>
        </div>

        <nav className="spec-nav">
          <Link href={providerBkgLinks(params.providerId).dashboard}>Dashboard</Link>
          <Link href={`/provider/${params.providerId}/experiences`}>Experience Management</Link>
          <Link href={providerBkgLinks(params.providerId).bookings}>Bookings</Link>
          <Link href={providerBkgLinks(params.providerId).schedule}>Schedule</Link>
          <Link href="/messages">Messages</Link>
        </nav>

        <div className="spec-user-profile">
          <div style={{ fontWeight: 800 }}>{initial.business_name}</div>
        </div>
      </header>

      <div className="spec-subheader">
        <div>
          PROVIDER PORTAL / <span style={{ color: '#111827' }}>EDIT PROVIDER PROFILE (PRF128)</span>
        </div>
        <div>
          VERIFICATION STATUS: <span style={{ color: '#111827' }}>{status}</span>
        </div>
      </div>

      <div className="spec-content-wrap">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#111827', margin: '0 0 0.5rem 0' }}>
              Edit Provider Profile
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.9rem', maxWidth: '800px', margin: 0 }}>
              Business Name, Craft Type và Business Registration là trường trọng yếu: khi hồ sơ đã được xác minh, thay đổi chúng tạo một bản sửa đổi chờ UBND thẩm định, còn phiên bản đã xác minh vẫn hiển thị công khai.
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
          <div role="status" style={{ padding: '1rem', background: message.type === 'success' ? '#ecfdf5' : '#fef2f2', border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`, color: message.type === 'success' ? '#065f46' : '#991b1b', marginBottom: '1.5rem', fontWeight: 600 }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">01 Provider Identity</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              <div>
                {field('BUSINESS NAME (major field)', 'business_name')}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label className="spec-form-label" htmlFor="prf128-craft_type">CRAFT TYPE (major field)</label>
                  <select
                    id="prf128-craft_type"
                    className="spec-form-input"
                    value={formData.craft_type}
                    onChange={e => set('craft_type', e.target.value)}
                  >
                    {!PROVIDER_CRAFT_TYPES.includes(formData.craft_type as typeof PROVIDER_CRAFT_TYPES[number]) && (
                      <option value={formData.craft_type}>{formData.craft_type || '—'}</option>
                    )}
                    {PROVIDER_CRAFT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </div>
                {field('BUSINESS REGISTRATION NUMBER (major field)', 'business_registration')}
              </div>
              <div>
                {field('LOCATION ADDRESS', 'location_address')}
                {field('ARTISAN NAMES', 'artisan_names', 'Phân cách bằng dấu phẩy.')}
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="spec-form-label" htmlFor="prf128-general_description">DESCRIPTION</label>
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
                id="prf128-general_description"
                rows={4}
                maxLength={1000}
                className="spec-form-input"
                value={formData.general_description}
                onChange={e => set('general_description', e.target.value)}
              />
            </div>
          </div>

          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">02 Contact</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {field('PHONE NUMBER', 'phone_number')}
              {field('BUSINESS EMAIL', 'business_email')}
            </div>
          </div>

          <div className="spec-form-section">
            <div className="spec-form-section-header">
              <div className="spec-section-num">03 Operating Hours (weekly, BR-021)</div>
              <button type="button" className="spec-btn-white" style={{ fontSize: '0.72rem' }} onClick={addHour}>
                + ADD TIME RANGE
              </button>
            </div>
            {formData.operating_hours.length === 0 && (
              <p style={{ fontSize: '0.85rem', color: '#6b7280' }}>Chưa có giờ mở cửa.</p>
            )}
            {formData.operating_hours.map((row, index) => (
              <div key={index} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: '1rem', marginBottom: '0.75rem', alignItems: 'end' }}>
                <div>
                  <label className="spec-form-label" htmlFor={`prf128-hours-${index}-weekday`}>WEEKDAY</label>
                  <select id={`prf128-hours-${index}-weekday`} className="spec-form-input" value={row.weekday} onChange={e => setHour(index, 'weekday', e.target.value)}>
                    {Object.entries(WEEKDAY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="spec-form-label" htmlFor={`prf128-hours-${index}-start`}>FROM</label>
                  <input id={`prf128-hours-${index}-start`} type="time" className="spec-form-input" value={row.local_start} onChange={e => setHour(index, 'local_start', e.target.value)} />
                </div>
                <div>
                  <label className="spec-form-label" htmlFor={`prf128-hours-${index}-end`}>TO</label>
                  <input id={`prf128-hours-${index}-end`} type="time" className="spec-form-input" value={row.local_end} onChange={e => setHour(index, 'local_end', e.target.value)} />
                </div>
                <button type="button" className="spec-btn-white" style={{ fontSize: '0.72rem' }} onClick={() => removeHour(index)}>
                  REMOVE
                </button>
              </div>
            ))}
          </div>

          <div style={{ background: '#ffffff', borderTop: '1px solid #e5e7eb', padding: '1rem 2.5rem', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
            <Link href={`/provider/${params.providerId}`} className="spec-btn-white">
              DISCARD CHANGES
            </Link>
            <button type="submit" disabled={saving} className="spec-btn-black">
              {saving ? 'SAVING...' : '✔ SAVE PROVIDER PROFILE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
