'use client'

import React, { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getCurrentRole, setCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'
import {
  IconLock,
  IconUser,
  IconLandmark,
  IconBriefcase,
  IconVase,
  IconFileText,
  IconLogout,
  IconCheck,
  IconBell,
  IconChevronDown,
} from '@/app/components/Icons'

interface RoleNavbarProps {
  breadcrumbs?: React.ReactNode
  accessLevel?: string
  providerId?: string
  agencyId?: string
}

export default function RoleNavbar({
  breadcrumbs,
  providerId = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374',
  agencyId = '5fecc699-71e4-5bf0-ac1b-2090e05c2cd9',
}: RoleNavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [role, setRole] = useState<CurrentUserRole>('LocalProvider')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const villageId = '20896522-6235-5699-aeaf-f48b8150d895'

  useEffect(() => {
    setRole(getCurrentRole())
    const onRoleChanged = () => setRole(getCurrentRole())
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleUndevelopedClick = (e: React.MouseEvent, moduleName: string, screenCode: string) => {
    e.preventDefault()
    setToastMessage(`"${moduleName}" (${screenCode}) is under development.`)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const handleLogout = () => {
    setCurrentRole('Guest')
    setRole('Guest')
    setDropdownOpen(false)
    router.push('/explore')
  }

  const Toast = () =>
    toastMessage ? (
      <div style={{
        position: 'fixed', top: '60px', right: '20px', zIndex: 9999,
        background: '#111827', color: '#ffffff', border: '1px solid #374151',
        padding: '0.65rem 1rem', borderRadius: '3px', fontSize: '0.78rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
      }}>
        {toastMessage}
      </div>
    ) : null

  // Account Modal (ACC129)
  const AccountModal = () =>
    accountModalOpen ? (
      <div style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 10000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
      }}>
        <div style={{
          background: '#ffffff', borderRadius: '4px', maxWidth: '480px', width: '100%',
          padding: '2rem', boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <span className="spec-badge-pill" style={{ background: '#f3f4f6', color: '#111827' }}>SCREEN ID: ACC129</span>
              <h3 style={{ margin: '0.35rem 0 0 0', fontSize: '1.25rem', fontWeight: 800 }}>Personal Account Information</h3>
            </div>
            <button
              onClick={() => setAccountModalOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', display: 'flex', alignItems: 'center' }}
            >
              <IconClose size={16} color="#6b7280" />
            </button>
          </div>

          <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.8, marginBottom: '1.5rem' }}>
            {role === 'LocalProvider' && (
              <>
                <div><strong>Full Name:</strong> Nguyen Van Hung</div>
                <div><strong>Role:</strong> Lead Master Artisan / Atelier Director (4th Generation)</div>
                <div><strong>Assigned Workshop:</strong> Hung Thinh Artisan Pottery Workshop Bat Trang</div>
                <div><strong>Account Email:</strong> dispatch@hungthinhpottery.vn</div>
                <div><strong>Phone Number:</strong> +84 90 311 8842</div>
                <div><strong>System ID:</strong> LP-HN-BTR-004</div>
              </>
            )}
            {role === 'TourAgency' && (
              <>
                <div><strong>Full Name:</strong> Le Hoang Nam</div>
                <div><strong>Title:</strong> Head of Artisan Partnerships &amp; Field Operations</div>
                <div><strong>Enterprise Entity:</strong> Indochina Heritage Voyages Co., Ltd.</div>
                <div><strong>Business Email:</strong> b2b-liaison@indochina-heritage.vn</div>
                <div><strong>B2B Hotline:</strong> +84 91 234 5678</div>
                <div><strong>VNAT License ID:</strong> OP-2020-0942</div>
              </>
            )}
            {role === 'UBND' && (
              <>
                <div><strong>Appraisal Officer:</strong> Nguyen Thuy Trang</div>
                <div><strong>Title:</strong> Cultural Heritage &amp; Tourism Compliance Officer</div>
                <div><strong>Authority:</strong> Bat Trang Commune People&apos;s Committee, Gia Lam, Hanoi</div>
                <div><strong>Mandate:</strong> Heritage appraisal, artisan accreditation, OCOP standards compliance</div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setAccountModalOpen(false)}
              className="spec-btn-black"
              style={{ fontSize: '0.75rem' }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    ) : null

  // =========================================================================
  // GUEST NAVBAR — Strictly Public, NO logged-in controls (EXP120 / DSC123)
  // =========================================================================
  if (role === 'Guest') {
    const isExplore = pathname === '/explore'

    const guestNavItems = [
      { label: 'Explore', href: '/explore', active: isExplore, locked: false },
      { label: 'AI Tour Matching', href: '#matching', active: false, locked: true, lockBadge: 'B2B' },
      { label: 'Bookings', href: '#bookings', active: false, locked: true },
      { label: 'Messages', href: '#messages', active: false, locked: true },
      { label: 'Schedules', href: '#schedules', active: false, locked: true },
    ]

    return (
      <>
        <Toast />
        <header style={{
          background: '#ffffff', borderBottom: '1px solid #e5e7eb',
          padding: '0 2rem', display: 'flex', alignItems: 'stretch',
          justifyContent: 'space-between', minHeight: '52px',
        }}>
          {/* Brand — Left */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '2rem', flexShrink: 0 }}>
            <Link href="/explore" style={{ textDecoration: 'none' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em', color: '#111827', lineHeight: 1 }}>
                HANOI ARTISAN BRIDGE
              </div>
              <div style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                TRAVEL AGENCY PORTAL
              </div>
            </Link>
          </div>

          {/* Center Nav — Guest View matching DSC123 mockup */}
          <nav style={{ display: 'flex', alignItems: 'stretch', flex: 1, justifyContent: 'center' }}>
            {guestNavItems.map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'stretch' }}>
                {item.locked ? (
                  <span
                    onClick={() => {
                      setToastMessage(`"${item.label}" requires verified Tour Agency authentication.`)
                      setTimeout(() => setToastMessage(null), 3000)
                    }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0 0.9rem', fontSize: '0.8rem', fontWeight: 600,
                      color: '#9ca3af', cursor: 'pointer',
                    }}
                  >
                    {item.label}
                    {item.lockBadge ? (
                      <span style={{ fontSize: '0.65rem', color: '#9ca3af', border: '1px solid #d1d5db', padding: '1px 4px', borderRadius: '2px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
                        <IconLock size={10} color="#9ca3af" />
                        <span>{item.lockBadge}</span>
                      </span>
                    ) : (
                      <IconLock size={12} color="#9ca3af" />
                    )}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '0 0.9rem',
                      fontSize: '0.8rem', fontWeight: item.active ? 800 : 600,
                      color: item.active ? '#111827' : '#6b7280',
                      textDecoration: 'none',
                      borderBottom: item.active ? '2.5px solid #111827' : '2.5px solid transparent',
                    }}
                  >
                    {item.label}
                  </Link>
                )}
              </div>
            ))}
          </nav>

          {/* Right — Sign In Call-to-action matching DSC123 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
            <button
              onClick={() => {
                setCurrentRole('TourAgency')
                setRole('TourAgency')
                router.push('/explore')
              }}
              className="spec-btn-white"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}
            >
              LOGIN
            </button>
            <button
              onClick={() => {
                setCurrentRole('TourAgency')
                setRole('TourAgency')
                router.push('/explore')
              }}
              className="spec-btn-black"
              style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}
            >
              REGISTER AS AGENCY
            </button>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: '#f3f4f6', color: '#4b5563', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>
              <IconUser size={15} color="#4b5563" />
            </div>
          </div>
        </header>

        {/* Breadcrumb */}
        <div style={{
          background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
          padding: '0.4rem 2rem', fontSize: '0.68rem', fontWeight: 600,
          color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {breadcrumbs || <>PUBLIC CATALOG / <span style={{ color: '#111827' }}>EXPLORE CRAFT VILLAGES</span></>}
        </div>
      </>
    )
  }

  // =========================================================================
  // UBND ADMIN — Administrative Header (ADM079)
  // =========================================================================
  if (role === 'UBND') {
    return (
      <>
        <Toast />
        <AccountModal />
        <header style={{
          background: '#1e293b', borderBottom: '2px solid #991b1b', color: '#ffffff',
          padding: '0.85rem 2rem', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', gap: '1rem', position: 'relative',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <IconLandmark size={22} color="#fca5a5" />
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                HANOI HERITAGE &amp; TOURISM ADMINISTRATION
              </div>
              <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>
                APPRAISAL COMMITTEE · BAT TRANG COMMUNE · ADM PORTAL
              </div>
            </div>
          </div>

          {/* Right User & Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <div
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer' }}
            >
              <div style={{ textAlign: 'right', fontSize: '0.72rem', lineHeight: 1.3 }}>
                <div style={{ fontWeight: 700, color: '#fca5a5' }}>BAT TRANG COMMUNE UBND</div>
                <div style={{ color: '#94a3b8' }}>Nguyen Thuy Trang (Auditor) ▾</div>
              </div>
              <div style={{
                width: '34px', height: '34px', borderRadius: '50%',
                background: '#991b1b', color: '#ffffff', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem',
                border: '2px solid #fca5a5',
              }}>UB</div>
            </div>

            {dropdownOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '44px', width: '260px',
                background: '#ffffff', color: '#111827', border: '1px solid #d1d5db',
                borderRadius: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 9999,
                overflow: 'hidden', fontSize: '0.78rem',
              }}>
                <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontWeight: 800, color: '#991b1b' }}>HERITAGE AUDIT COMMITTEE</div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Officer: Nguyen Thuy Trang</div>
                </div>
                <Link
                  href={`/village/${villageId}`}
                  onClick={() => setDropdownOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', color: '#111827', textDecoration: 'none', borderBottom: '1px solid #f3f4f6' }}
                >
                  <IconLandmark size={14} color="#6b7280" />
                  <span>Manage Village Craft Area (VIL030)</span>
                </Link>
                <Link
                  href={`/provider/${providerId}`}
                  onClick={() => setDropdownOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', color: '#111827', textDecoration: 'none', borderBottom: '1px solid #f3f4f6' }}
                >
                  <IconFileText size={14} color="#6b7280" />
                  <span>Audit Hung Thinh Local Provider Dossier</span>
                </Link>
                <button
                  onClick={() => { setDropdownOpen(false); setAccountModalOpen(true); }}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', background: 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '0.78rem', color: '#111827' }}
                >
                  <IconUser size={14} color="#6b7280" />
                  <span>Personal Account Details (ACC129)</span>
                </button>
                <button
                  onClick={handleLogout}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', background: 'none', border: 'none', color: '#b91c1c', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}
                >
                  <IconLogout size={14} color="#b91c1c" />
                  <span>Sign Out (AUT026)</span>
                </button>
              </div>
            )}
          </div>
        </header>
        <div style={{
          background: '#0f172a', borderBottom: '1px solid #334155', color: '#94a3b8',
          padding: '0.4rem 2rem', fontSize: '0.7rem', fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '0.05em',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>{breadcrumbs || <>UBND PORTAL / COMMUNE SURVEILLANCE / <span style={{ color: '#ffffff', fontWeight: 700 }}>BAT TRANG CRAFT VILLAGE</span></>}</div>
          <div style={{ color: '#4ade80', fontWeight: 700 }}>● REGULATORY OVERSIGHT</div>
        </div>
      </>
    )
  }

  // =========================================================================
  // TOUR AGENCY — Spec: PRF019 / AIT121 / COM048 / EXP017
  // =========================================================================
  if (role === 'TourAgency') {
    const isExplore = pathname === '/explore'
    const isMatching = pathname === '/matching'
    const isMessages = pathname === '/messages'

    const agencyNavItems = [
      { label: 'Explore', href: '/explore', active: isExplore, badge: null as string | null, developed: true, code: '' },
      { label: 'AI Tour Matching', href: '/matching', active: isMatching, badge: 'AI', developed: true, code: '' },
      { label: 'Bookings', href: '#bookings', active: false, badge: null, developed: false, code: 'BKG137' },
      { label: 'Messages', href: '/messages', active: isMessages, badge: (!isMessages ? '●' : null), developed: true, code: '' },
      { label: 'Schedule', href: '#schedule', active: false, badge: null, developed: false, code: 'SCH141' },
    ]

    return (
      <>
        <Toast />
        <AccountModal />
        <header style={{
          background: '#ffffff', borderBottom: '1px solid #e5e7eb',
          padding: '0 2rem', display: 'flex', alignItems: 'stretch',
          justifyContent: 'space-between', minHeight: '52px',
        }}>
          {/* Brand — Left */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '2rem', flexShrink: 0 }}>
            <Link href="/explore" style={{ textDecoration: 'none' }}>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em', color: '#111827', lineHeight: 1 }}>
                HANOI ARTISAN BRIDGE
              </div>
              <div style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                B2B PORTAL
              </div>
            </Link>
          </div>

          {/* Nav — Center */}
          <nav style={{ display: 'flex', alignItems: 'stretch', flex: 1, justifyContent: 'center' }}>
            {agencyNavItems.map((item) => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'stretch' }}>
                {item.developed ? (
                  <Link
                    href={item.href}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      padding: '0 0.9rem',
                      fontSize: '0.8rem', fontWeight: item.active ? 800 : 600,
                      color: item.active ? '#111827' : '#6b7280',
                      textDecoration: 'none',
                      borderBottom: item.active ? '2.5px solid #111827' : '2.5px solid transparent',
                      letterSpacing: '0.01em',
                    }}
                  >
                    {item.label}
                    {item.badge === 'AI' && (
                      <span style={{
                        background: '#111827', color: '#ffffff', fontSize: '0.56rem',
                        fontWeight: 800, padding: '1px 4px', borderRadius: '2px',
                      }}>AI</span>
                    )}
                    {item.badge === '●' && (
                      <span style={{ color: '#ef4444', fontSize: '0.65rem' }}>●</span>
                    )}
                  </Link>
                ) : (
                  <a
                    href={item.href}
                    onClick={(e) => handleUndevelopedClick(e, item.label, item.code)}
                    style={{
                      display: 'flex', alignItems: 'center', padding: '0 0.9rem',
                      fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af',
                      textDecoration: 'none', cursor: 'pointer',
                      borderBottom: '2.5px solid transparent',
                    }}
                    title={`${item.label} (${item.code}) — under development`}
                  >
                    {item.label}
                  </a>
                )}
              </div>
            ))}
          </nav>

          {/* User Block with Interactive Dropdown (ACC129 & PRF019) */}
          <div ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', position: 'relative', flexShrink: 0 }}>
            <div
              onClick={() => setDropdownOpen(!dropdownOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
            >
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end', fontWeight: 700, fontSize: '0.8rem', color: '#111827', lineHeight: 1.15 }}>
                  <span>Indochina Heritage Voyages</span>
                  <IconCheck size={11} color="#059669" />
                </div>
                <div style={{ fontSize: '0.66rem', color: '#6b7280' }}>Tier 1 Operator · ID: VN-9042</div>
              </div>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%', background: '#111827',
                color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.78rem',
              }}>IH</div>
              <span style={{ color: '#9ca3af', fontSize: '0.65rem' }}>▾</span>
            </div>

            {dropdownOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '48px', width: '260px',
                background: '#ffffff', color: '#111827', border: '1px solid #d1d5db',
                borderRadius: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 9999,
                overflow: 'hidden', fontSize: '0.78rem',
              }}>
                <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                  <div style={{ fontWeight: 800, color: '#111827' }}>Indochina Heritage Voyages</div>
                  <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Representative: Le Hoang Nam</div>
                </div>
                <Link
                  href={`/agency/${agencyId}`}
                  onClick={() => setDropdownOpen(false)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', color: '#111827', textDecoration: 'none', borderBottom: '1px solid #f3f4f6', fontWeight: 600 }}
                >
                  <IconBriefcase size={14} color="#6b7280" />
                  <span>View Enterprise Profile (PRF019)</span>
                </Link>
                <button
                  onClick={() => { setDropdownOpen(false); setAccountModalOpen(true); }}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', background: 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '0.78rem', color: '#111827' }}
                >
                  <IconUser size={14} color="#6b7280" />
                  <span>Personal Account Details (ACC129)</span>
                </button>
                <button
                  onClick={handleLogout}
                  style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', background: 'none', border: 'none', color: '#b91c1c', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}
                >
                  <IconLogout size={14} color="#b91c1c" />
                  <span>Sign Out (AUT026)</span>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Breadcrumb */}
        <div style={{
          background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
          padding: '0.4rem 2rem', fontSize: '0.68rem', fontWeight: 600,
          color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {breadcrumbs || <>HOME / TRAVEL AGENCIES / <span style={{ color: '#111827' }}>INDOCHINA HERITAGE VOYAGES</span></>}
        </div>
      </>
    )
  }

  // =========================================================================
  // LOCAL PROVIDER — Spec: PRF127 / PRF128 / DSH018 / COM065
  // RULE PER USER: When viewing Village profile (or outside main 5 tabs),
  // DO NOT HIGHLIGHT any tab on the navbar!
  // =========================================================================
  const isExperiences = !!pathname?.startsWith(`/provider/${providerId}/experiences`)
  const isMessages = pathname === '/messages'

  const providerNavItems = [
    { label: 'Dashboard', href: '#dashboard', active: false, developed: false, code: 'DSH018' },
    { label: 'Experience Management', href: `/provider/${providerId}/experiences`, active: isExperiences, developed: true, code: '' },
    { label: 'Booking', href: '#booking', active: false, developed: false, code: 'BKG133' },
    { label: 'Schedule', href: '#schedule', active: false, developed: false, code: 'SCH139' },
    { label: 'Messages', href: '/messages', active: isMessages, developed: true, code: '', dot: true },
  ]

  return (
    <>
      <Toast />
      <AccountModal />
      <header style={{
        background: '#ffffff', borderBottom: '1px solid #e5e7eb',
        padding: '0 2rem', display: 'flex', alignItems: 'stretch',
        justifyContent: 'space-between', minHeight: '52px',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingRight: '2rem', flexShrink: 0 }}>
          <Link href={`/village/${villageId}`} style={{ textDecoration: 'none' }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '-0.01em', color: '#111827', lineHeight: 1 }}>
              HANOI ARTISAN BRIDGE
            </div>
            <div style={{ fontSize: '0.6rem', color: '#6b7280', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              LOCAL PROVIDER PORTAL
            </div>
          </Link>
        </div>

        {/* Center Nav — No tab highlighted when viewing Village Profile or Workshop Profile */}
        <nav style={{ display: 'flex', alignItems: 'stretch', flex: 1, justifyContent: 'center' }}>
          {providerNavItems.map((item) => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'stretch' }}>
              {item.developed ? (
                <Link
                  href={item.href}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    padding: '0 0.85rem',
                    fontSize: '0.78rem', fontWeight: item.active ? 800 : 600,
                    color: item.active ? '#111827' : '#6b7280',
                    textDecoration: 'none',
                    borderBottom: item.active ? '2.5px solid #111827' : '2.5px solid transparent',
                    letterSpacing: '0.03em', textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                  {(item as { dot?: boolean }).dot && !isMessages && (
                    <span style={{ color: '#ef4444', fontSize: '0.65rem' }}>●</span>
                  )}
                </Link>
              ) : (
                <a
                  href={item.href}
                  onClick={(e) => handleUndevelopedClick(e, item.label, item.code)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '0 0.85rem',
                    fontSize: '0.78rem', fontWeight: 600, color: '#9ca3af',
                    textDecoration: 'none', cursor: 'pointer',
                    borderBottom: '2.5px solid transparent',
                    textTransform: 'uppercase',
                  }}
                >
                  {item.label}
                </a>
              )}
            </div>
          ))}
        </nav>

        {/* Right: Workshop + Artisan name + Avatar dropdown (ACC129 & PRF127) */}
        <div ref={dropdownRef} style={{ display: 'flex', alignItems: 'center', position: 'relative', flexShrink: 0 }}>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#111827', lineHeight: 1.15, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                <span>HUNG THINH WORKSHOP</span>
                <IconCheck size={11} color="#059669" />
              </div>
              <div style={{ fontSize: '0.66rem', color: '#6b7280' }}>Guild Master / Owner</div>
            </div>
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%', background: '#111827',
              color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 800, fontSize: '0.78rem',
            }}>NH</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: 700, fontSize: '0.78rem', color: '#111827', lineHeight: 1.15, display: 'flex', alignItems: 'center', gap: '2px' }}>
                <span>Nguyen Van Hung</span>
                <IconChevronDown size={11} color="#6b7280" />
              </div>
              <div style={{ fontSize: '0.66rem', color: '#6b7280' }}>Lead Artisan</div>
            </div>
          </div>

          {dropdownOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '48px', width: '270px',
              background: '#ffffff', color: '#111827', border: '1px solid #d1d5db',
              borderRadius: '4px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 9999,
              overflow: 'hidden', fontSize: '0.78rem',
            }}>
              <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e5e7eb' }}>
                <div style={{ fontWeight: 800, color: '#111827' }}>HUNG THINH ARTISAN WORKSHOP</div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>Lead Master: Nguyen Van Hung</div>
              </div>
              <Link
                href={`/provider/${providerId}`}
                onClick={() => setDropdownOpen(false)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', color: '#111827', textDecoration: 'none', borderBottom: '1px solid #f3f4f6', fontWeight: 600 }}
              >
                <IconVase size={14} color="#6b7280" />
                <span>View My Local Provider Profile (PRF127)</span>
              </Link>
              <button
                onClick={() => { setDropdownOpen(false); setAccountModalOpen(true); }}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', background: 'none', border: 'none', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', fontSize: '0.78rem', color: '#111827' }}
              >
                <IconUser size={14} color="#6b7280" />
                <span>Personal Account Details (ACC129)</span>
              </button>
              <button
                onClick={handleLogout}
                style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1rem', background: 'none', border: 'none', color: '#b91c1c', fontWeight: 700, cursor: 'pointer', fontSize: '0.78rem' }}
              >
                <IconLogout size={14} color="#b91c1c" />
                <span>Sign Out (AUT026)</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Breadcrumb */}
      <div style={{
        background: '#f9fafb', borderBottom: '1px solid #e5e7eb',
        padding: '0.4rem 2rem', fontSize: '0.68rem', fontWeight: 600,
        color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em',
      }}>
        {breadcrumbs || <>HOME / PROVIDER PORTAL / <span style={{ color: '#111827' }}>HUNG THINH ARTISAN WORKSHOP</span></>}
      </div>
    </>
  )
}
