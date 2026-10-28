'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { refreshDemoSession, type CurrentUserRole } from '@/lib/prf/client-session'

interface VillageResult {
  village: { village_id: string; source_code: string; name: string; district: string; city_province: string; is_active: boolean }
  providers: Array<{ provider_id: string; business_name: string; craft_type: string; description: string; location_address: string; experience_count: number }>
}

export default function VillageProfilePage({ params }: { params: { villageId: string } }) {
  const [role, setRole] = useState<CurrentUserRole>('Guest')
  const [result, setResult] = useState<VillageResult | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    refreshDemoSession().then(session => { if (alive) setRole(session.role) }).catch(() => {})
    fetch(`/api/demo/villages/${params.villageId}`, { cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Không tìm thấy làng nghề')))
      .then(data => { if (alive) setResult(data) })
      .catch(reason => { if (alive) setError(reason.message) })
    return () => { alive = false }
  }, [params.villageId])

  if (error) return <main className="prf-container" style={{ padding: '3rem' }}><h1>{error}</h1><Link href="/explore">← Quay lại Explore</Link></main>
  if (!result) return <main className="prf-container" style={{ padding: '3rem' }}>Đang tải hồ sơ làng nghề…</main>

  const { village, providers } = result
  return (
    <main className="prf-container" style={{ paddingBottom: '5rem' }}>
      <div className="prf-spec-header">
        <div>
          <span className="prf-spec-code">VIL030 · VILLAGE PROFILE · {village.source_code}</span>
          <h1 className="prf-spec-title">Làng nghề {village.name}</h1>
          <p className="prf-spec-subtitle">{village.district}, {village.city_province} · {village.is_active ? 'Đang hoạt động' : 'Tạm ngưng'}</p>
        </div>
        <Link href="/explore" className="prf-btn prf-btn-outline">← Khám phá</Link>
      </div>

      <section className="prf-section-card" style={{ marginTop: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <span className="prf-badge prf-badge-verified">DANH MỤC LÀNG NGHỀ ĐÃ XÁC MINH</span>
            <h2 style={{ margin: '0.75rem 0 0.4rem' }}>{village.name}</h2>
            <p style={{ margin: 0, color: '#64748b' }}>Dữ liệu danh mục do hệ thống quản lý; hồ sơ chỉ hiển thị Provider đã được xác minh.</p>
          </div>
          <div style={{ minWidth: 180, padding: '1rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <strong>{providers.length}</strong> Provider đã xác minh<br />
            <small>Ngữ cảnh hiện tại: {role}</small>
          </div>
        </div>
      </section>

      <section style={{ marginTop: '2rem' }}>
        <h2>Provider tại {village.name}</h2>
        {providers.length === 0 ? <p>Chưa có Provider đã xác minh trong làng nghề này.</p> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            {providers.map(provider => (
              <article key={provider.provider_id} className="prf-section-card">
                <span className="prf-badge prf-badge-verified">VERIFIED PROVIDER</span>
                <h3>{provider.business_name}</h3>
                <p style={{ color: '#64748b' }}>{provider.craft_type} · {provider.experience_count} trải nghiệm</p>
                <p>{provider.description || 'Provider chưa cập nhật giới thiệu.'}</p>
                {provider.location_address && <p style={{ fontSize: '0.8rem' }}>📍 {provider.location_address}</p>}
                <Link href={`/explore/providers/${provider.provider_id}`} className="prf-btn prf-btn-primary">Xem hồ sơ công khai →</Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
