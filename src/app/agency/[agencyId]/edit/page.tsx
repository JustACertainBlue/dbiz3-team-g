'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import RoleNavbar from '@/app/components/RoleNavbar'
import { getCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'
import {
  IconCheck,
  IconLock,
  IconPin,
  IconFileText,
  IconSparkles,
  IconShield,
  IconClose,
  IconEye,
} from '@/app/components/Icons'

export default function EditAgencyProfilePage({
  params,
}: {
  params: { agencyId: string }
}) {
  const router = useRouter()
  const [role, setRole] = useState<CurrentUserRole>('TourAgency')
  const [mounted, setMounted] = useState(false)

  // Form states matching PRF021.png exactly
  const [englishName, setEnglishName] = useState('Indochina Heritage Voyages Co., Ltd.')
  const [vietnameseName, setVietnameseName] = useState('Công ty TNHH Du lịch Di sản Đông Dương')
  const [taxId] = useState('0108923456')
  const [licenseNo] = useState('01-1452/2020/TCDL-GP LHQT')
  const [address, setAddress] = useState('42B Ly Thuong Kiet, Hoan Kiem District, Hanoi')
  const [estYear, setEstYear] = useState('2012')
  const [operatingStatus, setOperatingStatus] = useState('Active Inbound Operations')

  // Section 02 states
  const [curatorialStatement, setCuratorialStatement] = useState(
    'Specializing in high-end academic, architectural, and craft masterclass delegations across traditional Red River artisan villages since 2012. We operate as an academic bridge linking scholarly inquiries, cultural preservationists, and discerning collectors directly with traditional guilds.'
  )
  const [demographics, setDemographics] = useState({
    luxury: true,
    academic: true,
    study: true,
  })
  const [markets, setMarkets] = useState<string[]>([
    'Europe (France, UK, DE)',
    'North America (USA, Canada)',
    'East Asia (Japan, Korea)',
    'Oceania (Australia, NZ)',
  ])
  const [newMarket, setNewMarket] = useState('')
  const [showAddMarket, setShowAddMarket] = useState(false)

  // Section 03 Liaison states
  const [directorName, setDirectorName] = useState('Dr. Eleanor Vance')
  const [directorTitle, setDirectorTitle] = useState('Ph.D. Southeast Asian Material Culture')
  const [hanoiHotline, setHanoiHotline] = useState('+84 91 245 8890')
  const [intlHotline, setIntlHotline] = useState('+33 6 42 19 04 22 (Paris Office Direct)')
  const [dispatchEmail, setDispatchEmail] = useState('dispatch@indochina-heritage.vn')

  const [liaisonName, setLiaisonName] = useState('Marcus Sterling')
  const [liaisonRole, setLiaisonRole] = useState('Ground Transit & Route Safety Coordinator')
  const [liaisonEmail, setLiaisonEmail] = useState('transit@indochina-heritage.vn')
  const [responseSla, setResponseSla] = useState('< 90 Minutes (Fastest Tier)')

  // Section 04 Matchmaking states
  const [groupSizes, setGroupSizes] = useState({
    vip: true,
    curated: true,
    academic: true,
  })
  const [services, setServices] = useState({
    s1: true,
    s2: true,
    s3: true,
    s4: true,
  })
  const [disciplines, setDisciplines] = useState<string[]>([
    'Silk Weaving & Botanical Dyeing',
    'High-Fire Wood Kiln Ceramics',
    'Traditional Sơn Mài Natural Lacquer',
    'Bamboo & Filigree Artistry',
  ])
  const [newDiscipline, setNewDiscipline] = useState('')
  const [showAddDiscipline, setShowAddDiscipline] = useState(false)

  const [mobilityProtocol, setMobilityProtocol] = useState(
    'Specialized Mobility Request Protocol: Step-free workshop itineraries and adapted transit options available upon advance request for designated heritage ateliers.'
  )

  const [saving, setSaving] = useState(false)
  const [aiRefining, setAiRefining] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    setMounted(true)
    setRole(getCurrentRole())
    const onRoleChanged = () => setRole(getCurrentRole())
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  if (!mounted) return null

  // Security check: only TourAgency can edit agency profile
  const isTourAgency = role === 'TourAgency'
  if (!isTourAgency) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
        <RoleNavbar breadcrumbs={<>HOME / TRAVEL AGENCIES / <span style={{ color: '#111827' }}>ACCESS RESTRICTED (BR-001)</span></>} />
        <div style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center', background: '#ffffff', padding: '3rem', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <IconLock size={40} color="#b84c24" />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>
            Tour Agency Permission Required
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            Modifications to agency profile PRF021 require verified Tour Agency credentials under Business Rule BR-001.
          </p>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('hab_set_role', { detail: 'TourAgency' }))
            }}
            className="spec-btn-black"
            style={{ padding: '0.65rem 1.25rem', fontSize: '0.82rem' }}
          >
            Switch to Tour Agency
          </button>
        </div>
      </div>
    )
  }

  const handleAIRefine = async () => {
    setAiRefining(true)
    try {
      const res = await fetch('/api/prf/ai/description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ original_description: curatorialStatement }),
      })
      if (res.ok) {
        const data = await res.json()
        setCuratorialStatement(data.refined_description_draft || curatorialStatement)
        setMessage({ type: 'success', text: 'Curatorial statement refined with AI assistance!' })
      }
    } catch {
      setMessage({ type: 'error', text: 'AI refinement service temporarily unavailable.' })
    } finally {
      setAiRefining(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch(`/api/prf/agency/${params.agencyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agency_name: englishName,
          vietnamese_name: vietnameseName,
          location_address: address,
          contact: {
            contact_person_name: directorName,
            phone_number: hanoiHotline,
            business_email: dispatchEmail,
          },
        }),
      })
      if (res.ok) {
        setMessage({ type: 'success', text: 'Agency profile updated successfully on B2B connection portal!' })
        setTimeout(() => {
          router.push(`/agency/${params.agencyId}`)
        }, 1200)
      } else {
        setMessage({ type: 'error', text: 'Failed to update agency profile.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Connection error while saving.' })
    } finally {
      setSaving(false)
    }
  }

  const handleAddMarket = () => {
    if (newMarket.trim() && !markets.includes(newMarket.trim())) {
      setMarkets([...markets, newMarket.trim()])
      setNewMarket('')
      setShowAddMarket(false)
    }
  }

  const handleAddDiscipline = () => {
    if (newDiscipline.trim() && !disciplines.includes(newDiscipline.trim())) {
      setDisciplines([...disciplines, newDiscipline.trim()])
      setNewDiscipline('')
      setShowAddDiscipline(false)
    }
  }

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', background: '#fbfbfb', minHeight: '100vh', color: '#111827' }}>
      <RoleNavbar
        breadcrumbs={
          <>HOME / TRAVEL AGENCIES / INDOCHINA HERITAGE VOYAGES / <span style={{ color: '#111827', fontWeight: 700 }}>EDIT PROFILE</span></>
        }
      />

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.75rem 2rem 6rem' }}>

        {/* HEADER matching PRF021.png */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.68rem', fontWeight: 800, background: '#f3f4f6', color: '#4b5563', padding: '3px 8px', borderRadius: '2px', marginBottom: '0.5rem', letterSpacing: '0.04em' }}>
            <IconLock size={12} color="#4b5563" />
            <span>VNAT #01-1452/2020/TCDL-GP LHQT (LOCKED / VERIFIED LICENSE)</span>
          </div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 800, color: '#111827', margin: '0 0 0.35rem 0', letterSpacing: '-0.02em' }}>
            Edit Agency Profile
          </h1>
          <p style={{ fontSize: '0.86rem', color: '#6b7280', margin: 0 }}>
            Update legal enterprise information, curatorial statement, B2B liaison contacts, and sourcing preferences.
          </p>
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

        {/* 01. Core Legal Identity & Enterprise Details matching PRF021.png */}
        <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.75rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.5rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9rem' }}>■</span> 01. Core Legal Identity &amp; Enterprise Details
            </h2>
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              LEGAL &amp; ACCREDITATION
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                COMPANY LEGAL NAME (ENGLISH) *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={englishName}
                  onChange={e => setEnglishName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 2.2rem 0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem' }}
                />
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#059669' }}>
                  <IconCheck size={14} color="#059669" />
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                COMPANY LEGAL NAME (VIETNAMESE) *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={vietnameseName}
                  onChange={e => setVietnameseName(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 2.2rem 0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem' }}
                />
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#059669' }}>
                  <IconCheck size={14} color="#059669" />
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase' }}>
                  CORPORATE TAX ID (MST) *
                </label>
                <span style={{ fontSize: '0.68rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <IconLock size={11} color="#6b7280" /> LOCKED / VERIFIED
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  disabled
                  value={taxId}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb', background: '#f9fafb', color: '#4b5563', padding: '0.6rem 2.2rem 0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem', fontFamily: 'monospace' }}
                />
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#059669' }}>
                  <IconCheck size={14} color="#059669" />
                </span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase' }}>
                  INBOUND OPERATOR LICENSE NO. (GP LHQT) *
                </label>
                <span style={{ fontSize: '0.68rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <IconLock size={11} color="#6b7280" /> VNAT AUDITED
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  disabled
                  value={licenseNo}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #e5e7eb', background: '#f9fafb', color: '#4b5563', padding: '0.6rem 2.2rem 0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem', fontFamily: 'monospace' }}
                />
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#059669' }}>
                  <IconCheck size={14} color="#059669" />
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              REGISTERED BUSINESS ADDRESS / HQ *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={address}
                onChange={e => setAddress(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 2.2rem 0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem' }}
              />
              <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>
                <IconPin size={14} color="#6b7280" />
              </span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                ESTABLISHED YEAR
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  value={estYear}
                  onChange={e => setEstYear(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 2.2rem 0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem' }}
                />
                <span style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#059669' }}>
                  <IconCheck size={14} color="#059669" />
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                OPERATING STATUS
              </label>
              <input
                type="text"
                value={operatingStatus}
                onChange={e => setOperatingStatus(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.86rem' }}
              />
            </div>
          </div>

          {/* Statutory document box */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
              VERIFIED STATUTORY DOCUMENTATION / BUSINESS REGISTRATION (GPKD)
            </div>
            <div style={{
              border: '1px solid #e5e7eb', borderRadius: '3px', padding: '0.85rem 1rem', background: '#fafafa',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <IconFileText size={20} color="#6b7280" />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#111827' }}>
                    GPKD_Indochina_Heritage_Voyages_Certified.pdf <span style={{ fontSize: '0.65rem', background: '#111827', color: '#ffffff', padding: '1px 4px', borderRadius: '1px' }}>2.4 MB</span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>
                    • Verified &amp; Locked by Hanoi Dept. of Tourism<br />
                    Statutory certificate verified under VNAT B2B inbound travel operator standard.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => alert('View statutory certificate')}
                style={{
                  background: '#ffffff', border: '1px solid #d1d5db', color: '#111827',
                  padding: '0.4rem 0.85rem', borderRadius: '2px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}
              >
                <IconEye size={12} color="#111827" />
                <span>VIEW DOCUMENT</span>
              </button>
            </div>
          </div>

          {/* Platform Performance & Trust Accreditation */}
          <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>Platform Performance &amp; Trust Accreditation</div>
              <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>
                Calculated from verified B2B booking records (Read-only, audited quarterly by Hanoi Department of Tourism).
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>13+</div>
                <div style={{ fontSize: '0.62rem', color: '#6b7280', textTransform: 'uppercase' }}>YEARS ACTIVE</div>
              </div>
              <div style={{ borderLeft: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', padding: '0 1.25rem' }}>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>100%</div>
                <div style={{ fontSize: '0.62rem', color: '#6b7280', textTransform: 'uppercase' }}>FAIR PAY SLA</div>
              </div>
              <div>
                <div style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>4 Hubs</div>
                <div style={{ fontSize: '0.62rem', color: '#6b7280', textTransform: 'uppercase' }}>ACTIVE GUILDS</div>
              </div>
            </div>
          </div>
        </div>

        {/* 2 COLUMNS: LEFT (02 & 04), RIGHT (03) matching PRF021.png */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>

          {/* LEFT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* 02. Curatorial Statement & Markets matching PRF021.png */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem' }}>■</span> 02. Curatorial Statement &amp; Markets
                </h2>
                <button
                  type="button"
                  onClick={handleAIRefine}
                  disabled={aiRefining}
                  style={{
                    background: 'none', border: 'none', color: '#111827', fontSize: '0.72rem', fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                  }}
                >
                  <IconSparkles size={12} color="#111827" />
                  <span>{aiRefining ? 'AI Refining...' : 'AI Refine Text'}</span>
                </button>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  CURATORIAL STATEMENT &amp; MISSION FOCUS
                </label>
                <textarea
                  rows={4}
                  value={curatorialStatement}
                  onChange={e => setCuratorialStatement(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.6rem 0.75rem', borderRadius: '2px', fontSize: '0.82rem', lineHeight: 1.5 }}
                />
                <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '0.35rem' }}>
                  Presented to verified artisan guilds and master craftspeople during itinerary reservation requests.
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  CORE CLIENT DEMOGRAPHICS &amp; VETTING TYPES
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <label style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px', cursor: 'pointer', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#111827' }}>LUXURY FIT</span>
                      <input
                        type="checkbox"
                        checked={demographics.luxury}
                        onChange={e => setDemographics({ ...demographics, luxury: e.target.checked })}
                      />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '0.25rem', lineHeight: 1.35 }}>
                      High-net-worth private patrons seeking bespoke
                    </div>
                  </label>

                  <label style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px', cursor: 'pointer', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#111827' }}>ACADEMIC SCHOLARS</span>
                      <input
                        type="checkbox"
                        checked={demographics.academic}
                        onChange={e => setDemographics({ ...demographics, academic: e.target.checked })}
                      />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '0.25rem', lineHeight: 1.35 }}>
                      Anthropological, ethnological, and textile
                    </div>
                  </label>

                  <label style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px', cursor: 'pointer', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#111827' }}>STUDY DELEGATIONS</span>
                      <input
                        type="checkbox"
                        checked={demographics.study}
                        onChange={e => setDemographics({ ...demographics, study: e.target.checked })}
                      />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '0.25rem', lineHeight: 1.35 }}>
                      Curatorial delegations from Europe, North America, and
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  PRIMARY SOURCING GEOGRAPHIC MARKETS
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {markets.map(m => (
                    <span key={m} style={{ fontSize: '0.75rem', background: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb', padding: '3px 8px', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {m}
                      <span onClick={() => setMarkets(markets.filter(x => x !== m))} style={{ cursor: 'pointer', color: '#9ca3af' }}>
                        <IconClose size={10} color="#9ca3af" />
                      </span>
                    </span>
                  ))}

                  {showAddMarket ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Market..."
                        value={newMarket}
                        onChange={e => setNewMarket(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddMarket()}
                        style={{ border: '1px solid #d1d5db', padding: '2px 6px', fontSize: '0.75rem', borderRadius: '2px', width: '90px' }}
                      />
                      <button type="button" onClick={handleAddMarket} style={{ background: '#111827', color: '#ffffff', border: 'none', padding: '2px 6px', fontSize: '0.7rem', borderRadius: '2px', cursor: 'pointer' }}>
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddMarket(true)}
                      style={{ background: '#ffffff', border: '1px dashed #9ca3af', color: '#4b5563', padding: '3px 8px', borderRadius: '2px', fontSize: '0.72rem', cursor: 'pointer' }}
                    >
                      + ADD MARKET
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 04. Tour Preferences & Matchmaking Criteria matching PRF021.png */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem', borderBottom: '1px solid #f3f4f6', paddingBottom: '0.75rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem' }}>■</span> 04. Tour Preferences &amp; Matchmaking Criteria
                </h2>
                <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  B2B OPERATING PROFILE
                </span>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  FREQUENTLY SOURCED GROUP SIZES (QUY MÔ ĐOÀN HAY TÌM KIẾM)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  <label style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px', cursor: 'pointer', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>Bespoke VIP Cohorts</span>
                      <input
                        type="checkbox"
                        checked={groupSizes.vip}
                        onChange={e => setGroupSizes({ ...groupSizes, vip: e.target.checked })}
                      />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>4–8 pax • High Touch</div>
                  </label>

                  <label style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px', cursor: 'pointer', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>Curated Inbound Groups</span>
                      <input
                        type="checkbox"
                        checked={groupSizes.curated}
                        onChange={e => setGroupSizes({ ...groupSizes, curated: e.target.checked })}
                      />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>10–18 pax • Masterclass</div>
                  </label>

                  <label style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px', cursor: 'pointer', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>Academic Delegations</span>
                      <input
                        type="checkbox"
                        checked={groupSizes.academic}
                        onChange={e => setGroupSizes({ ...groupSizes, academic: e.target.checked })}
                      />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>≤ 25 pax • Curatorial</div>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  PREFERRED EXPERIENCE &amp; SERVICE TYPES (LOẠI HÌNH TRẢI NGHIỆM &amp; DỊCH VỤ)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <label style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px', cursor: 'pointer', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>01 Hands-on Masterclasses</span>
                      <input
                        type="checkbox"
                        checked={services.s1}
                        onChange={e => setServices({ ...services, s1: e.target.checked })}
                      />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>Deep-dive 2.5h–4h artisan instruction with raw material preparation</div>
                  </label>

                  <label style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px', cursor: 'pointer', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>02 Master Artisan Dialogue</span>
                      <input
                        type="checkbox"
                        checked={services.s2}
                        onChange={e => setServices({ ...services, s2: e.target.checked })}
                      />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>Private studio symposium, living treasure interviews &amp; translation</div>
                  </label>

                  <label style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px', cursor: 'pointer', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>03 Kiln &amp; Studio Commission Access</span>
                      <input
                        type="checkbox"
                        checked={services.s3}
                        onChange={e => setServices({ ...services, s3: e.target.checked })}
                      />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>Direct observation of wood kilns and confidential custom order review</div>
                  </label>

                  <label style={{ background: '#fafafa', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '3px', cursor: 'pointer', display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#111827' }}>04 Wholesale &amp; Sourcing</span>
                      <input
                        type="checkbox"
                        checked={services.s4}
                        onChange={e => setServices({ ...services, s4: e.target.checked })}
                      />
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>B2B purchase protocol, authentic origin certification &amp; export packing</div>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                  TARGET CRAFT DISCIPLINES (NGÀNH NGHỀ THỦ CÔNG ƯU TIÊN)
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  {disciplines.map(d => (
                    <span key={d} style={{ fontSize: '0.75rem', background: '#f3f4f6', color: '#111827', border: '1px solid #e5e7eb', padding: '3px 8px', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      {d}
                      <span onClick={() => setDisciplines(disciplines.filter(x => x !== d))} style={{ cursor: 'pointer', color: '#9ca3af' }}>
                        <IconClose size={10} color="#9ca3af" />
                      </span>
                    </span>
                  ))}

                  {showAddDiscipline ? (
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Discipline..."
                        value={newDiscipline}
                        onChange={e => setNewDiscipline(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddDiscipline()}
                        style={{ border: '1px solid #d1d5db', padding: '2px 6px', fontSize: '0.75rem', borderRadius: '2px', width: '100px' }}
                      />
                      <button type="button" onClick={handleAddDiscipline} style={{ background: '#111827', color: '#ffffff', border: 'none', padding: '2px 6px', fontSize: '0.7rem', borderRadius: '2px', cursor: 'pointer' }}>
                        Add
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowAddDiscipline(true)}
                      style={{ background: '#ffffff', border: '1px dashed #9ca3af', color: '#4b5563', padding: '3px 8px', borderRadius: '2px', fontSize: '0.72rem', cursor: 'pointer' }}
                    >
                      + ADD DISCIPLINE
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  SPECIALIZED MOBILITY &amp; ACCESSIBILITY REQUEST PROTOCOL
                </label>
                <textarea
                  rows={2}
                  value={mobilityProtocol}
                  onChange={e => setMobilityProtocol(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem 0.75rem', borderRadius: '2px', fontSize: '0.78rem' }}
                />
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            {/* 03. Contact & Field Liaison matching PRF021.png */}
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1.25rem' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem' }}>■</span> 03. Contact &amp; Field Liaison
                </h2>
                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af' }}>24/7 OPERATIONS</span>
              </div>

              {/* Lead Tour Director */}
              <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', marginBottom: '1.25rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '28px', height: '28px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#374151' }}>
                  EV
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#ffffff', background: '#111827', display: 'inline-block', padding: '1px 5px', borderRadius: '2px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  LEAD TOUR DIRECTOR
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    DIRECTOR NAME *
                  </label>
                  <input
                    type="text"
                    value={directorName}
                    onChange={e => setDirectorName(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                  />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    ACADEMIC TITLE / CURATORIAL SPECIALIZATION
                  </label>
                  <input
                    type="text"
                    value={directorTitle}
                    onChange={e => setDirectorTitle(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                  />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    HANOI DIRECT HOTLINE *
                  </label>
                  <input
                    type="text"
                    value={hanoiHotline}
                    onChange={e => setHanoiHotline(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                  />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    SECONDARY HOTLINE / INTERNATIONAL
                  </label>
                  <input
                    type="text"
                    value={intlHotline}
                    onChange={e => setIntlHotline(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    DISPATCH EMAIL ADDRESS *
                  </label>
                  <input
                    type="email"
                    value={dispatchEmail}
                    onChange={e => setDispatchEmail(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                  />
                </div>
              </div>

              {/* Secondary Field Liaison */}
              <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1.25rem', marginBottom: '1.25rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', width: '28px', height: '28px', borderRadius: '50%', background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#374151' }}>
                  MS
                </div>
                <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#4b5563', background: '#e5e7eb', display: 'inline-block', padding: '1px 5px', borderRadius: '2px', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                  SECONDARY FIELD LIAISON
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    LIAISON FULL NAME
                  </label>
                  <input
                    type="text"
                    value={liaisonName}
                    onChange={e => setLiaisonName(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                  />
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    OPERATIONAL ROLE
                  </label>
                  <input
                    type="text"
                    value={liaisonRole}
                    onChange={e => setLiaisonRole(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
                    LIAISON DIRECT TRANSIT EMAIL
                  </label>
                  <input
                    type="email"
                    value={liaisonEmail}
                    onChange={e => setLiaisonEmail(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                  />
                </div>
              </div>

              {/* SLA */}
              <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: '3px', padding: '1rem', marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.65rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.35rem' }}>
                  AVERAGE RESPONSE VELOCITY SLA
                </label>
                <input
                  type="text"
                  value={responseSla}
                  onChange={e => setResponseSla(e.target.value)}
                  style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #d1d5db', padding: '0.5rem', borderRadius: '2px', fontSize: '0.82rem', background: '#ffffff' }}
                />
                <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '0.35rem' }}>
                  Commitment displayed on guild matching search cards.
                </div>
              </div>

              {/* Operator Badge */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', background: '#ffffff', padding: '1rem', display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                <IconShield size={22} color="#111827" />
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#111827' }}>
                    VERIFIED OPERATOR BADGE ACTIVE
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#6b7280', marginTop: '2px' }}>
                    Compliant with Hanoi Dept. of Tourism B2B Artisan Fair Pay Regulations.
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* STICKY BOTTOM BAR matching PRF021.png */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff',
        borderTop: '1px solid #e5e7eb', padding: '0.85rem 2rem', zIndex: 50,
        boxShadow: '0 -2px 10px rgba(0,0,0,0.05)',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: '#059669' }}></span>
            <span>Last autosaved 2m ago • All profile changes subject to B2B operator compliance review</span>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => router.push(`/agency/${params.agencyId}`)}
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
              <span>{saving ? 'SAVING...' : 'SAVE AGENCY PROFILE'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Footer matching PRF021.png */}
      <footer style={{ borderTop: '1px solid #e5e7eb', padding: '2rem', background: '#fafafa', fontSize: '0.75rem', color: '#6b7280', marginBottom: '60px' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <strong>HANOI ARTISAN BRIDGE</strong> © 2025 • B2B Cultural Heritage Operations
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.75rem' }}>
            <span style={{ cursor: 'pointer' }}>Operator Terms</span>
            <span style={{ cursor: 'pointer' }}>Artisan Privacy Protocol</span>
            <span style={{ cursor: 'pointer' }}>Compliance &amp; Heritage Standards</span>
            <span style={{ cursor: 'pointer' }}>Support Desk</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
