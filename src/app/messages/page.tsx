'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCurrentRole, setCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'

export default function MessagesChatPage() {
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [messageText, setMessageText] = useState('')

  const providerId = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374' // Xưởng Hưng Thịnh
  const agencyId = '5fecc699-71e4-5bf0-ac1b-2090e05c2cd9'   // Indochina Heritage Voyages

  useEffect(() => {
    setRole(getCurrentRole())
    const onRoleChanged = () => {
      setRole(getCurrentRole())
    }
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  const isAgencyView = role === 'TourAgency'

  const handleRoleToggle = (newRole: CurrentUserRole) => {
    setCurrentRole(newRole)
    setRole(newRole)
  }

  return (
    <div className="spec-portal">
      {/* Top Portal Header */}
      <header className="spec-header">
        <div>
          <div className="spec-brand-title">HANOI ARTISAN BRIDGE</div>
          <div className="spec-brand-sub">
            {isAgencyView
              ? 'TOUR AGENCY PORTAL · B2B MESSAGING WITH CRAFT ATELIERS (COM048)'
              : 'LOCAL PROVIDER PORTAL · B2B MESSAGING WITH TOUR OPERATORS (COM065)'}
          </div>
        </div>

        <nav className="spec-nav">
          {isAgencyView ? (
            <>
              <Link href="/explore">Khám phá (Explore)</Link>
              <Link href={`/agency/${agencyId}`}>Hồ sơ Agency</Link>
              <Link href={`/agency/${agencyId}/edit`}>Sửa Agency</Link>
              <Link href="/messages" className="active" style={{ color: '#1e3a5f', fontWeight: 800 }}>
                Hộp thư B2B ●
              </Link>
            </>
          ) : (
            <>
              <Link href={`/provider/${providerId}`}>Hồ sơ Xưởng</Link>
              <Link href={`/provider/${providerId}/edit`}>Sửa Xưởng</Link>
              <Link href="/messages" className="active" style={{ color: '#b84c24', fontWeight: 800 }}>
                Hộp thư B2B ●
              </Link>
            </>
          )}
        </nav>

        {/* User Identity Box */}
        <div className="spec-user-profile">
          <div
            className="spec-avatar"
            style={{
              background: isAgencyView ? '#1e3a5f' : '#b84c24',
              color: '#ffffff',
            }}
          >
            {isAgencyView ? 'IH' : 'HT'}
          </div>
          <div style={{ textAlign: 'left', fontSize: '0.75rem', lineHeight: 1.2 }}>
            <div style={{ fontWeight: 800 }}>
              {isAgencyView ? 'Indochina Heritage' : 'Xưởng Gốm Hưng Thịnh'}
            </div>
            <div style={{ color: '#6b7280' }}>
              {isAgencyView ? 'Tour Operator Lead' : 'Chủ nhiệm Xưởng (Bát Tràng)'}
            </div>
          </div>
        </div>
      </header>

      {/* Subheader bar with Quick View-Mode Switcher */}
      <div className="spec-subheader" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          B2B COMMUNICATIONS / ACTIVE THREAD · ĐANG XEM DƯỚI GÓC NHÌN:{' '}
          <strong style={{ color: isAgencyView ? '#38bdf8' : '#f97316' }}>
            {isAgencyView ? 'TOUR AGENCY (CÔNG TY LỮ HÀNH)' : 'LOCAL PROVIDER (XƯỞNG THỦ CÔNG)'}
          </strong>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>Đổi góc nhìn chat:</span>
          <button
            type="button"
            onClick={() => handleRoleToggle('LocalProvider')}
            style={{
              background: !isAgencyView ? '#b84c24' : '#1f2937',
              color: '#ffffff',
              border: 'none',
              padding: '2px 8px',
              borderRadius: '2px',
              fontSize: '0.7rem',
              cursor: 'pointer',
              fontWeight: !isAgencyView ? 800 : 500,
            }}
          >
            🏺 Góc nhìn Xưởng
          </button>
          <button
            type="button"
            onClick={() => handleRoleToggle('TourAgency')}
            style={{
              background: isAgencyView ? '#1e3a5f' : '#1f2937',
              color: '#ffffff',
              border: 'none',
              padding: '2px 8px',
              borderRadius: '2px',
              fontSize: '0.7rem',
              cursor: 'pointer',
              fontWeight: isAgencyView ? 800 : 500,
            }}
          >
            🏢 Góc nhìn Agency
          </button>
        </div>
      </div>

      <div className="spec-content-wrap">
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', background: '#ffffff', border: '1px solid #e5e7eb', minHeight: '620px' }}>
          {/* Conversation List Sidebar */}
          <div style={{ borderRight: '1px solid #e5e7eb', padding: '1rem', background: '#fafaf9' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: '#6b7280', marginBottom: '0.75rem' }}>
              Danh sách Hội thoại B2B (1)
            </div>

            <div
              style={{
                background: '#ffffff',
                border: isAgencyView ? '2px solid #1e3a5f' : '2px solid #b84c24',
                padding: '0.85rem',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.85rem', color: '#111827' }}>
                  {isAgencyView ? 'Xưởng Gốm Hưng Thịnh' : 'Indochina Heritage Voyages'}
                </span>
                <span style={{ fontSize: '0.68rem', color: '#6b7280' }}>10:30 AM</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                {isAgencyView
                  ? 'Nghệ nhân Thịnh: Xưởng sẵn sàng tiếp đón đoàn 15 khách Pháp...'
                  : 'Agency Vance: Kính chào Nghệ nhân, chúng tôi muốn đặt lịch khảo sát...'}
              </div>
              <span
                style={{
                  fontSize: '0.65rem',
                  background: isAgencyView ? '#e0f2fe' : '#ffedd5',
                  color: isAgencyView ? '#0369a1' : '#9a3412',
                  padding: '2px 6px',
                  fontWeight: 700,
                  borderRadius: '2px',
                }}
              >
                {isAgencyView ? 'UBND ACCREDITED ATELIER' : 'VERIFIED TOUR OPERATOR'}
              </span>
            </div>
          </div>

          {/* Active Chat Conversation View */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* Header of Active Chat with Direct Partner Profile Link */}
            <div
              style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #e5e7eb',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '1rem',
                background: '#ffffff',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>
                    {isAgencyView
                      ? 'Xưởng Gốm Thủ Công Hưng Thịnh (Bát Tràng)'
                      : 'Indochina Heritage Voyages Co., Ltd.'}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      background: isAgencyView ? '#ecfdf5' : '#e0e7ff',
                      color: isAgencyView ? '#059669' : '#3730a3',
                      padding: '2px 8px',
                      fontWeight: 800,
                      borderRadius: '2px',
                    }}
                  >
                    {isAgencyView ? 'XƯỞNG THỦ CÔNG ĐÃ THẨM ĐỊNH' : 'ĐỐI TÁC LỮ HÀNH ĐÃ DUYỆT'}
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6b7280', marginTop: '0.2rem' }}>
                  {isAgencyView
                    ? 'Chủ nhiệm xưởng: Nghệ nhân Nguyễn Văn Thịnh · Làng gốm Bát Tràng'
                    : 'Đại diện lữ hành: Dr. Eleanor Vance · Lead Tour Director (Hà Nội)'}
                </div>
              </div>

              {/* MUTUAL LINK TO VIEW THE CORRESPONDING PARTNER'S PROFILE */}
              <div>
                {isAgencyView ? (
                  /* Agency clicks to view Local Provider profile */
                  <Link
                    href={`/provider/${providerId}`}
                    className="prf-btn prf-btn-primary"
                    style={{
                      background: '#b84c24',
                      borderColor: '#b84c24',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      textDecoration: 'none',
                    }}
                  >
                    🏺 XEM HỒ SƠ XƯỞNG NGHỀ (LOCAL PROVIDER) ↗
                  </Link>
                ) : (
                  /* Local Provider clicks to view Tour Agency profile */
                  <Link
                    href={`/agency/${agencyId}`}
                    className="prf-btn prf-btn-primary"
                    style={{
                      background: '#1e3a5f',
                      borderColor: '#1e3a5f',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      textDecoration: 'none',
                    }}
                  >
                    🏢 XEM HỒ SƠ CÔNG TY LỮ HÀNH (TOUR AGENCY) ↗
                  </Link>
                )}
              </div>
            </div>

            {/* Chat Messages Log */}
            <div style={{ flex: 1, padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', background: '#fafaf9' }}>
              {/* Message from Agency */}
              <div
                style={{
                  alignSelf: isAgencyView ? 'flex-end' : 'flex-start',
                  maxWidth: '75%',
                  background: isAgencyView ? '#1e3a5f' : '#ffffff',
                  color: isAgencyView ? '#ffffff' : '#111827',
                  border: isAgencyView ? 'none' : '1px solid #e5e7eb',
                  padding: '1rem 1.25rem',
                  borderRadius: '4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isAgencyView ? '#93c5fd' : '#1e3a5f', marginBottom: '0.35rem' }}>
                  Indochina Heritage Voyages (Dr. Eleanor Vance)
                </div>
                <div style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
                  Kính chào Nghệ nhân Hưng Thịnh. Chúng tôi đang lên kế hoạch cho đoàn 15 chuyên gia khảo cổ & di sản từ Pháp sang tham quan Bát Tràng vào tháng 11 tới. Chúng tôi muốn tìm hiểu kỹ về kỹ thuật nung củi men lam cổ và không gian bàn xoay để các chuyên gia trực tiếp trải nghiệm.
                </div>
              </div>

              {/* Message from Provider */}
              <div
                style={{
                  alignSelf: isAgencyView ? 'flex-start' : 'flex-end',
                  maxWidth: '75%',
                  background: isAgencyView ? '#ffffff' : '#111827',
                  color: isAgencyView ? '#111827' : '#ffffff',
                  border: isAgencyView ? '1px solid #e5e7eb' : 'none',
                  padding: '1rem 1.25rem',
                  borderRadius: '4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isAgencyView ? '#b84c24' : '#fdba74', marginBottom: '0.35rem' }}>
                  Nghệ nhân Nguyễn Văn Thịnh (Xưởng Hưng Thịnh Bát Tràng)
                </div>
                <div style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
                  Chào Tiến sĩ Eleanor. Xưởng Hưng Thịnh rất vinh hạnh được đón đoàn. Cơ sở hiện có 35 bàn xoay vuốt tay và lò nung củi truyền thống sẵn sàng vận hành. Bãi đỗ xe trước ngõ xưởng cũng tiếp nhận thuận lợi xe 45 chỗ của công ty.
                </div>
              </div>

              {/* Mutual Context Helper Card */}
              <div
                style={{
                  background: isAgencyView ? '#eff6ff' : '#fffbeb',
                  border: isAgencyView ? '1px solid #bfdbfe' : '1px solid #fde68a',
                  padding: '0.85rem 1.25rem',
                  borderRadius: '4px',
                  fontSize: '0.8rem',
                  color: isAgencyView ? '#1e40af' : '#92400e',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  marginTop: '0.5rem',
                }}
              >
                <span style={{ fontSize: '1.25rem' }}>💡</span>
                <div>
                  {isAgencyView ? (
                    <span>
                      <strong>Gợi ý cho Công ty Lữ hành:</strong> Bạn có thể nhấp vào nút <strong>"XEM HỒ SƠ XƯỞNG NGHỀ"</strong> ở góc trên bên phải để kiểm tra thông số mặt bằng, năng lực tiếp đón và chứng nhận UBND của xưởng Hưng Thịnh.
                    </span>
                  ) : (
                    <span>
                      <strong>Gợi ý cho Chủ xưởng:</strong> Bạn có thể nhấp vào nút <strong>"XEM HỒ SƠ CÔNG TY LỮ HÀNH"</strong> ở góc trên bên phải để kiểm tra thông tin pháp lý, mã số thuế và quy mô đoàn của công ty Indochina Heritage trước khi chốt lịch đón tiếp.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Input Form Bar */}
            <form
              onSubmit={e => {
                e.preventDefault()
                setMessageText('')
              }}
              style={{ padding: '1rem 1.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', gap: '0.75rem', background: '#ffffff' }}
            >
              <input
                type="text"
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
                placeholder={isAgencyView ? 'Nhập tin nhắn gửi xưởng gốm...' : 'Nhập tin nhắn phản hồi công ty lữ hành...'}
                className="prf-input"
                style={{ flex: 1 }}
              />
              <button
                type="submit"
                className="prf-btn prf-btn-primary"
                style={{ background: isAgencyView ? '#1e3a5f' : '#b84c24', borderColor: isAgencyView ? '#1e3a5f' : '#b84c24' }}
              >
                Gửi Tin Nhắn B2B
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
