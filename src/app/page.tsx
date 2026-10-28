'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { getCurrentRole, setCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'

export default function HomePage() {
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')

  const providerId = DEMO_IDENTITIES.provider.providerId!
  const agencyId = DEMO_IDENTITIES.agency.agencyId!
  const villageId = DEMO_IDENTITIES.provider.villageId!

  useEffect(() => {
    setRole(getCurrentRole())
    const onRoleChanged = () => {
      setRole(getCurrentRole())
    }
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  return (
    <div className="prf-container" style={{ paddingBottom: '6rem' }}>
      {/* Platform Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #111827 0%, #1e293b 100%)',
          borderBottom: '3px solid #b84c24',
          borderRadius: '4px',
          padding: '2.5rem',
          color: '#ffffff',
          marginBottom: '2.5rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <span className="prf-badge prf-badge-verified">HANOI ARTISAN BRIDGE · TEAM G</span>
          <span className="prf-badge" style={{ background: '#334155', color: '#f8fafc' }}>
            SESSION 7 REVIEW READY
          </span>
        </div>
        <h1 style={{ fontSize: '2.2rem', fontFamily: 'serif', margin: '0 0 0.75rem 0', fontWeight: 800 }}>
          Hanoi Artisan Bridge — Nền tảng Kết nối Làng nghề Hà Nội
        </h1>
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#cbd5e1', maxWidth: '850px', lineHeight: 1.6 }}>
          Hệ sinh thái B2B số hóa kết nối các Nghệ nhân & Xưởng thủ công truyền thống tại các làng nghề Thăng Long - Hà Nội với các Công ty Lữ hành quốc tế (Tour Agency), dưới sự bảo trợ di sản của UBND địa phương.
        </p>
      </div>

      {/* Two Clear Flows Showcase */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
        {/* FLOW 1: LOCAL PROVIDER */}
        <div
          className="prf-section-card"
          style={{
            border: '2px solid #b84c24',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span className="prf-badge" style={{ background: '#ffedd5', color: '#9a3412', fontWeight: 800 }}>
                LUỒNG 1: LOCAL PROVIDER
              </span>
              <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Chủ xưởng thủ công</span>
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#111827' }}>
              🏺 Xưởng Thủ công Bát Tràng
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
              Dành cho các nghệ nhân và chủ cơ sở sản xuất tại làng nghề quản lý định danh xưởng, giới thiệu hạ tầng đón tiếp, kiểm tra chứng nhận làng nghề và kết nối đối tác lữ hành B2B.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
              <Link
                href={`/provider/${providerId}`}
                className="prf-btn prf-btn-primary"
                style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>🏺 Xem Hồ sơ Xưởng của mình (PRF127)</span>
                <span>→</span>
              </Link>

              <Link
                href={`/provider/${providerId}/edit`}
                className="prf-btn prf-btn-outline"
                style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>✏️ Chỉnh sửa Hồ sơ Xưởng (PRF128)</span>
                <span>→</span>
              </Link>

              <Link
                href={`/village/${villageId}`}
                className="prf-btn prf-btn-outline"
                style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>🏛️ Xem Hồ sơ Làng nghề Bát Tràng (VIL030)</span>
                <span>→</span>
              </Link>

              <Link
                href="/messages"
                className="prf-btn prf-btn-outline"
                style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>💬 Chat B2B với Agency (Click xem Profile đối tác)</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Tài khoản đại diện: {DEMO_IDENTITIES.provider.displayName}</span>
            <button
              onClick={() => {
                setCurrentRole('LocalProvider')
                setRole('LocalProvider')
              }}
              className="prf-btn prf-btn-outline"
              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            >
              Chọn vai trò này
            </button>
          </div>
        </div>

        {/* FLOW 2: TOUR AGENCY */}
        <div
          className="prf-section-card"
          style={{
            border: '2px solid #1e3a5f',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: '#ffffff',
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span className="prf-badge" style={{ background: '#e0f2fe', color: '#0369a1', fontWeight: 800 }}>
                LUỒNG 2: TOUR AGENCY
              </span>
              <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Đơn vị lữ hành quốc tế</span>
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: '#111827' }}>
              🏢 Công ty Lữ hành (Agency)
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#4b5563', lineHeight: 1.6, margin: '0 0 1.25rem 0' }}>
              Dành cho các công ty du lịch tra cứu mạng lưới làng nghề truyền thống thông qua trang Explore, truy cập hồ sơ chi tiết của Làng & Xưởng, quản lý pháp nhân công ty và trao đổi trực tiếp với nghệ nhân.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
              <Link
                href="/explore"
                className="prf-btn prf-btn-primary"
                style={{ background: '#1e3a5f', borderColor: '#1e3a5f', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>🔍 TRANG KHÁM PHÁ CHUNG (EXPLORE - EXP017)</span>
                <span>→</span>
              </Link>

              <Link
                href={`/agency/${agencyId}`}
                className="prf-btn prf-btn-outline"
                style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>🏢 Xem Hồ sơ Agency của mình (PRF019)</span>
                <span>→</span>
              </Link>

              <Link
                href={`/agency/${agencyId}/edit`}
                className="prf-btn prf-btn-outline"
                style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>✏️ Chỉnh sửa Hồ sơ Agency (PRF021 - BR-017)</span>
                <span>→</span>
              </Link>

              <Link
                href={`/village/${villageId}`}
                className="prf-btn prf-btn-outline"
                style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>🏛️ Tra cứu Hồ sơ Làng nghề (VIL030)</span>
                <span>→</span>
              </Link>

              <Link
                href="/messages"
                className="prf-btn prf-btn-outline"
                style={{ textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>💬 Chat B2B với Xưởng (Click xem Profile Xưởng)</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Tài khoản đại diện: {DEMO_IDENTITIES.agency.displayName}</span>
            <button
              onClick={() => {
                setCurrentRole('TourAgency')
                setRole('TourAgency')
              }}
              className="prf-btn prf-btn-outline"
              style={{ fontSize: '0.72rem', padding: '2px 8px' }}
            >
              Chọn vai trò này
            </button>
          </div>
        </div>
      </div>

      {/* Admin Flow Showcase */}
      <div
        className="prf-section-card"
        style={{
          border: '1px solid #cbd5e1',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span className="prf-badge" style={{ background: '#475569', color: '#ffffff' }}>
              LUỒNG 3: UBND ADMIN
            </span>
          </div>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#334155', maxWidth: '750px' }}>
            Xem hồ sơ di sản làng nghề truyền thống địa phương (chỉ xem profile di sản, không có màn quản lý).
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Link
            href={`/village/${villageId}`}
            className="prf-btn prf-btn-outline"
            style={{ fontSize: '0.8rem' }}
          >
            🏛️ Xem Hồ sơ Làng nghề (VIL030)
          </Link>
        </div>
      </div>
    </div>
  )
}
