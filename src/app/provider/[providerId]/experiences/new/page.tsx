'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Breadcrumb } from '@/app/components/ui'
import '../../../v3/provider-v3.css'
import ExperienceFormBody from '../ExperienceFormBody'
import ExperienceTermsField from '../ExperienceTermsField'
import { readCancellationPolicy, type CancellationPolicy, type DiscountRule } from '@/lib/prf/experience-terms'
import ExperienceImagesField, { toImagesPayload, type ExperienceImageItem } from '../ExperienceImagesField'
import { missingCategories } from '@/lib/prf/experience-images'
import { HighlightsCard, SuitableCard, InclusionsCard, ChildPolicyField, SlotsReadOnly, type SlotLine } from '../ExperienceContentFields'
import { contentFormFromRow, contentPayload, emptyContentForm } from '@/lib/prf/experience-content-form'
import { getAuthHeaders } from '@/lib/prf/client-session'
import { readSessionContext } from '@/lib/auth/client-session'

export default function AddExperiencePage({
  params,
}: {
  params: { providerId: string }
}) {
  const [content, setContent] = useState(emptyContentForm())
  const [slots, setSlots] = useState<SlotLine[]>([])
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
        ...contentPayload(content),
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
    <div className="prf-container pv3-form" style={{ paddingBottom: '7rem' }}>
      {/* Header (screen 32, mockup 32) */}
      <Breadcrumb items={[{ label: 'Tổng quan', href: `/provider/${params.providerId}/dashboard` }, { label: 'Trải nghiệm của xưởng', href: `/provider/${params.providerId}/experiences` }, { label: 'Thêm trải nghiệm' }]} />
      <div className="prf-spec-header">
        <div>
          <h1 className="prf-spec-title">Thêm trải nghiệm</h1>
          <p className="prf-spec-subtitle">
            Các phần được đặt đúng thứ tự trên trang chi tiết trải nghiệm mà công ty lữ hành thấy.
          </p>
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
        <ExperienceFormBody formData={formData} setFormData={setFormData} hasActiveBookings={false} images={images} setImages={setImages} setUploading={setUploading}
          content={content} setContent={setContent} slots={slots} policy={policy} group={group} special={special} onPolicy={setPolicy} onGroup={setGroup} onSpecial={setSpecial}
          aiRefining={aiRefining} aiDraft={aiDraft} onAiRefine={handleAiRefine} onApplyDraft={handleApplyAiDraft} onDismissDraft={() => setAiDraft(null)} />

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
