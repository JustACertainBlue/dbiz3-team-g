'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ExperienceTermsField from '../ExperienceTermsField'
import { readCancellationPolicy, type CancellationPolicy, type DiscountRule } from '@/lib/prf/experience-terms'
import ExperienceImagesField, { toImagesPayload, type ExperienceImageItem } from '../ExperienceImagesField'
import { missingCategories } from '@/lib/prf/experience-images'
import { getAuthHeaders } from '@/lib/prf/client-session'
import { readSessionContext } from '@/lib/auth/client-session'

export default function AddExperiencePage({
  params,
}: {
  params: { providerId: string }
}) {
  const [policy, setPolicy] = useState<CancellationPolicy>({ rules: [] })
  const [group, setGroup] = useState<DiscountRule[]>([])
  const [special, setSpecial] = useState<DiscountRule[]>([])
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading,setUploading]=useState(false)
  const [aiRefining, setAiRefining] = useState(false)
  const [aiDraft, setAiDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    category: 'Workshop/Hands-on',
    duration_minutes: 90,
    price_per_person: 150000,
    max_participants: 25,
    notice_period_hours: 24,
    experience_location_address: '',
    cancellation_rules_text: '',
    description: '',
  })

  const [images, setImages] = useState<ExperienceImageItem[]>([])

  useEffect(() => {
    const applySession = async () => {
      const session = await readSessionContext()
      setAuthorized(session.role === 'Local_Provider' && session.providerId === params.providerId)
    }
    applySession().finally(() => setSessionReady(true))
    const onRoleChanged = () => {
      applySession().catch(() => setAuthorized(false))
    }
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  const handleAiRefine = async () => {
    setAiRefining(true)
    try {
      const response = await fetch('/api/prf/ai/description', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_description: formData.description, craft_type: formData.category, target_audience: 'general', language: 'vi' }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'AI refine unavailable')
      setAiDraft(data.refined_description_draft)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'AI refine unavailable')
    } finally {
      setAiRefining(false)
    }
  }

  const handleApplyAiDraft = () => {
    if (aiDraft) {
      setFormData(prev => ({ ...prev, description: aiDraft }))
      setAiDraft(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    if (!authorized) {
      setError('Lỗi phân quyền: Chỉ tài khoản Local Provider mới có quyền tạo mới trải nghiệm.')
      setSaving(false)
      return
    }

    const missing = missingCategories(images)
    if (missing.length > 0) {
      setError(`Required Image Category Missing: ${missing.join(', ')}`)
      setSaving(false)
      return
    }

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        duration_minutes: Number(formData.duration_minutes),
        price_per_person: Number(formData.price_per_person),
        max_participants: Number(formData.max_participants),
        notice_period_hours: Number(formData.notice_period_hours),
        experience_location_address: formData.experience_location_address,
        cancellation_policy: policy,
        group_discounts: group, special_rates: special,
        images: toImagesPayload(images),
      }

      const res = await fetch('/api/prf/experience', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(params.providerId),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Lỗi khi tạo trải nghiệm')
      }

      router.push(`/provider/${params.providerId}/experiences`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra')
    } finally {
      setSaving(false)
    }
  }

  if (!sessionReady) return <div className="prf-container" style={{ padding: '3rem' }}>Đang tải phiên demo…</div>
  const isLocalProvider = authorized

  return (
    <div className="prf-container" style={{ paddingBottom: '7rem' }}>
      {/* Header */}
      <div className="prf-spec-header">
        <div>
          <span className="prf-spec-code">THÊM TRẢI NGHIỆM</span>
          <h1 className="prf-spec-title">Tạo mới Hoạt động Trải nghiệm Làng nghề</h1>
          <p className="prf-spec-subtitle">
            Thiết lập biểu phí B2B, quy mô đoàn khách, thời lượng thực hành và 3 danh mục hình ảnh quy chuẩn
          </p>
        </div>
        <div className="prf-spec-actions">
          <Link
            href={`/provider/${params.providerId}/experiences`}
            className="prf-btn prf-btn-outline"
          >
            ← Danh sách trải nghiệm
          </Link>
        </div>
      </div>

      {/* Role Notice */}
      {!isLocalProvider && (
        <div
          style={{
            background: '#fffbeb',
            border: '2px solid #f59e0b',
            borderRadius: '4px',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <strong style={{ color: '#92400e', fontSize: '0.95rem' }}>
              ⚠️ YÊU CẦU TÀI KHOẢN LOCAL PROVIDER
            </strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#78350f' }}>
              Tài khoản hiện tại không sở hữu Provider này. Chỉ Local Provider đúng tổ chức mới có quyền thêm mới trải nghiệm cho xưởng.
            </p>
          </div>
          <Link
            href={`/login?next=/provider/${params.providerId}/experiences/new`}
            className="prf-btn prf-btn-primary"
            style={{ fontSize: '0.8rem' }}
          >
            Đăng nhập Local Provider
          </Link>
        </div>
      )}

      {error && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            background: '#fef2f2',
            border: '1px solid #ef4444',
            borderRadius: '4px',
            color: '#991b1b',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1.2fr)', gap: '1.75rem' }}>
          {/* Main Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            {/* Section 01: Core Information */}
            <div className="prf-section-card">
              <div className="prf-section-heading">
                <span className="prf-step-badge">01</span>
                <div>
                  <h2 style={{ fontSize: '1rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Thông tin Trải nghiệm Cơ bản
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Tên gọi, phân loại văn hóa và thời lượng hoạt động
                  </span>
                </div>
              </div>

              <div className="prf-field-group">
                <label className="prf-label" htmlFor="experience-field-1">Tên hoạt động trải nghiệm *</label>
                <input id="experience-field-1"
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="prf-input"
                  placeholder="VD: Nặn gốm vuốt tay trên bàn xoay truyền thống"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="prf-field-group">
                  <label className="prf-label" htmlFor="experience-field-2">Phân loại hoạt động *</label>
                  <select id="experience-field-2"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="prf-select"
                  >
                    <option value="Workshop/Hands-on">Workshop / Thực hành nặn gốm</option>
                    <option value="Sightseeing">Tham quan làng nghề / Lò nung cổ</option>
                    <option value="Culinary/Tasting">Ẩm thực làng nghề & Trà đạo</option>
                    <option value="Combo">Combo Trọn gói Trải nghiệm</option>
                  </select>
                </div>

                <div className="prf-field-group">
                  <label className="prf-label" htmlFor="experience-field-3">Thời lượng (phút) *</label>
                  <input id="experience-field-3"
                    type="number"
                    required
                    min={15}
                    value={formData.duration_minutes}
                    onChange={e => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                    className="prf-input"
                  />
                </div>
              </div>

              <div className="prf-field-group">
                <label className="prf-label" htmlFor="experience-field-4">Địa điểm diễn ra trải nghiệm *</label>
                <input id="experience-field-4"
                  type="text"
                  required
                  value={formData.experience_location_address}
                  onChange={e => setFormData({ ...formData, experience_location_address: e.target.value })}
                  className="prf-input"
                  placeholder="Địa chỉ cụ thể tại làng nghề..."
                />
              </div>
            </div>

            {/* Section 02: Narrative & AI Refine */}
            <div className="prf-section-card">
              <div className="prf-section-heading">
                <span className="prf-step-badge">02</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '1rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Mô tả Nội dung Chi tiết
                    </h2>
                    <button
                      type="button"
                      onClick={handleAiRefine}
                      disabled={aiRefining}
                      className="prf-btn prf-btn-outline"
                      style={{ fontSize: '0.75rem', borderColor: '#b84c24', color: '#b84c24' }}
                    >
                      {aiRefining ? 'Đang tinh chỉnh AI...' : '✨ AI Refine Chuẩn Hóa'}
                    </button>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Mô tả quy trình thực hành nghệ nhân, vật phẩm du khách nhận được
                  </span>
                </div>
              </div>

              <div className="prf-field-group">
                <textarea
                  rows={4}
                  required
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="prf-textarea"
                />
              </div>

              {aiDraft && (
                <div
                  style={{
                    padding: '0.85rem 1rem',
                    background: '#fffbeb',
                    border: '1px solid #fcd34d',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    color: '#78350f',
                    marginTop: '0.75rem',
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>Gợi ý mô tả chuẩn hóa từ AI:</div>
                  <div style={{ lineHeight: 1.5, marginBottom: '0.75rem' }}>{aiDraft}</div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleApplyAiDraft}
                      className="prf-btn prf-btn-primary"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.75rem' }}
                    >
                      Áp dụng bản thảo này
                    </button>
                    <button
                      type="button"
                      onClick={() => setAiDraft(null)}
                      className="prf-btn prf-btn-outline"
                      style={{ fontSize: '0.72rem', padding: '0.25rem 0.75rem' }}
                    >
                      Bỏ qua
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Section 03: 3 Mandatory Images (BR-009) */}
            <div className="prf-section-card">
              <div className="prf-section-heading">
                <span className="prf-step-badge">03</span>
                <div>
                  <h2 style={{ fontSize: '1rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    3 Danh mục Hình ảnh Bắt buộc
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#b84c24', fontWeight: 700 }}>
                    Quy chuẩn bắt buộc: Phải cung cấp đủ cả 3 loại ảnh mới có thể xuất bản trải nghiệm
                  </span>
                </div>
              </div>

              <ExperienceImagesField images={images} onChange={setImages} onBusyChange={setUploading} />
            </div>
          </div>

          {/* Right Sidebar: Capacity & Logistics */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
            <div className="prf-section-card">
              <div className="prf-section-heading">
                <span className="prf-step-badge">04</span>
                <div>
                  <h2 style={{ fontSize: '1rem', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Biểu phí & Quy mô Đoàn
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                    Định giá B2B và giới hạn tiếp đón
                  </span>
                </div>
              </div>

              <div className="prf-field-group">
                <label className="prf-label" htmlFor="experience-field-5">Giá niêm yết / khách (VND) *</label>
                <input id="experience-field-5"
                  type="number"
                  required
                  min={1000}
                  step="any"
                  value={formData.price_per_person}
                  onChange={e => setFormData({ ...formData, price_per_person: Number(e.target.value) })}
                  className="prf-input"
                />
              </div>

              <div className="prf-field-group">
                <label className="prf-label" htmlFor="experience-field-6">Số khách tối đa / lượt  *</label>
                <input id="experience-field-6"
                  type="number"
                  required
                  min={1}
                  value={formData.max_participants}
                  onChange={e => setFormData({ ...formData, max_participants: Number(e.target.value) })}
                  className="prf-input"
                />
              </div>

              <div className="prf-field-group">
                <label className="prf-label" htmlFor="experience-field-7">Thời gian báo trước (giờ) *</label>
                <input id="experience-field-7"
                  type="number"
                  required
                  min={0}
                  value={formData.notice_period_hours}
                  onChange={e => setFormData({ ...formData, notice_period_hours: Number(e.target.value) })}
                  className="prf-input"
                />
                <span className="prf-field-helper">Thời gian tối thiểu agency phải chốt đoàn để xưởng chuẩn bị đất sét & bàn xoay.</span>
              </div>

              <ExperienceTermsField policy={policy} group={group} special={special} onPolicy={setPolicy} onGroup={setGroup} onSpecial={setSpecial}/>
            </div>
          </div>
        </div>

        {/* Sticky Actions Bar */}
        <div className="prf-sticky-footer">
          <div className="prf-sticky-footer-content">
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              Trải nghiệm sẽ có hiệu lực tức thì sau khi được tạo thành công
            </span>

            <div className="prf-spec-actions">
              <Link
                href={`/provider/${params.providerId}/experiences`}
                className="prf-btn prf-btn-outline"
              >
                Huỷ
              </Link>
              <button
                type="submit"
                disabled={saving || uploading}
                className="prf-btn prf-btn-primary"
              >
                {saving ? 'Đang tạo...' : 'Tạo trải nghiệm'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
