'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCurrentRole, setCurrentRole, getAuthHeaders, type CurrentUserRole } from '@/lib/prf/client-session'

export default function AddExperiencePage({
  params,
}: {
  params: { providerId: string }
}) {
  const router = useRouter()
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [saving, setSaving] = useState(false)
  const [aiRefining, setAiRefining] = useState(false)
  const [aiDraft, setAiDraft] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: 'Khóa học Nặn gốm Vuốt tay Truyền thống Bát Tràng',
    category: 'Workshop/Hands-on',
    duration_minutes: 90,
    price_per_person: 150000,
    max_participants: 25,
    notice_period_hours: 24,
    experience_location_address: 'Số 12 xóm 3 làng cổ Bát Tràng, Gia Lâm, Hà Nội',
    cancellation_rules_text: 'Hủy trước 24 giờ: Miễn phí 100%. Hủy trong vòng 24 giờ: Phí 50%.',
    description: 'Du khách được nghệ nhân hướng dẫn trực tiếp từ khâu nhào đất, đặt đất lên bàn xoay, vuốt tạo hình chén, đĩa, bình hoa và tự tay khắc họa tiết hoa văn theo phong cách truyền thống.',
  })

  const [images, setImages] = useState({
    artisan_working: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
    workshop_space: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
    finished_product: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80',
  })

  useEffect(() => {
    setRole(getCurrentRole())
    const onRoleChanged = () => {
      setRole(getCurrentRole())
    }
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  const handleRoleSwitchToProvider = () => {
    setCurrentRole('LocalProvider')
    setRole('LocalProvider')
  }

  const handleAiRefine = () => {
    setAiRefining(true)
    setTimeout(() => {
      setAiDraft(
        `[Bản gợi ý AI Refine F-PROFILE-07]: Hòa mình vào không gian xưởng gốm Bát Tràng 700 năm tuổi, du khách sẽ được các nghệ nhân thế hệ thứ 5 chỉ dạy kỹ pháp "vuốt tay - nắn gốm" tinh tế trên bàn xoay đồng trục. Bạn sẽ tự tay nhào nặn đất sét trắng Trúc Thôn, định hình tác phẩm độc bản và chạm khắc hoa văn hoa sen cổ điển. Trải nghiệm bao gồm tráng men rạn độc quyền và dịch vụ nung lò hoàn thiện gửi về tận nơi.`
      )
      setAiRefining(false)
    }, 700)
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

    if (role !== 'LocalProvider') {
      setError('Lỗi phân quyền: Chỉ tài khoản Local Provider mới có quyền tạo mới trải nghiệm (BR-001). Vui lòng chuyển vai trò.')
      setSaving(false)
      return
    }

    const imageList = [
      { url: images.artisan_working, category: 'artisan_working' },
      { url: images.workshop_space, category: 'workshop_space' },
      { url: images.finished_product, category: 'finished_product' },
    ]

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
        cancellation_policy: {
          rules: [{ threshold_hours: 24, fee_percentage: 50 }],
          notes: formData.cancellation_rules_text,
        },
        images: imageList,
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

  const isLocalProvider = role === 'LocalProvider'

  return (
    <div className="prf-container" style={{ paddingBottom: '7rem' }}>
      {/* Header */}
      <div className="prf-spec-header">
        <div>
          <span className="prf-spec-code">MÃ MÀN HÌNH: EXP069 · ADD EXPERIENCE</span>
          <h1 className="prf-spec-title">Tạo mới Hoạt động Trải nghiệm Làng nghề</h1>
          <p className="prf-spec-subtitle">
            Thiết lập biểu phí B2B, quy mô đoàn khách, thời lượng thực hành và 3 danh mục hình ảnh quy chuẩn (BR-009)
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link
            href={`/provider/${params.providerId}/experiences`}
            className="prf-btn prf-btn-outline"
            style={{ fontSize: '0.8rem' }}
          >
            ← Danh sách Trải nghiệm (EXP067)
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
              ⚠️ YÊU CẦU TÀI KHOẢN LOCAL PROVIDER (BR-001)
            </strong>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#78350f' }}>
              Bạn đang ở vai trò <strong>{role}</strong>. Chỉ tài khoản Local Provider mới có quyền thêm mới trải nghiệm cho xưởng.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRoleSwitchToProvider}
            className="prf-btn prf-btn-primary"
            style={{ fontSize: '0.8rem' }}
          >
            🏺 Chuyển sang tài khoản Local Provider
          </button>
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
                <label className="prf-label">Tên hoạt động trải nghiệm *</label>
                <input
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
                  <label className="prf-label">Phân loại hoạt động *</label>
                  <select
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
                  <label className="prf-label">Thời lượng (phút) *</label>
                  <input
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
                <label className="prf-label">Địa điểm diễn ra trải nghiệm *</label>
                <input
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
                    3 Danh mục Hình ảnh Bắt buộc (BR-009)
                  </h2>
                  <span style={{ fontSize: '0.75rem', color: '#b84c24', fontWeight: 700 }}>
                    Quy chuẩn bắt buộc: Phải cung cấp đủ cả 3 loại ảnh mới có thể xuất bản trải nghiệm
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div className="prf-field-group">
                  <label className="prf-label">
                    1. Ảnh nghệ nhân đang thao tác chế tác (artisan_working) *
                  </label>
                  <input
                    type="url"
                    required
                    value={images.artisan_working}
                    onChange={e => setImages({ ...images, artisan_working: e.target.value })}
                    className="prf-input"
                  />
                </div>

                <div className="prf-field-group">
                  <label className="prf-label">
                    2. Ảnh không gian xưởng & khu vực trải nghiệm (workshop_space) *
                  </label>
                  <input
                    type="url"
                    required
                    value={images.workshop_space}
                    onChange={e => setImages({ ...images, workshop_space: e.target.value })}
                    className="prf-input"
                  />
                </div>

                <div className="prf-field-group">
                  <label className="prf-label">
                    3. Ảnh sản phẩm thủ công hoàn thiện (finished_product) *
                  </label>
                  <input
                    type="url"
                    required
                    value={images.finished_product}
                    onChange={e => setImages({ ...images, finished_product: e.target.value })}
                    className="prf-input"
                  />
                </div>
              </div>
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
                <label className="prf-label">Giá niêm yết / khách (VND) *</label>
                <input
                  type="number"
                  required
                  min={1000}
                  step={5000}
                  value={formData.price_per_person}
                  onChange={e => setFormData({ ...formData, price_per_person: Number(e.target.value) })}
                  className="prf-input"
                />
              </div>

              <div className="prf-field-group">
                <label className="prf-label">Số khách tối đa / lượt (max_participants) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={formData.max_participants}
                  onChange={e => setFormData({ ...formData, max_participants: Number(e.target.value) })}
                  className="prf-input"
                />
              </div>

              <div className="prf-field-group">
                <label className="prf-label">Thời gian báo trước (giờ) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={formData.notice_period_hours}
                  onChange={e => setFormData({ ...formData, notice_period_hours: Number(e.target.value) })}
                  className="prf-input"
                />
                <span className="prf-field-helper">Thời gian tối thiểu agency phải chốt đoàn để xưởng chuẩn bị đất sét & bàn xoay.</span>
              </div>

              <div className="prf-field-group">
                <label className="prf-label">Chính sách hủy dịch vụ</label>
                <textarea
                  rows={3}
                  value={formData.cancellation_rules_text}
                  onChange={e => setFormData({ ...formData, cancellation_rules_text: e.target.value })}
                  className="prf-textarea"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Actions Bar */}
        <div className="prf-sticky-footer">
          <div className="prf-sticky-footer-content">
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              Trải nghiệm sẽ có hiệu lực tức thì sau khi được tạo thành công
            </span>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Link
                href={`/provider/${params.providerId}/experiences`}
                className="prf-btn prf-btn-outline"
              >
                Hủy (Discard)
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="prf-btn prf-btn-primary"
                style={{ padding: '0.55rem 1.75rem' }}
              >
                {saving ? 'Đang tạo...' : 'Tạo Trải Nghiệm Mới (EXP069)'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
