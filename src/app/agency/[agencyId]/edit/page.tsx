'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getAuthHeaders } from '@/lib/prf/client-session'
import { readSessionContext } from '@/lib/auth/client-session'
import type { AuthRole, SessionContext } from '@/lib/auth/session'
import CompanyEditView, { type AgencyFormData, type EditMessage } from '../../../auth-v3/CompanyEditView'
import { useHydrated } from '../../../auth-v3/useHydrated'
import '../../../auth-v3/auth-v3.css'

export default function EditAgencyProfilePage({
  params,
}: {
  params: { agencyId: string }
}) {
  const hydrated = useHydrated()
  const [role, setRole] = useState<AuthRole | null>(null)
  const [authorized, setAuthorized] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<EditMessage>(null)

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
    const applySession = (session: SessionContext) => {
      setRole(session.role)
      setAuthorized(session.role === 'Tour_Agency' && session.agencyId === params.agencyId)
    }
    readSessionContext().then(applySession).finally(() => setSessionReady(true))

    const onRoleChanged = () => {
      readSessionContext().then(applySession).catch(() => {
        setRole(null)
        setAuthorized(false)
      })
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
    return <main className="av3-page"><p>Đang tải hồ sơ công ty…</p></main>
  }

  // HARD PERMISSION GUARD: Local Provider (or any non-Agency role) is strictly FORBIDDEN
  if (mounted && !authorized) {
    return (
      <main className="av3-center">
        <section className="av3-card av3-card--narrow av3-center-text">
          <h1 className="av3-h1 av3-h1--card">Không có quyền chỉnh sửa hồ sơ này</h1>
          <p className="av3-lead">Tài khoản {role === 'Local_Provider' ? 'xưởng nghề' : role || 'khách'} không có quyền mở màn hình chỉnh sửa hồ sơ công ty lữ hành. Chỉ chủ tài khoản của công ty mới sửa được hồ sơ này.</p>
          <Link href="/" className="av3-btn av3-btn--secondary">Về không gian làm việc</Link>
          <Link href={`/login?next=/agency/${params.agencyId}/edit`} className="av3-btn av3-btn--primary">Đăng nhập</Link>
        </section>
      </main>
    )
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
          text: '✓ Thay đổi trường trọng yếu (Tên doanh nghiệp / MST) đã gửi yêu cầu thẩm định lại đến Hội đồng Thẩm định (HDT). Tài khoản vẫn duy trì hoạt động.',
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

  return <CompanyEditView form={formData} setForm={setFormData} saving={saving} hydrated={hydrated} message={message} onSubmit={handleSubmit} agencyId={params.agencyId} />
}
