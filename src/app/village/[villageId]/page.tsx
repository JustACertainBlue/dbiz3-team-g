'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { getCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'

interface VillageInfo {
  village_id: string
  name: string
  district: string
  city_province: string
  source_code: string
  established_year?: string
  total_ateliers?: number
  distance_from_center?: string
  description?: string
}

export default function VillageProfilePage({
  params,
}: {
  params: { villageId: string }
}) {
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')

  // Bát Tràng verified provider ID
  const provider1Id = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'

  const village: VillageInfo = {
    village_id: params.villageId,
    name: 'Làng gốm sứ Bát Tràng',
    district: 'Gia Lâm',
    city_province: 'Hà Nội',
    source_code: 'DEMO-HN-BATTRANG',
    established_year: 'Thế kỷ XIV (~700+ năm di sản)',
    total_ateliers: 45,
    distance_from_center: '14 km về phía Đông Nam trung tâm Hà Nội',
    description:
      'Làng gốm Bát Tràng nằm ven tả ngạn sông Hồng, là trung tâm sản xuất gốm sứ thủ công cổ truyền trứ danh bậc nhất của kinh thành Thăng Long xưa và Hà Nội ngày nay. Nơi đây lưu giữ tinh hoa kỹ thuật tạo hình vuốt tay, nghệ thuật tráng men tro trấu độc bản và các dòng gốm men lam, men ngọc, men rạn danh tiếng.',
  }

  useEffect(() => {
    setRole(getCurrentRole())
    const onRoleChanged = () => {
      setRole(getCurrentRole())
    }
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  const isAgency = role === 'TourAgency'

  return (
    <div className="prf-container" style={{ paddingBottom: '5rem' }}>
      {/* Spec Breadcrumb & Navigation */}
      <div className="prf-spec-header">
        <div>
          <span className="prf-spec-code">MÃ MÀN HÌNH: VIL030 · VILLAGE PROFILE</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <Link href="/explore" style={{ color: '#b84c24', fontWeight: 700, textDecoration: 'none', fontSize: '0.75rem' }}>
              KHÁM PHÁ (EXPLORE)
            </Link>
            <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>/</span>
            <span style={{ color: '#6b7280', fontSize: '0.75rem', fontWeight: 600 }}>LÀNG NGHỀ THỦ CÔNG HÀ NỘI</span>
            <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>/</span>
            <span style={{ color: '#111827', fontSize: '0.75rem', fontWeight: 800 }}>{village.name.toUpperCase()}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link href="/explore" className="prf-btn prf-btn-outline" style={{ fontSize: '0.8rem' }}>
            ← Danh mục Khám phá
          </Link>
          {isAgency && (
            <Link href="/messages" className="prf-btn prf-btn-primary" style={{ background: '#1e3a5f', fontSize: '0.8rem' }}>
              💬 Liên hệ Xưởng tại Làng
            </Link>
          )}
        </div>
      </div>

      {/* Hero Section & Village Presentation */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
          marginBottom: '2rem',
        }}
      >
        <div
          style={{
            height: '240px',
            background: 'linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.65)), url("https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=1600&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
            padding: '2rem',
            color: '#ffffff',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <span className="prf-badge prf-badge-verified">DI SẢN VĂN HÓA QUỐC GIA</span>
            <span className="prf-badge" style={{ background: 'rgba(255,255,255,0.2)', color: '#ffffff' }}>
              MÃ ĐỊA BÀN: {village.source_code}
            </span>
          </div>
          <h1 style={{ fontSize: '2.25rem', fontFamily: 'serif', fontWeight: 800, margin: '0 0 0.5rem 0' }}>
            {village.name}
          </h1>
          <p style={{ margin: 0, fontSize: '0.95rem', opacity: 0.9, maxWidth: '850px' }}>
            Địa bàn: {village.district}, {village.city_province} · {village.established_year}
          </p>
        </div>

        {/* 4-Stat Heritage Metric Strip */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            background: '#fafaf9',
            borderTop: '1px solid #e5e7eb',
            borderBottom: '1px solid #e5e7eb',
          }}
        >
          <div style={{ padding: '1rem 1.5rem', borderRight: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
              Niên đại di sản
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#b84c24', marginTop: '0.2rem' }}>
              700+ Năm
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Khởi lập từ thời Lý - Trần</div>
          </div>

          <div style={{ padding: '1rem 1.5rem', borderRight: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
              Xưởng thủ công hoạt động
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginTop: '0.2rem' }}>
              45+ Xưởng
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Trong đó 12 xưởng chuẩn B2B</div>
          </div>

          <div style={{ padding: '1rem 1.5rem', borderRight: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
              Khoảng cách từ trung tâm
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginTop: '0.2rem' }}>
              14 KM
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Đường đê Bát Tràng xe 45 chỗ</div>
          </div>

          <div style={{ padding: '1rem 1.5rem' }}>
            <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>
              Chỉ số bảo tồn di sản
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#059669', marginTop: '0.2rem' }}>
              98.4%
            </div>
            <div style={{ fontSize: '0.72rem', color: '#9ca3af' }}>Thẩm định bởi UBND & HDT</div>
          </div>
        </div>

        {/* Narrative & Craft Lineage */}
        <div style={{ padding: '1.75rem 2rem' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.75rem' }}>
            [01] Tinh hoa Gốm sứ & Dòng chảy lịch sử
          </h2>
          <p style={{ color: '#374151', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            {village.description}
          </p>
        </div>
      </div>

      {/* [02] Registered Village Providers / Ateliers */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0 }}>
              [02] Danh mục Xưởng thủ công & Nghệ nhân thuộc Làng (Ateliers)
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#6b7280', margin: '0.2rem 0 0 0' }}>
              Các cơ sở thủ công đã được kiểm tra thực địa, cấp chứng chỉ định danh và đủ năng lực phục vụ đối tác B2B
            </p>
          </div>
          <span className="prf-badge prf-badge-verified">3 XƯỞNG ĐÃ THẨM ĐỊNH MẪU</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.25rem' }}>
          {/* Provider Card 1: Xưởng Gốm Hưng Thịnh (Provider 1 Verified) */}
          <div
            className="prf-section-card"
            style={{
              padding: '1.25rem',
              border: '2px solid #b84c24',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span className="prf-badge prf-badge-verified">UBND VERIFIED · HẠNG A</span>
                <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>Thế hệ thứ 5</span>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#111827' }}>
                Xưởng Gốm Thủ Công Hưng Thịnh
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.5, margin: '0 0 0.75rem 0' }}>
                Nghệ nhân chủ nhiệm: <strong>Nguyễn Văn Thịnh</strong>. Chuyên chế tác gốm vuốt tay mỹ nghệ, men rạn truyền thống và phục chế gốm thời Lê - Nguyễn.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span className="prf-badge" style={{ background: '#f3f4f6', color: '#374151' }}>
                  👥 Sức chứa: 80 khách/lượt
                </span>
                <span className="prf-badge" style={{ background: '#f3f4f6', color: '#374151' }}>
                  🏺 35 Bàn xoay thực hành
                </span>
                <span className="prf-badge" style={{ background: '#f3f4f6', color: '#374151' }}>
                  🚌 Bãi đỗ xe 45 chỗ
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' }}>
              <Link
                href={`/provider/${provider1Id}`}
                className="prf-btn prf-btn-primary"
                style={{ flex: 1, textAlign: 'center', fontSize: '0.78rem' }}
              >
                Xem Hồ sơ Xưởng (PRF127)
              </Link>
              <Link
                href="/messages"
                className="prf-btn prf-btn-outline"
                style={{ fontSize: '0.78rem' }}
              >
                💬 Chat B2B
              </Link>
            </div>
          </div>

          {/* Provider Card 2: Xưởng Men Lam Cổ */}
          <div
            className="prf-section-card"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span className="prf-badge prf-badge-verified">UBND VERIFIED</span>
                <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>Thế hệ thứ 4</span>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#111827' }}>
                Xưởng Gốm Men Lam Cổ Bát Tràng
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.5, margin: '0 0 0.75rem 0' }}>
                Nghệ nhân ưu tú: <strong>Phạm Văn Nam</strong>. Giữ gìn kỹ thuật vẽ lam dưới men theo lối cung đình và kỹ nghệ nung củi truyền thống.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span className="prf-badge" style={{ background: '#f3f4f6', color: '#374151' }}>
                  👥 Sức chứa: 45 khách/lượt
                </span>
                <span className="prf-badge" style={{ background: '#f3f4f6', color: '#374151' }}>
                  🎨 Lớp vẽ lam chuyên sâu
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' }}>
              <Link
                href={`/provider/${provider1Id}`}
                className="prf-btn prf-btn-outline"
                style={{ flex: 1, textAlign: 'center', fontSize: '0.78rem' }}
              >
                Xem Hồ sơ Xưởng
              </Link>
              <Link
                href="/messages"
                className="prf-btn prf-btn-outline"
                style={{ fontSize: '0.78rem' }}
              >
                💬 Chat B2B
              </Link>
            </div>
          </div>

          {/* Provider Card 3: HTX Gốm Sứ Bát Tràng */}
          <div
            className="prf-section-card"
            style={{
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <span className="prf-badge prf-badge-verified">UBND VERIFIED</span>
                <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>Tổ chức tập thể</span>
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#111827' }}>
                Hợp Tác Xã Gốm Bát Tràng Cổ Truyền
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.5, margin: '0 0 0.75rem 0' }}>
                Liên kết 15 hộ gia đình sản xuất gốm gia dụng cao cấp, gốm quà tặng ngoại giao và vật phẩm xuất khẩu đạt chuẩn OCOP 5 sao.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                <span className="prf-badge" style={{ background: '#f3f4f6', color: '#374151' }}>
                  👥 Sức chứa: 120 khách
                </span>
                <span className="prf-badge" style={{ background: '#f3f4f6', color: '#374151' }}>
                  🏆 OCOP 5 SAO
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' }}>
              <Link
                href={`/provider/${provider1Id}`}
                className="prf-btn prf-btn-outline"
                style={{ flex: 1, textAlign: 'center', fontSize: '0.78rem' }}
              >
                Xem Hồ sơ Xưởng
              </Link>
              <Link
                href="/messages"
                className="prf-btn prf-btn-outline"
                style={{ fontSize: '0.78rem' }}
              >
                💬 Chat B2B
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* [03] Village Governance & Heritage Codex */}
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '4px',
          padding: '1.5rem 2rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.5rem 0', color: '#1e293b' }}>
          [03] Quy ước Bảo tồn Di sản & Hạ tầng Làng nghề Địa phương
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1rem', fontSize: '0.82rem', color: '#334155', lineHeight: 1.6 }}>
          <div>
            <h4 style={{ margin: '0 0 0.35rem 0', color: '#0f172a', fontWeight: 700 }}>⚖️ Quy chuẩn Thẩm định Nguyên liệu</h4>
            <p style={{ margin: 0 }}>
              100% các xưởng đạt chứng nhận cam kết sử dụng nguồn đất sét trắng chịu lửa Trúc Thôn đã qua tuyển lọc tạp chất. Nghiêm cấm sử dụng phụ gia hóa chất độc hại trong men gốm gia dụng.
            </p>
          </div>
          <div>
            <h4 style={{ margin: '0 0 0.35rem 0', color: '#0f172a', fontWeight: 700 }}>🚌 Hạ tầng Đón tiếp Đoàn B2B</h4>
            <p style={{ margin: 0 }}>
              Làng nghề quy hoạch bãi đỗ xe trung tâm tại Chợ gốm và bến xe buýt Bát Tràng (sức chứa 15 xe 45 chỗ đồng thời). Hệ thống xe điện chuyên dụng kết nối khách từ bãi đỗ vào tận từng ngõ xưởng nghệ nhân.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
