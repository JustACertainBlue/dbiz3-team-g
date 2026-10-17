'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'

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
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [experiences, setExperiences] = useState<ExperienceItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setRole(getCurrentRole())
    const onRoleChanged = () => {
      setRole(getCurrentRole())
    }
    window.addEventListener('hab_role_changed', onRoleChanged)

    // Demo data for experiences belonging to this provider
    setExperiences([
      {
        experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
        name: 'Nặn gốm vuốt tay trên bàn xoay truyền thống',
        category: 'Workshop/Hands-on',
        duration_minutes: 90,
        price_per_person: 150000,
        max_participants: 25,
        notice_period_hours: 24,
        has_active_bookings: true,
      },
      {
        experience_id: 'e1a2b3c4-5555-6666-7777-888899990000',
        name: 'Khám phá lò bầu cổ & Tráng men tro trấu độc bản',
        category: 'Sightseeing/Masterclass',
        duration_minutes: 120,
        price_per_person: 220000,
        max_participants: 15,
        notice_period_hours: 48,
        has_active_bookings: false,
      },
    ])
    setLoading(false)

    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [params.providerId])

  const isLocalProvider = role === 'LocalProvider'

  return (
    <div className="prf-container" style={{ paddingBottom: '5rem' }}>
      {/* Header */}
      <div className="prf-spec-header">
        <div>
          <span className="prf-spec-code">MÃ MÀN HÌNH: EXP067 · EXPERIENCE MANAGEMENT</span>
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
            ← Hồ sơ Xưởng (PRF127)
          </Link>
          <Link
            href={`/provider/${params.providerId}/experiences/new`}
            className="prf-btn prf-btn-primary"
            style={{ fontSize: '0.8rem' }}
          >
            + Thêm Trải Nghiệm Mới (EXP069)
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
          ℹ️ Bạn đang xem màn hình này với vai trò <strong>{role}</strong>. Chỉ tài khoản <strong>Local Provider</strong> (Chủ xưởng) mới có quyền tạo mới, chỉnh sửa giá và điều kiện đặt trải nghiệm.
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

        <div className="prf-section-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
            Tiêu chuẩn hình ảnh (BR-009)
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#059669', marginTop: '0.25rem' }}>
            100% ĐẠT CHUẨN
          </div>
          <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Đủ 3 ảnh theo 3 danh mục bắt buộc</div>
        </div>

        <div className="prf-section-card" style={{ padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
            Đặt tour đang hoạt động
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#b84c24', marginTop: '0.25rem' }}>
            1 đơn B2B giữ chỗ
          </div>
        </div>
      </div>

      {/* Experiences List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                    LOCKED FIELDS: ACTIVE BOOKINGS (SR-003)
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
              <Link
                href={`/provider/${params.providerId}/experiences/${exp.experience_id}/edit`}
                className="prf-btn prf-btn-primary"
                style={{ fontSize: '0.78rem' }}
              >
                ✏️ Chỉnh Sửa Trải Nghiệm (EXP070)
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
