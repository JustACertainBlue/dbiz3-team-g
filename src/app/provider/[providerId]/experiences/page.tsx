'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { readSessionContext } from '@/lib/auth/client-session'

interface ExperienceItem {
  experience_id: string
  name: string
  category: string
  duration_minutes: number
  price_per_person: number
  max_participants: number
  notice_period_hours?: number
  has_active_bookings?: boolean
}

export default function ExperienceManagementPage({
  params,
}: {
  params: { providerId: string }
}) {
  const [authorized, setAuthorized] = useState(false)
  const [experiences, setExperiences] = useState<ExperienceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let alive = true
    const applySession = async () => {
      const session = await readSessionContext()
      if (!alive) return
      const canManage = session.role === 'Local_Provider' && session.providerId === params.providerId
      setAuthorized(canManage)
      if (!canManage) {
        setLoading(false)
        return
      }
      setLoadError(false)
      await fetch(`/api/prf/experience?provider_id=${encodeURIComponent(params.providerId)}`)
        .then(response => response.ok ? response.json() : Promise.reject(new Error('Unable to load experiences')))
        .then(data => { if (alive) setExperiences(data.experiences || []) })
        .finally(() => { if (alive) setLoading(false) })
    }
    applySession().catch(() => { if (alive) { setLoadError(true); setLoading(false) } })
    const onRoleChanged = () => {
      applySession().catch(() => { if (alive) setAuthorized(false) })
    }
    window.addEventListener('hab_role_changed', onRoleChanged)

    return () => { alive = false; window.removeEventListener('hab_role_changed', onRoleChanged) }
  }, [params.providerId])

  const isLocalProvider = authorized

  return (
    <div className="prf-container" style={{ paddingBottom: '5rem' }}>
      {/* Header */}
      <div className="prf-spec-header">
        <div>
          <span className="prf-spec-code">QUẢN LÝ TRẢI NGHIỆM</span>
          <h1 className="prf-spec-title">Quản lý Hoạt động Trải nghiệm Làng nghề</h1>
          <p className="prf-spec-subtitle">
            Danh mục các hoạt động văn hóa, nặn gốm và tham quan do xưởng trực tiếp cung cấp cho du khách và tour B2B
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Link
            href={`/provider/${params.providerId}`}
            className="prf-btn prf-btn-outline"
            style={{ fontSize: '0.8rem' }}
          >
            ← Hồ sơ xưởng
          </Link>
          <Link
            href={`/provider/${params.providerId}/experiences/new`}
            className="prf-btn prf-btn-primary"
            style={{ fontSize: '0.8rem' }}
          >
            + Thêm trải nghiệm mới
          </Link>
        </div>
      </div>

      {/* Warning if not Local Provider */}
      {!isLocalProvider && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #f59e0b',
            borderRadius: '4px',
            padding: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.82rem',
            color: '#92400e',
          }}
        >
          ℹ️ Tài khoản hiện tại không sở hữu Provider này. Chỉ <strong>Local Provider</strong> (Chủ xưởng) đúng tổ chức mới có quyền tạo mới, chỉnh sửa giá và điều kiện đặt trải nghiệm.
        </div>
      )}

      {/* Stat Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        <div className="prf-section-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
            Tổng trải nghiệm hoạt động
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginTop: '0.25rem' }}>
            {experiences.length} chương trình
          </div>
        </div>

      </div>

      {/* Experiences List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {loading && <p>Đang tải trải nghiệm…</p>}
        {loadError && <p role="alert">Không thể tải trải nghiệm. Vui lòng tải lại trang.</p>}
        {!loading && !loadError && authorized && experiences.length === 0 && <p>Chưa có trải nghiệm nào. Hãy thêm trải nghiệm đầu tiên.</p>}
        {experiences.map(exp => (
          <div
            key={exp.experience_id}
            className="prf-section-card"
            style={{
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
                <span className="prf-badge prf-badge-verified">{exp.category}</span>
                <span className="prf-badge" style={{ background: '#f3f4f6', color: '#374151' }}>
                  ⏱️ {exp.duration_minutes} phút
                </span>
                {exp.has_active_bookings && (
                  <span className="prf-badge prf-badge-warning">
                    Một số thông tin bị khóa do có booking đang hoạt động
                  </span>
                )}
              </div>

              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#111827' }}>
                {exp.name}
              </h3>

              <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', color: '#4b5563', flexWrap: 'wrap' }}>
                <div>
                  <strong>Giá niêm yết:</strong>{' '}
                  <span style={{ color: '#b84c24', fontWeight: 700 }}>
                    {exp.price_per_person.toLocaleString('vi-VN')} VND / khách
                  </span>
                </div>
                <div>
                  <strong>Sức chứa tối đa:</strong> {exp.max_participants} người / lượt
                </div>
                <div>
                  <strong>Thời gian báo trước:</strong> {exp.notice_period_hours} giờ
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Link href={`/provider/${params.providerId}/experiences/${exp.experience_id}`} className="prf-btn prf-btn-outline" style={{ fontSize: '0.78rem' }}>Xem chi tiết</Link>
              <Link
                href={`/provider/${params.providerId}/experiences/${exp.experience_id}/edit`}
                className="prf-btn prf-btn-primary"
                style={{ fontSize: '0.78rem' }}
              >
                Chỉnh sửa
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
