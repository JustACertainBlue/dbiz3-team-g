'use client'

import { useHydrated } from '@/app/provider/v3/useHydrated'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Breadcrumb } from '@/app/components/ui'
import '../../../../v3/provider-v3.css'
import ExperienceFormBody from '../../ExperienceFormBody'
import ExperienceTermsField from '../../ExperienceTermsField'
import { readCancellationPolicy, cancellationPatch, type CancellationPolicy, type DiscountRule } from '@/lib/prf/experience-terms'
import ExperienceImagesField, { toImagesPayload, type ExperienceImageItem } from '../../ExperienceImagesField'
import ExperienceLocationField from '../../ExperienceLocationField'
import { HighlightsCard, SuitableCard, InclusionsCard, ChildPolicyField, SlotsReadOnly, type SlotLine } from '../../ExperienceContentFields'
import { contentFormFromRow, contentPayload, emptyContentForm } from '@/lib/prf/experience-content-form'
import { getAuthHeaders } from '@/lib/prf/client-session'
import { readSessionContext } from '@/lib/auth/client-session'

export default function EditExperiencePage({
  params,
}: {
  params: { providerId: string; experienceId: string }
}) {
  const [initialPolicy, setInitialPolicy] = useState<CancellationPolicy>({ rules: [] })
  const [content, setContent] = useState(emptyContentForm())
  const hydrated = useHydrated()
  const [craftLine, setCraftLine] = useState('')
  useEffect(() => { fetch(`/api/prf/provider/${params.providerId}/craft-line`).then(r => r.ok ? r.json() : null).then(d => setCraftLine(d?.craft_line ?? '')).catch(() => {}) }, [params.providerId])
  const [slots, setSlots] = useState<SlotLine[]>([])
  const [policy, setPolicy] = useState<CancellationPolicy>({ rules: [] })
  const [group, setGroup] = useState<DiscountRule[]>([])
  const [special, setSpecial] = useState<DiscountRule[]>([])
  const router = useRouter()
  const [authorized, setAuthorized] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading,setUploading]=useState(false)
  const [loadError,setLoadError]=useState('')
  const [aiRefining, setAiRefining] = useState(false)
  const [aiDraft, setAiDraft] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const [hasActiveBookings, setHasActiveBookings] = useState(false)

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
    let alive = true
    readSessionContext().then(session => {
      if (alive) setAuthorized(session.role === 'Local_Provider' && session.providerId === params.providerId && !session.mustChangePassword)
      return fetch(`/api/prf/experience/${params.experienceId}`)
    }).then(response => response.ok ? response.json() : Promise.reject(new Error('Experience not found')))
      .then(data => {
        if (!alive) return
        if(data.provider_id!==params.providerId)throw new Error('Trải nghiệm không thuộc xưởng này.')
        setInitialPolicy(readCancellationPolicy(data.cancellation_policy)); setPolicy(readCancellationPolicy(data.cancellation_policy)); setGroup(data.group_discounts || []); setSpecial(data.special_rates || [])
        setFormData({
          name: data.name || '', category: data.category || 'Workshop/Hands-on',
          duration_minutes: Number(data.duration_minutes || 60), price_per_person: Number(data.price_per_person || 0),
          max_participants: Number(data.max_participants || 1), notice_period_hours: Number(data.notice_period_hours ?? 24),
          experience_location_address: data.experience_location_address || '',
          cancellation_rules_text: (() => {
            try { return JSON.parse(data.cancellation_policy || '{}').notes || '' } catch { return data.cancellation_policy || '' }
          })(),
          description: data.description || '',
        })
        setHasActiveBookings(Boolean(data.has_active_bookings))
        setImages((data.images || []) as ExperienceImageItem[])
        setContent(contentFormFromRow(data)); setSlots(data.slots || [])
      }).catch(cause=>{if(alive)setLoadError(cause instanceof Error?cause.message:'Không thể tải trải nghiệm.')}).finally(() => { if (alive) setSessionReady(true) })
    const onRoleChanged = () => {
      readSessionContext()
        .then(session => { if (alive) setAuthorized(session.role === 'Local_Provider' && session.providerId === params.providerId && !session.mustChangePassword) })
        .catch(() => { if (alive) setAuthorized(false) })
    }
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => { alive = false; window.removeEventListener('hab_role_changed', onRoleChanged) }
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
      setFeedback({ type: 'error', message: reason instanceof Error ? reason.message : 'AI refine unavailable' })
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
    setFeedback(null)

    if (!authorized) {
      setFeedback({
        type: 'error',
        message: 'Lỗi phân quyền: Chỉ tài khoản Local Provider mới có quyền cập nhật trải nghiệm.',
      })
      setSaving(false)
      return
    }

    try {
      const payload = {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        notice_period_hours: Number(formData.notice_period_hours),
        experience_location_address: formData.experience_location_address,
        ...(!hasActiveBookings ? {
          duration_minutes: Number(formData.duration_minutes),
          price_per_person: Number(formData.price_per_person),
          max_participants: Number(formData.max_participants),
        } : {}),
        ...cancellationPatch(initialPolicy, policy),
        group_discounts: group, special_rates: special,
        ...contentPayload(content),
        images: toImagesPayload(images),
      }

      const res = await fetch(`/api/prf/experience/${params.experienceId}`, {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(params.providerId),
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Lỗi cập nhật trải nghiệm')
      }

      setInitialPolicy(policy)
      setFeedback({
        type: 'success',
        message: 'Trải nghiệm đã được cập nhật thành công!',
      })
    } catch (err: unknown) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loadError) return <main className="prf-container"><h1>Không thể mở trang chỉnh sửa</h1><p role="alert">{loadError}</p><Link href={`/provider/${params.providerId}/experiences`}>Quay lại danh sách</Link></main>
  if (!sessionReady) return <div className="prf-container" style={{ padding: '3rem' }}>Đang tải Experience…</div>
  const isLocalProvider = authorized

  return (
    <div className="prf-container pv3-form" style={{ paddingBottom: '7rem' }}>
      {/* Header (screen 32, mockup 32) */}
      <Breadcrumb items={[{ label: 'Tổng quan', href: `/provider/${params.providerId}/dashboard` }, { label: 'Trải nghiệm của xưởng', href: `/provider/${params.providerId}/experiences` }, { label: formData.name ? `Sửa “${formData.name}”` : 'Sửa trải nghiệm' }]} />
      <div className="prf-spec-header">
        <div>
          <h1 className="prf-spec-title">{formData.name ? `Sửa “${formData.name}”` : 'Sửa trải nghiệm'}</h1>
          <p className="prf-spec-subtitle">
            Các phần được đặt đúng thứ tự trên trang chi tiết trải nghiệm mà công ty lữ hành thấy.
          </p>
        </div>
        <div className="prf-spec-actions">
          <Link href={`/provider/${params.providerId}/experiences/${params.experienceId}`} className="pv3-link">Xem trang chi tiết ›</Link>
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
              Tài khoản hiện tại không sở hữu Provider này. Chỉ Local Provider đúng tổ chức mới có quyền chỉnh sửa trải nghiệm của xưởng.
            </p>
          </div>
          <Link
            href={`/login?next=/provider/${params.providerId}/experiences/${params.experienceId}/edit`}
            className="prf-btn prf-btn-primary"
            style={{ fontSize: '0.8rem' }}
          >
            Đăng nhập Local Provider
          </Link>
        </div>
      )}

      {/* SR-003 Active Bookings Banner */}
      {hasActiveBookings && (
        <div
          style={{
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '4px',
            padding: '1rem 1.25rem',
            marginBottom: '1.75rem',
            fontSize: '0.82rem',
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>🔒</span>
          <div>
            <strong>KHÓA TRƯỜNG DỮ LIỆU ĐANG CÓ BOOKING HOẠT ĐỘNG:</strong>
            <p style={{ margin: '0.2rem 0 0 0' }}>
              Trải nghiệm này đang có hợp đồng tour hoặc booking giữ chỗ còn hiệu lực. Để đảm bảo quyền lợi của công ty lữ hành, các trường: <em>Giá niêm yết, Sức chứa tối đa, Thời lượng và Địa điểm</em> bị khóa không cho sửa đổi trực tiếp.
            </p>
          </div>
        </div>
      )}

      {feedback && (
        <div
          style={{
            padding: '1rem',
            marginBottom: '1.5rem',
            borderRadius: '4px',
            background: feedback.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: feedback.type === 'success' ? '1px solid #10b981' : '1px solid #ef4444',
            color: feedback.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {feedback.message}
        </div>
      )}

      <form method="post" onSubmit={handleSubmit}>
        <ExperienceFormBody craftLine={craftLine} formData={formData} setFormData={setFormData} hasActiveBookings={hasActiveBookings} images={images} setImages={setImages} setUploading={setUploading}
          content={content} setContent={setContent} slots={slots} policy={policy} group={group} special={special} onPolicy={setPolicy} onGroup={setGroup} onSpecial={setSpecial}
          aiRefining={aiRefining} aiDraft={aiDraft} onAiRefine={handleAiRefine} onApplyDraft={handleApplyAiDraft} onDismissDraft={() => setAiDraft(null)} />

        {/* Sticky Actions Bar */}
        <div className="prf-sticky-footer">
          <div className="prf-sticky-footer-content">
            <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
              {hasActiveBookings ? 'Đang bảo vệ giá theo hợp đồng tour đang chạy' : 'Mọi thay đổi có hiệu lực ngay'}
            </span>

            <div className="prf-spec-actions">
              <Link
                href={`/provider/${params.providerId}/experiences`}
                className="prf-btn prf-btn-outline"
              >
                Huỷ thay đổi
              </Link>
              <button
                type="submit"
                disabled={saving || uploading || !hydrated}
                className="prf-btn prf-btn-primary"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}
