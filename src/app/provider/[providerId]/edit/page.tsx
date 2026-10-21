'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import RoleNavbar from '@/app/components/RoleNavbar'
import { getCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'
import {
  IconCheck,
  IconLock,
  IconPhoto,
  IconGear,
  IconBuilding,
  IconFlame,
  IconClose,
} from '@/app/components/Icons'

interface GalleryPhoto {
  id: string
  title: string
  url?: string
  isCover?: boolean
}

export default function EditProviderProfilePage({
  params,
}: {
  params: { providerId: string }
}) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [mounted, setMounted] = useState(false)

  // Form states matching PRF128.png exactly
  const [businessName, setBusinessName] = useState('Hung Thinh Artisan Pottery Workshop')
  const [artisanName, setArtisanName] = useState('Nguyen Van Hung')
  const [guildTitle, setGuildTitle] = useState('4th Generation Guild Master')
  const [estYear, setEstYear] = useState('1989')
  const [groupCapacity, setGroupCapacity] = useState('Private Groups ≤ 40 Pax')
  const [specialties, setSpecialties] = useState<string[]>([
    'Hand-wheel Throwing',
    'Wood Dragon Kiln',
    'Alluvial Red River Clay',
  ])
  const [newSpecialty, setNewSpecialty] = useState('')
  const [showAddSpecialty, setShowAddSpecialty] = useState(false)
  const [guildStatus, setGuildStatus] = useState('Founding Member')
  const [dispatchCoordination, setDispatchCoordination] = useState('Direct Master Access')

  // Section 02 states
  const [apparatusTitle, setApparatusTitle] = useState('12 Hand Pottery Wheels')
  const [apparatusDetails, setApparatusDetails] = useState(
    'Foot-pedaled solid wood wheels calibrated for traditional throwing and beginner ergonomics.'
  )
  const [apparatusLoad, setApparatusLoad] = useState('1 Guest / Wheel')

  const [studioName, setStudioName] = useState('200 m² Studio & Gallery')
  const [studioConfig, setStudioConfig] = useState(
    'Covered open-air bisque display hall, raw clay prep tables, and dedicated visitor workshop room.'
  )
  const [studioCapacity, setStudioCapacity] = useState('Up to 45 Pax')

  const [kilnStructure, setKilnStructure] = useState('5-Chamber Dragon Kiln')
  const [kilnNotes, setKilnNotes] = useState(
    'Traditional stepped brick kiln operating up to 1,300°C for unglazed wood-ash natural patina.'
  )
  const [kilnInterval, setKilnInterval] = useState('Monthly Firing Run')

  // Section 03 Gallery
  const initialPhotos: GalleryPhoto[] = [
    { id: '1', title: '01 · Firing Yards', isCover: true },
    { id: '2', title: '02 · Dragon Kiln' },
    { id: '3', title: '03 · Glaze Atelier' },
    { id: '4', title: '04 · Pottery Wheels' },
    { id: '5', title: '05 · Drying Sheds' },
    { id: '6', title: '06 · Tea Pavilion' },
  ]
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>(initialPhotos)

  // Section 04 Experiences Quick Status
  const [experiences, setExperiences] = useState([
    {
      code: 'EXP-01',
      title: 'Traditional Wheel-throwing & Clay Sculpting',
      rate: 'B2B: ₫320,000 / pax',
      listed: true,
      expId: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
    },
    {
      code: 'EXP-02',
      title: 'Wood-kiln Ash Glazing Techniques',
      rate: 'B2B: ₫270,000 / pax',
      listed: true,
      expId: 'c8281688-2dc1-5cb1-9ff6-139df04ba562',
    },
    {
      code: 'EXP-03',
      title: 'Bespoke Imperial Celadon Reproduction',
      rate: 'B2B: Custom Commission',
      listed: true,
      expId: 'bespoke-celadon',
    },
  ])

  // Section 05 Logistics
  const [hotline, setHotline] = useState('+84 90 311 8842')
  const [coordinator, setCoordinator] = useState('Ms. Le Thi Mai (Dispatch in English, French & Vietnamese)')
  const [pierLogistics, setPierLogistics] = useState(
    'Bat Trang Community Pier #3 (Accommodates up to 45-seat tour coaches, designated drop-off 80m from workshop entrance)'
  )
  const [amenities, setAmenities] = useState({
    wheelchair: true,
    teaPavilion: true,
    dryingRoom: true,
    packaging: true,
  })

  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setMounted(true)
    setRole(getCurrentRole())
    const handleRoleChange = () => setRole(getCurrentRole())
    window.addEventListener('hab_role_changed', handleRoleChange)
    return () => window.removeEventListener('hab_role_changed', handleRoleChange)
  }, [])

  if (!mounted) return null

  // Security check: Only LocalProvider can edit
  const isLocalProvider = role === 'LocalProvider'
  if (!isLocalProvider) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <RoleNavbar breadcrumbs={<>HOME / PROVIDER PORTAL / <span style={{ color: '#111827' }}>ACCESS RESTRICTED (BR-001)</span></>} />
        <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', background: '#ffffff', padding: '3rem', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <IconLock size={40} color="#b84c24" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
            Local Provider Permission Required
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Modifications to workshop profile PRF128 require authentic Local Provider credentials under Business Rule BR-001.
          </p>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('hab_set_role', { detail: 'LocalProvider' }))
            }}
            className="spec-btn-black"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem' }}
          >
            Switch to Local Provider
          </button>
        </div>
      </div>
    )
  }

  const handleAddSpecialty = () => {
    if (newSpecialty.trim() && !specialties.includes(newSpecialty.trim())) {
      setSpecialties([...specialties, newSpecialty.trim()])
      setNewSpecialty('')
      setShowAddSpecialty(false)
    }
  }

  const handleRemoveSpecialty = (item: string) => {
    setSpecialties(specialties.filter(s => s !== item))
  }

  const handleRemovePhoto = (id: string) => {
    setGalleryPhotos(galleryPhotos.filter(p => p.id !== id))
    setMessage({ type: 'success', text: 'Photo removed from architectural gallery.' })
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (galleryPhotos.length >= 12) {
      setMessage({ type: 'error', text: 'Gallery limit reached (max 12 photos).' })
      return
    }
    const newP: GalleryPhoto = {
      id: Date.now().toString(),
      title: `0${galleryPhotos.length + 1} · ${file.name.replace(/\.[^/.]+$/, '')}`,
    }
    setGalleryPhotos([...galleryPhotos, newP])
    setMessage({ type: 'success', text: `Photo uploaded: "${file.name}"` })
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/prf/provider/${params.providerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_name: businessName,
          location_address: 'Bat Trang Ceramic Village, Gia Lam District, Hanoi',
          phone_number: hotline,
        }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Changes saved successfully to B2B verified registry!' })
        setTimeout(() => {
          router.push(`/provider/${params.providerId}`)
        }, 1200)
      } else {
        setMessage({ type: 'error', text: 'Failed to update provider profile.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error while saving.' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fbfbfb', minHeight: '100vh', color: '#111827' }}>
      {/* Sub-bar matching PRF128.png */}
      <RoleNavbar
        breadcrumbs={<>HOME / PROVIDER PORTAL / <span style={{ color: '#111827' }}>EDIT WORKSHOP PROFILE</span></>}
        accessLevel="INTERACTIVE EDIT PROFILE"
        providerId={params.providerId}
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem 2rem 6rem' }}>

        {/* Top Header Row matching PRF128.png */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', fontWeight: 800, background: '#f3f4f6', color: '#111827', padding: '3px 8px', borderRadius: '2px', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
              <IconCheck size={12} color="#111827" />
              <span>VERIFIED GUILD HERITAGE PROVIDER</span>
              <span style={{ color: '#6b7280', marginLeft: '0.3rem' }}>VN-HN-BTR-1989-04</span>
            </div>
            <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#111827', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
              Edit Provider Profile
            </h1>
            <p style={{ fontSize: '0.86rem', color: '#6b7280', margin: 0, maxWidth: '780px', lineHeight: 1.5 }}>
              Update your workshop identity, master artisan credentials, facilities, gallery photos, and operational dispatch details. Affiliated village guild status is verified by Hanoi Department of Tourism.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => router.push(`/provider/${params.providerId}`)}
              style={{
                background: '#ffffff', border: '1px solid #d1d5db', color: '#111827',
                padding: '0.55rem 1rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: '2px', cursor: 'pointer',
              }}
            >
              CANCEL / DISCARD
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                background: '#111827', border: 'none', color: '#ffffff',
                padding: '0.55rem 1.15rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '2px', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              <IconCheck size={14} color="#ffffff" />
              <span>{saving ? 'SAVING...' : 'SAVE CHANGES'}</span>
            </button>
          </div>
        </div>

        {message && (
          <div style={{
            padding: '0.85rem 1.25rem', marginBottom: '1.5rem', borderRadius: '3px',
            background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            fontSize: '0.82rem', fontWeight: 700,
          }}>
            {message.text}
          </div>
        )}

        {/* SECTION 01: Core Workshop Identity & Master Artisan matching PRF128.png */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.75rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              01 Core Workshop Identity &amp; Master Artisan
            </h2>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              PUBLIC &amp; B2B VISIBILITY
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2.5rem' }}>
            {/* Left Fields */}
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  WORKSHOP / ENTERPRISE LEGAL NAME
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={e => setBusinessName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    MASTER ARTISAN NAME
                  </label>
                  <input
                    type="text"
                    value={artisanName}
                    onChange={e => setArtisanName(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    GENERATION &amp; GUILD TITLE
                  </label>
                  <input
                    type="text"
                    value={guildTitle}
                    onChange={e => setGuildTitle(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem' }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase' }}>
                    AFFILIATED CRAFT VILLAGE GUILD (HERITAGE REGISTRY)
                  </label>
                  <span style={{ fontSize: '0.68rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <IconLock size={11} color="#6b7280" /> Locked / Certified
                  </span>
                </div>
                <input
                  type="text"
                  disabled
                  value="Bat Trang Ceramic Village, Gia Lam District, Hanoi (Verified Registry: VN-HN-BTR-1989-04)"
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb', background: '#f9fafb', color: '#4b5563', padding: '0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.82rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    ESTABLISHMENT YEAR
                  </label>
                  <input
                    type="text"
                    value={estYear}
                    onChange={e => setEstYear(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    PRIVATE GROUP CAPACITY (B2B)
                  </label>
                  <input
                    type="text"
                    value={groupCapacity}
                    onChange={e => setGroupCapacity(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  CRAFT SPECIALTIES &amp; SEARCH TAGS
                </label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {specialties.map(tag => (
                    <span
                      key={tag}
                      style={{
                        fontSize: '0.75rem', color: '#111827', background: '#f3f4f6', border: '1px solid #e5e7eb',
                        padding: '3px 8px', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px',
                      }}
                    >
                      {tag}
                      <span
                        onClick={() => handleRemoveSpecialty(tag)}
                        style={{ cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }}
                      >
                        <IconClose size={10} color="#9ca3af" />
                      </span>
                    </span>
                  ))}

                  {showAddSpecialty ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Tag..."
                        value={newSpecialty}
                        onChange={e => setNewSpecialty(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddSpecialty()}
                        style={{ border: '1px solid #d1d5db', padding: '2px 6px', fontSize: '0.75rem', borderRadius: '2px', width: '90px' }}
                      />
                      <button
                        type="button"
                        onClick={handleAddSpecialty}
                        style={{ background: '#111827', color: '#ffffff', border: 'none', padding: '2px 6px', fontSize: '0.7rem', borderRadius: '2px', cursor: 'pointer' }}
                      >
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddSpecialty(true)}
                      style={{
                        background: '#ffffff', border: '1px dashed #9ca3af', color: '#4b5563',
                        padding: '3px 8px', borderRadius: '2px', fontSize: '0.72rem', cursor: 'pointer',
                      }}
                    >
                      + Add Specialty
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Archival Photo & Metadata */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase' }}>
                  MASTER ARTISAN ARCHIVAL PHOTO (4:3)
                </label>
                <span style={{ fontSize: '0.68rem', color: '#9ca3af' }}>Min 1200×900px</span>
              </div>

              {/* Archival Photo Box matching PRF128.png */}
              <div style={{
                background: '#f3f4f6', aspectRatio: '4/3', border: '1px solid #e5e7eb', borderRadius: '3px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                textAlign: 'center', padding: '1.5rem', marginBottom: '0.75rem',
              }}>
                <IconPhoto size={42} color="#9ca3af" />
                <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4b5563', marginTop: '0.5rem' }}>
                  MASTER_NGUYEN_VAN_HUNG_WHEEL.JPG
                </div>
                <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                  4:3 • High Resolution Archival Portrait
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginBottom: '1.25rem' }}>
                <button
                  type="button"
                  onClick={() => alert('Replace portrait action')}
                  style={{ background: '#ffffff', border: '1px solid #d1d5db', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '2px', cursor: 'pointer' }}
                >
                  REPLACE
                </button>
                <button
                  type="button"
                  onClick={() => alert('Remove portrait action')}
                  style={{ background: '#ffffff', border: '1px solid #d1d5db', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 700, borderRadius: '2px', cursor: 'pointer' }}
                >
                  REMOVE
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    GUILD STATUS
                  </label>
                  <select
                    value={guildStatus}
                    onChange={e => setGuildStatus(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.55rem', borderRadius: '2px', fontSize: '0.82rem' }}
                  >
                    <option value="Founding Member">Founding Member</option>
                    <option value="Senior Guild Master">Senior Guild Master</option>
                    <option value="Certified Atelier">Certified Atelier</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                    DISPATCH COORDINATION
                  </label>
                  <input
                    type="text"
                    value={dispatchCoordination}
                    onChange={e => setDispatchCoordination(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.55rem', borderRadius: '2px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 02: Workshop Facilities & Capacity Specifications matching PRF128.png */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.75rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              02 Workshop Facilities &amp; Capacity Specifications
            </h2>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              INFRASTRUCTURE METRICS
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
            {/* Box 1: Station Apparatus */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase' }}>
                  STATION APPARATUS
                </span>
                <IconGear size={16} color="#4b5563" />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  EQUIPMENT TITLE
                </label>
                <input
                  type="text"
                  value={apparatusTitle}
                  onChange={e => setApparatusTitle(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  TECHNICAL DETAILS
                </label>
                <textarea
                  rows={3}
                  value={apparatusDetails}
                  onChange={e => setApparatusDetails(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.78rem', background: '#ffffff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  STATION LOAD METRIC
                </label>
                <input
                  type="text"
                  value={apparatusLoad}
                  onChange={e => setApparatusLoad(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                />
              </div>
            </div>

            {/* Box 2: Studio & Gallery Area */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase' }}>
                  STUDIO &amp; GALLERY AREA
                </span>
                <IconBuilding size={16} color="#4b5563" />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  SPACE NAME &amp; AREA
                </label>
                <input
                  type="text"
                  value={studioName}
                  onChange={e => setStudioName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  SPACE CONFIGURATION
                </label>
                <textarea
                  rows={3}
                  value={studioConfig}
                  onChange={e => setStudioConfig(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.78rem', background: '#ffffff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  SEATED CAPACITY
                </label>
                <input
                  type="text"
                  value={studioCapacity}
                  onChange={e => setStudioCapacity(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                />
              </div>
            </div>

            {/* Box 3: Kiln Specification */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', background: '#fafafa' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase' }}>
                  KILN SPECIFICATION
                </span>
                <IconFlame size={16} color="#4b5563" />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  KILN STRUCTURE
                </label>
                <input
                  type="text"
                  value={kilnStructure}
                  onChange={e => setKilnStructure(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                />
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  THERMAL &amp; MATERIAL NOTES
                </label>
                <textarea
                  rows={3}
                  value={kilnNotes}
                  onChange={e => setKilnNotes(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.78rem', background: '#ffffff' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                  FIRING CYCLE INTERVAL
                </label>
                <input
                  type="text"
                  value={kilnInterval}
                  onChange={e => setKilnInterval(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 03: Architectural Grounds & Facility Gallery matching PRF128.png */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.75rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              03 Architectural Grounds &amp; Facility Gallery
            </h2>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              GALLERY ASSET MANAGER ({galleryPhotos.length} OF 12 MAX)
            </span>
          </div>

          {/* Upload Drop Zone matching PRF128.png */}
          <div style={{
            border: '1px dashed #d1d5db', borderRadius: '4px', padding: '2rem', textAlign: 'center',
            background: '#fafafa', marginBottom: '1.5rem',
          }}>
            <IconPhoto size={36} color="#9ca3af" />
            <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#111827', marginTop: '0.5rem' }}>
              Drag &amp; Drop Additional Architectural Photos
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 1rem 0' }}>
              Supports PNG, JPG, WebP up to 15MB each • Recommended ratio 21:9 or 16:9
            </div>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" style={{ display: 'none' }} />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: '#ffffff', border: '1px solid #111827', color: '#111827',
                padding: '0.45rem 1rem', borderRadius: '2px', fontSize: '0.75rem', fontWeight: 800, cursor: 'pointer',
              }}
            >
              BROWSE FILES FROM COMPUTER
            </button>
          </div>

          {/* 6 Thumbnail boxes matching PRF128.png */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '0.75rem' }}>
            {galleryPhotos.map((photo, idx) => (
              <div key={photo.id} style={{ border: '1px solid #e5e7eb', borderRadius: '3px', background: '#fafafa', overflow: 'hidden' }}>
                <div style={{
                  background: '#f3f4f6', height: '80px', position: 'relative',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {idx === 0 && (
                    <span style={{ position: 'absolute', top: '4px', left: '4px', background: '#111827', color: '#ffffff', fontSize: '0.55rem', fontWeight: 800, padding: '1px 4px', borderRadius: '1px' }}>
                      COVER
                    </span>
                  )}
                  <IconPhoto size={20} color="#9ca3af" />
                </div>
                <div style={{ padding: '0.5rem' }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {photo.title}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.62rem', color: '#6b7280', marginTop: '0.35rem' }}>
                    <span style={{ cursor: 'pointer', fontWeight: 700 }}>EDIT</span>
                    <span>•</span>
                    <span onClick={() => handleRemovePhoto(photo.id)} style={{ cursor: 'pointer', color: '#b91c1c', fontWeight: 700 }}>
                      REMOVE
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 04: Offered Workshop Experiences (Quick Status) matching PRF128.png */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.75rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              04 Offered Workshop Experiences (Quick Status)
            </h2>
            <Link
              href={`/provider/${params.providerId}/experiences`}
              style={{ fontSize: '0.72rem', fontWeight: 800, color: '#111827', textDecoration: 'none' }}
            >
              OPEN EXPERIENCE MANAGEMENT PORTAL →
            </Link>
          </div>

          <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.85rem 1.25rem', borderRadius: '3px', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563' }}>
              Rates, slot guarantees, and syllabi are managed individually. Toggle their visibility below or open full experience manager:
            </span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>
              3 Active Programs
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
            {experiences.map((exp, idx) => (
              <div key={exp.code} style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', background: '#ffffff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, background: '#111827', color: '#ffffff', padding: '2px 6px', borderRadius: '2px' }}>
                    {exp.code}
                  </span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#059669' }}>
                    ACTIVE
                  </span>
                </div>

                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: '#111827', marginBottom: '0.35rem', lineHeight: 1.35 }}>
                  {exp.title}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '1rem' }}>
                  {exp.rate}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f3f4f6', paddingTop: '0.75rem' }}>
                  <Link
                    href={`/provider/${params.providerId}/experiences/${exp.expId}`}
                    style={{ fontSize: '0.72rem', fontWeight: 700, color: '#111827', textDecoration: 'none' }}
                  >
                    Edit Details
                  </Link>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', fontWeight: 800, color: '#111827', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={exp.listed}
                      onChange={e => {
                        const updated = [...experiences]
                        updated[idx].listed = e.target.checked
                        setExperiences(updated)
                      }}
                    />
                    <span>LISTED</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 05: Logistics, Transit & On-Site Dispatch matching PRF128.png */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.75rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0 }}>
              05 Logistics, Transit &amp; On-Site Dispatch
            </h2>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              AGENCY OPERATIONAL ACCESS
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '2rem' }}>
            {/* Left Inputs */}
            <div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  DIRECT DISPATCH HOTLINE
                </label>
                <input
                  type="text"
                  value={hotline}
                  onChange={e => setHotline(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem' }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  WORKSHOP LEAD COORDINATOR
                </label>
                <input
                  type="text"
                  value={coordinator}
                  onChange={e => setCoordinator(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  COACH PARKING &amp; PIER TURNAROUND LOGISTICS
                </label>
                <textarea
                  rows={3}
                  value={pierLogistics}
                  onChange={e => setPierLogistics(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            {/* Right Checkboxes */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', background: '#fafafa' }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '1rem' }}>
                VERIFIED ACCESSIBILITY &amp; ON-SITE AMENITIES
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', color: '#111827', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={amenities.wheelchair}
                    onChange={e => setAmenities({ ...amenities, wheelchair: e.target.checked })}
                  />
                  <span>Wheelchair Accessible Studio Ramp (Full ADA compliant)</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', color: '#111827', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={amenities.teaPavilion}
                    onChange={e => setAmenities({ ...amenities, teaPavilion: e.target.checked })}
                  />
                  <span>Covered Tea Pavilion &amp; Visitor Reception</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', color: '#111827', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={amenities.dryingRoom}
                    onChange={e => setAmenities({ ...amenities, dryingRoom: e.target.checked })}
                  />
                  <span>Air-purified drying room &amp; safe ceramic packing station</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.78rem', color: '#111827', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={amenities.packaging}
                    onChange={e => setAmenities({ ...amenities, packaging: e.target.checked })}
                  />
                  <span>Secure export-grade crate packaging for international transit</span>
                </label>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Sticky Bottom Bar matching PRF128.png */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff',
        borderTop: '1px solid #e5e7eb', padding: '0.85rem 2rem', zIndex: 50,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }}></span>
            <span>Last autosaved 2m ago • All changes synced to B2B verified registry</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => router.push(`/provider/${params.providerId}`)}
              style={{
                background: '#ffffff', border: '1px solid #d1d5db', color: '#111827',
                padding: '0.55rem 1rem', fontSize: '0.75rem', fontWeight: 700, borderRadius: '2px', cursor: 'pointer',
              }}
            >
              DISCARD CHANGES
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              style={{
                background: '#111827', border: 'none', color: '#ffffff',
                padding: '0.55rem 1.25rem', fontSize: '0.75rem', fontWeight: 800, borderRadius: '2px', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              }}
            >
              <IconCheck size={14} color="#ffffff" />
              <span>{saving ? 'SAVING...' : 'SAVE PROVIDER PROFILE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer matching PRF128.png */}
      <footer style={{
        borderTop: '1px solid #e5e7eb', padding: '2rem', background: '#fafafa', fontSize: '0.75rem', color: '#6b7280',
        marginBottom: '60px',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <strong style={{ color: '#111827' }}>VIETNAM CRAFT VILLAGES</strong>
              <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '2px' }}>
                TRADITIONAL ARTISANAL HERITAGE · TOUR AGENCY HUB
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem' }}>
              <span style={{ cursor: 'pointer' }}>Explore</span>
              <span style={{ cursor: 'pointer' }}>About</span>
              <span style={{ cursor: 'pointer' }}>Terms of Service</span>
              <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
              <span style={{ cursor: 'pointer' }}>Agency Support Desk</span>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #f3f4f6', paddingTop: '1rem', fontSize: '0.68rem', color: '#9ca3af' }}>
            <span>© 2025 VIETNAM CRAFT VILLAGES NETWORK. ALL RIGHTS RESERVED.</span>
            <span>SYSTEM REF: WIREFRAME-B2B-V1.0</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
