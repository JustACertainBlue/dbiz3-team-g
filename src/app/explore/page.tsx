'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { getCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'

interface VillageItem {
  id: string
  name: string
  craft: string
  district: string
  lineage: string
  ateliersCount: number
  image: string
  description: string
}

interface AtelierItem {
  id: string
  name: string
  master: string
  craft: string
  villageName: string
  villageId: string
  capacity: number
  verifiedGrade: string
  image: string
  tags: string[]
}

export default function ExplorePage() {
  const [role, setRole] = useState<CurrentUserRole>('TourAgency')
  const [selectedCraft, setSelectedCraft] = useState<string>('ALL')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    setRole(getCurrentRole())
    const onRoleChanged = () => {
      setRole(getCurrentRole())
    }
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  const batTrangVillageId = '20896522-6235-5699-aeaf-f48b8150d895'
  const phuVinhVillageId = 'e482884e-7190-56cf-bc03-4e69614b1fe5'
  const vanPhucVillageId = 'c0d0d95f-d59c-5c35-946a-f397e380dd14'
  const chuongVillageId = '688d408b-9d98-5b66-bfa7-659a67462108'

  const provider1Id = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374' // Bát Tràng verified
  const providerVanPhucId = '70efa801-a908-5e16-8510-fd094fbdc020'
  const providerPhuVinhId = '0858b5e8-89e1-577f-904a-562150c4fe4f'

  const craftVillages: VillageItem[] = [
    {
      id: batTrangVillageId,
      name: 'Làng gốm Bát Tràng',
      craft: 'Gốm sứ',
      district: 'Gia Lâm, Hà Nội',
      lineage: '700+ năm',
      ateliersCount: 45,
      image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80',
      description: 'Cái nôi gốm sứ sông Hồng trứ danh với kỹ nghệ tạo hình vuốt tay, men rạn cổ và lò nung củi truyền thống.',
    },
    {
      id: vanPhucVillageId,
      name: 'Làng lụa Vạn Phúc',
      craft: 'Dệt lụa tơ tằm',
      district: 'Hà Đông, Hà Nội',
      lineage: '1000+ năm',
      ateliersCount: 60,
      image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=800&q=80',
      description: 'Lụa Vạn Phúc (lụa Hà Đông) nức tiếng với vân gấm Vân sa mềm mại, hoa văn cổ truyền thoáng mát mùa hè, ấm áp mùa đông.',
    },
    {
      id: phuVinhVillageId,
      name: 'Làng mây tre đan Phú Vinh',
      craft: 'Mây tre đan',
      district: 'Chương Mỹ, Hà Nội',
      lineage: '400+ năm',
      ateliersCount: 30,
      image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
      description: 'Đỉnh cao nghệ thuật đan mây tre mắt cáo, mành tơ và đồ gia dụng thủ công tinh xảo xuất khẩu sang hơn 50 quốc gia.',
    },
    {
      id: chuongVillageId,
      name: 'Làng nón Chuông',
      craft: 'Làm nón lá',
      district: 'Thanh Oai, Hà Nội',
      lineage: '300+ năm',
      ateliersCount: 25,
      image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=800&q=80',
      description: 'Trung tâm làm nón lá truyền thống Thăng Long với nón quai thao, nón bài thơ tỉ mỉ từng đường kim sợi cước.',
    },
  ]

  const verifiedAteliers: AtelierItem[] = [
    {
      id: provider1Id,
      name: 'Xưởng Gốm Thủ Công Hưng Thịnh',
      master: 'Nghệ nhân Nguyễn Văn Thịnh',
      craft: 'Gốm sứ',
      villageName: 'Làng gốm Bát Tràng',
      villageId: batTrangVillageId,
      capacity: 80,
      verifiedGrade: 'UBND HẠNG A',
      image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=600&q=80',
      tags: ['Bàn xoay vuốt tay', 'Xe 45 chỗ', 'Hóa đơn VAT'],
    },
    {
      id: providerVanPhucId,
      name: 'Xưởng Dệt Gấm Lụa Triệu Văn Mão',
      master: 'Nghệ nhân Triệu Văn Mão',
      craft: 'Dệt lụa tơ tằm',
      villageName: 'Làng lụa Vạn Phúc',
      villageId: vanPhucVillageId,
      capacity: 50,
      verifiedGrade: 'UBND HẠNG A',
      image: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?auto=format&fit=crop&w=600&q=80',
      tags: ['Khung cửi cổ', 'Trải nghiệm ươm tơ', 'Phòng trưng bày VIP'],
    },
    {
      id: providerPhuVinhId,
      name: 'Cơ Sở Mây Tre Mỹ Nghệ Phú Vinh Art',
      master: 'Nghệ nhân Nguyễn Văn Trung',
      craft: 'Mây tre đan',
      villageName: 'Làng mây tre đan Phú Vinh',
      villageId: phuVinhVillageId,
      capacity: 40,
      verifiedGrade: 'UBND HẠNG B',
      image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=600&q=80',
      tags: ['Thực hành đan mây', 'Quà tặng lưu niệm'],
    },
  ]

  const filteredVillages = craftVillages.filter(v => {
    const matchesCraft = selectedCraft === 'ALL' || v.craft.includes(selectedCraft)
    const matchesSearch = v.name.toLowerCase().includes(searchTerm.toLowerCase()) || v.district.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCraft && matchesSearch
  })

  const filteredAteliers = verifiedAteliers.filter(a => {
    const matchesCraft = selectedCraft === 'ALL' || a.craft.includes(selectedCraft)
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || a.master.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesCraft && matchesSearch
  })

  return (
    <div className="prf-container" style={{ paddingBottom: '5rem' }}>
      {/* Header & Screen Code */}
      <div className="prf-spec-header">
        <div>
          <span className="prf-spec-code">MÃ MÀN HÌNH: EXP017 · EXPLORE & DISCOVERY PORTAL</span>
          <h1 className="prf-spec-title">Khám phá Làng nghề & Xưởng thủ công Hà Nội</h1>
          <p className="prf-spec-subtitle">
            Cổng tra cứu di sản truyền thống dành cho các Đơn vị Lữ hành (Tour Agency) và Đối tác B2B kết nối trực tiếp với Nghệ nhân
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="prf-badge prf-badge-verified">
            VAI TRÒ HIỆN TẠI: {role.toUpperCase()}
          </span>
          <Link href="/messages" className="prf-btn prf-btn-outline" style={{ fontSize: '0.8rem' }}>
            💬 Tin nhắn B2B
          </Link>
        </div>
      </div>

      {/* Hero Search & Filter Bar */}
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '4px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.25rem' }}>
          <div style={{ flex: '1 1 350px' }}>
            <input
              type="text"
              placeholder="🔍 Tìm tên làng nghề, tên xưởng thủ công hoặc nghệ nhân (Bát Tràng, Vạn Phúc, nghệ nhân Thịnh...)"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="prf-input"
              style={{ fontSize: '0.9rem', padding: '0.65rem 0.85rem' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => {
                setSelectedCraft('ALL')
                setSearchTerm('')
              }}
              className="prf-btn prf-btn-outline"
              style={{ fontSize: '0.8rem' }}
            >
              Đặt lại bộ lọc
            </button>
          </div>
        </div>

        {/* Craft Type Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>
            Ngành nghề:
          </span>
          {[
            { key: 'ALL', label: 'Tất cả làng nghề' },
            { key: 'Gốm sứ', label: '🏺 Gốm sứ' },
            { key: 'Dệt lụa', label: '🧵 Dệt lụa tơ tằm' },
            { key: 'Mây tre', label: '🎋 Mây tre đan' },
            { key: 'Nón lá', label: '👒 Nón lá truyền thống' },
          ].map(chip => (
            <button
              key={chip.key}
              onClick={() => setSelectedCraft(chip.key)}
              style={{
                background: selectedCraft === chip.key ? '#b84c24' : '#f3f4f6',
                color: selectedCraft === chip.key ? '#ffffff' : '#374151',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.78rem',
                cursor: 'pointer',
                fontWeight: selectedCraft === chip.key ? 700 : 500,
                transition: 'all 0.15s ease',
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION 1: Traditional Craft Villages (Lead into VIL030) */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, color: '#111827' }}>
              🏛️ Danh mục Làng nghề Di sản Tiêu biểu (Craft Villages)
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              Nhấp vào làng nghề để xem toàn bộ thông tin quản lý địa bàn, chỉ số di sản và danh bạ xưởng trực thuộc (VIL030)
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>
            {filteredVillages.length} Làng nghề được hiển thị
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {filteredVillages.map(village => (
            <div
              key={village.id}
              className="prf-section-card"
              style={{
                padding: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              <div>
                <div
                  style={{
                    height: '160px',
                    backgroundImage: `linear-gradient(rgba(0,0,0,0.2), rgba(0,0,0,0.6)), url("${village.image}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    color: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span className="prf-badge prf-badge-verified">{village.craft}</span>
                    <span className="prf-badge" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff' }}>
                      {village.lineage}
                    </span>
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.2rem 0' }}>{village.name}</h3>
                    <span style={{ fontSize: '0.75rem', opacity: 0.9 }}>📍 {village.district}</span>
                  </div>
                </div>

                <div style={{ padding: '1rem' }}>
                  <p style={{ fontSize: '0.8rem', color: '#4b5563', lineHeight: 1.5, margin: '0 0 0.75rem 0' }}>
                    {village.description}
                  </p>
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 600 }}>
                    🏺 {village.ateliersCount} xưởng sản xuất đang hoạt động
                  </div>
                </div>
              </div>

              <div style={{ padding: '0.85rem 1rem', borderTop: '1px solid #e5e7eb', background: '#fafaf9' }}>
                <Link
                  href={`/village/${village.id}`}
                  className="prf-btn prf-btn-primary"
                  style={{ width: '100%', textAlign: 'center', fontSize: '0.8rem', padding: '0.45rem' }}
                >
                  Xem Hồ sơ Làng nghề (VIL030) →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 2: Verified Artisan Ateliers (Lead into PRF127) */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', margin: 0, color: '#111827' }}>
              🏺 Xưởng Thủ công & Nghệ nhân đã Thẩm định (Verified Ateliers)
            </h2>
            <p style={{ fontSize: '0.82rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
              Các cơ sở thủ công tiêu biểu đã hoàn tất quy trình thẩm định UBND, sẵn sàng tiếp nhận đoàn tour du lịch B2B (PRF127)
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>
            {filteredAteliers.length} Xưởng thẩm định
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1.5rem' }}>
          {filteredAteliers.map(atelier => (
            <div
              key={atelier.id}
              className="prf-section-card"
              style={{
                padding: '1.25rem',
                border: atelier.id === provider1Id ? '2px solid #b84c24' : '1px solid #d1d5db',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <span className="prf-badge prf-badge-verified">{atelier.verifiedGrade}</span>
                  <Link
                    href={`/village/${atelier.villageId}`}
                    style={{ fontSize: '0.75rem', color: '#b84c24', fontWeight: 700, textDecoration: 'none' }}
                  >
                    📍 {atelier.villageName}
                  </Link>
                </div>

                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: '#111827' }}>
                  {atelier.name}
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#b84c24', fontWeight: 700, marginBottom: '0.5rem' }}>
                  {atelier.master}
                </div>

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  <span className="prf-badge" style={{ background: '#f3f4f6', color: '#374151' }}>
                    👥 Sức chứa: {atelier.capacity} khách
                  </span>
                  {atelier.tags.map(t => (
                    <span key={t} className="prf-badge" style={{ background: '#fef3c7', color: '#92400e' }}>
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid #e5e7eb', paddingTop: '0.75rem' }}>
                <Link
                  href={`/provider/${atelier.id}`}
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
                  💬 Đặt lịch B2B
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
