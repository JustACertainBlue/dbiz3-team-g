'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'
import RoleNavbar from '@/app/components/RoleNavbar'
import { IconPin, IconPhoto, IconCalendar, IconChat, IconSparkles, IconFileText } from '@/app/components/Icons'

// AIT121 — AI Tour Matching screen
// Layout: Left sidebar (session history) + Main chat area with AI match result cards

interface SessionItem {
  id: string
  title: string
  tags: string
  time?: string
  sessionId: string
}

interface MatchResult {
  rank: number
  score: number
  label: string
  rateVND: number
  name: string
  location: string
  distance: string
  rationale: string
  providerId?: string
}

interface ChatMessage {
  id: string
  role: 'ai' | 'user'
  time: string
  text?: string
  matches?: MatchResult[]
  quickActions?: string[]
}

const agencyId = '5fecc699-71e4-5bf0-ac1b-2090e05c2cd9'
const provider1Id = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'

const todaySessions: SessionItem[] = [
  { id: 's1', title: '14 Pax French Delegation', tags: 'Ceramics & Silk · 09:15 AM', time: '09:15 AM', sessionId: '#AIM-8409' },
]
const prev7Sessions: SessionItem[] = [
  { id: 's2', title: '8 Pax Swiss VIP Eco-Tour', tags: 'Ha Thai Lacquer & Natural Pigment', sessionId: '#AIM-8401' },
  { id: 's3', title: '25 Pax High School Excursion', tags: 'Bat Trang Kiln · Clay Throwing', sessionId: '#AIM-8398' },
  { id: 's4', title: '18 Pax German Architecture Guild', tags: 'Traditional Timber Joinery · Chang Son', sessionId: '#AIM-8391' },
]
const prev30Sessions: SessionItem[] = [
  { id: 's5', title: '6 Pax Michelin Chef Sourcing', tags: 'Van Phuc Silk & Cu Da Vermicelli', sessionId: '#AIM-8370' },
  { id: 's6', title: '4 Pax Tokyo Design Biennial', tags: 'Dinh Cong Filigree Silver Craft', sessionId: '#AIM-8352' },
  { id: 's7', title: '12 Pax British Council Arts Tour', tags: 'Phu Vinh Bamboo Weaving', sessionId: '#AIM-8341' },
]

const initialMessages: ChatMessage[] = [
  {
    id: 'm1',
    role: 'ai',
    time: '09:14 AM',
    text: 'Hello Indochina Heritage Voyages dispatch team. Describe your planned group, cultural preferences, target budget, or schedule. I will analyze verified master workshop availability, route transit logistics, and certified artisan capacity in real-time.',
  },
  {
    id: 'm2',
    role: 'user',
    time: '09:15 AM',
    text: 'We have a high-end cultural delegation from France (14 pax including 2 tour directors) visiting Hanoi on next Thursday. They want an authentic morning hands-on craft session with a certified master, followed by a traditional tea ceremony. Preference for ceramics or silk weaving, total travel time under 45 mins from Old Quarter. Budget around ₫350,000 – ₫500,000 per pax.',
  },
  {
    id: 'm3',
    role: 'ai',
    time: '09:15 AM',
    text: 'I have analyzed 18 active workshops and transit routes. Here are the top 3 verified matches based on your criteria (14 pax, <45m transit, ₫350k-500k budget):',
    matches: [
      {
        rank: 1, score: 98, label: 'BEST FIT', rateVND: 320000,
        name: 'Master Hung Imperial Pottery Atelier & Ancient Kiln',
        location: 'Bat Trang Pottery Village', distance: '13.2 km (28 mins from Hoan Kiem)',
        rationale: 'Certified 4th-gen master available Thursday morning. Dedicated 14-pax foot-pedal wheels, private lotus tea pavilion in ancestral courtyard. 45-seat coach turnaround confirmed.',
        providerId: provider1Id,
      },
      {
        rank: 2, score: 94, label: 'HIGH CULTURAL AFFINITY', rateVND: 380000,
        name: 'Van Phuc Imperial Jacquard Silk & Natural Botanical Dye',
        location: 'Van Phuc Silk Village', distance: '15.8 km (38 mins from Hoan Kiem)',
        rationale: 'Bilingual French/English docent confirmed on-site. Hands-on 19th-century shuttle loom weaving & organic indigo cold-vat dyeing. Fits within ₫380,000/pax budget.',
      },
      {
        rank: 3, score: 91, label: 'ALTERNATIVE OPTION', rateVND: 680000,
        name: 'Twin Heritage Trail: Bat Trang Pottery + Red River Lacquer Miniature',
        location: 'Bat Trang & Duyen Thai Corridor', distance: '45 mins transit leg',
        rationale: 'Extended morning-afternoon hybrid route with private farmhouse lunch. Slightly exceeds single-workshop budget at ₫680,000/pax, but provides comprehensive dual-guild exposure.',
      },
    ],
    quickActions: ['Select Option 1 (Pottery)', 'Select Option 2 (Silk)', 'Adjust Transit Limit'],
  },
]

export default function AIMatchingPage() {
  const [role, setRole] = useState<CurrentUserRole>('TourAgency')
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [inputText, setInputText] = useState('')
  const [activeSession, setActiveSession] = useState('s1')
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setRole(getCurrentRole())
    const onRoleChanged = () => setRole(getCurrentRole())
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!inputText.trim()) return
    const userMsg: ChatMessage = {
      id: `m${Date.now()}`,
      role: 'user',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      text: inputText,
    }
    setMessages(prev => [...prev, userMsg])
    setInputText('')

    // Simulate AI response
    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `m${Date.now() + 1}`,
        role: 'ai',
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        text: 'Understood. Refining search based on your updated criteria. Analyzing alternative workshop availability and adjusted transit corridors...',
      }
      setMessages(prev => [...prev, aiMsg])
    }, 900)
  }

  const handleQuickAction = (action: string) => {
    setInputText(action)
  }

  const formatRate = (vnd: number) => `₫${vnd.toLocaleString('vi-VN')}` 

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#f9fafb', minHeight: '100vh', display: 'flex', flexDirection: 'column',
    }}>
      <RoleNavbar
        agencyId={agencyId}
        breadcrumbs={<>B2B DISCOVERY / AI MATCHING / <strong>SESSION #AIM-8409</strong></>}
      />

      {/* Main body: sidebar + chat */}
      <div style={{ display: 'flex', flex: 1, height: 'calc(100vh - 80px)' }}>

        {/* LEFT SIDEBAR — Session history */}
        <div style={{
          width: '248px', flexShrink: 0, background: '#ffffff',
          borderRight: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column',
        }}>
          {/* New Tour Inquiry button */}
          <div style={{ padding: '0.85rem 1rem', borderBottom: '1px solid #e5e7eb' }}>
            <button style={{
              width: '100%', background: '#111827', color: '#ffffff',
              border: 'none', padding: '0.65rem 1rem', borderRadius: '3px',
              fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}>
              + New Tour Inquiry
            </button>
          </div>

          {/* Search */}
          <div style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid #e5e7eb' }}>
            <input
              type="text"
              placeholder="Search inquiry history..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.4rem 0.65rem', border: '1px solid #e5e7eb', borderRadius: '3px',
                fontSize: '0.78rem', color: '#111827', background: '#f9fafb',
              }}
            />
          </div>

          {/* Session list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 0' }}>
            {/* TODAY */}
            <div style={{ padding: '0.5rem 0.85rem 0.25rem', fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              TODAY
            </div>
            {todaySessions.map(s => (
              <div
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                style={{
                  padding: '0.6rem 0.85rem', cursor: 'pointer',
                  background: activeSession === s.id ? '#f3f4f6' : 'transparent',
                  borderLeft: activeSession === s.id ? '2px solid #111827' : '2px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>{s.title}</span>
                  {activeSession === s.id && (
                    <span style={{ width: '7px', height: '7px', background: '#111827', borderRadius: '50%', flexShrink: 0 }} />
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.15rem' }}>{s.tags}</div>
                <div style={{ fontSize: '0.68rem', color: '#9ca3af', marginTop: '0.1rem' }}>{s.sessionId}</div>
              </div>
            ))}

            {/* PREVIOUS 7 DAYS */}
            <div style={{ padding: '0.65rem 0.85rem 0.25rem', fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              PREVIOUS 7 DAYS
            </div>
            {prev7Sessions.map(s => (
              <div
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                style={{
                  padding: '0.55rem 0.85rem', cursor: 'pointer',
                  background: activeSession === s.id ? '#f3f4f6' : 'transparent',
                  borderLeft: activeSession === s.id ? '2px solid #111827' : '2px solid transparent',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#111827' }}>{s.title}</div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.1rem' }}>{s.tags}</div>
              </div>
            ))}

            {/* PREVIOUS 30 DAYS */}
            <div style={{ padding: '0.65rem 0.85rem 0.25rem', fontSize: '0.65rem', fontWeight: 800, color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              PREVIOUS 30 DAYS
            </div>
            {prev30Sessions.map(s => (
              <div
                key={s.id}
                onClick={() => setActiveSession(s.id)}
                style={{
                  padding: '0.55rem 0.85rem', cursor: 'pointer',
                  background: activeSession === s.id ? '#f3f4f6' : 'transparent',
                  borderLeft: activeSession === s.id ? '2px solid #111827' : '2px solid transparent',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.8rem', color: '#111827' }}>{s.title}</div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '0.1rem' }}>{s.tags}</div>
              </div>
            ))}
          </div>

          {/* Collapse button */}
          <div style={{ padding: '0.5rem', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: '0.8rem' }}>«</button>
          </div>
        </div>

        {/* MAIN CHAT AREA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Session header */}
          <div style={{
            background: '#ffffff', borderBottom: '1px solid #e5e7eb',
            padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>
                  14 Pax French Delegation · Morning Slot
                </span>
                <span style={{
                  background: '#f3f4f6', border: '1px solid #e5e7eb',
                  padding: '2px 8px', borderRadius: '2px', fontSize: '0.68rem', fontWeight: 700, color: '#374151',
                }}>Session #AIM-8409</span>
                <span style={{
                  background: '#111827', color: '#ffffff',
                  padding: '2px 8px', borderRadius: '2px', fontSize: '0.68rem', fontWeight: 700,
                }}>Craft Intent Engine v4.2</span>
              </div>
              <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '0.2rem' }}>
                Natural language matching active · Certified Master Atelier Quotas synchronized
              </div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {messages.map(msg => (
              <div key={msg.id}>
                {msg.role === 'ai' ? (
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                    {/* AI avatar */}
                    <div style={{
                      width: '30px', height: '30px', borderRadius: '50%',
                      background: '#111827', color: '#ffffff', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 800, flexShrink: 0,
                    }}>AI</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.4rem', fontWeight: 700 }}>
                        HANOI ARTISAN ASSISTANT &nbsp; {msg.time}
                      </div>
                      {msg.text && (
                        <div style={{
                          background: '#ffffff', border: '1px solid #e5e7eb',
                          padding: '1rem 1.25rem', borderRadius: '0 6px 6px 6px',
                          fontSize: '0.87rem', lineHeight: 1.6, color: '#111827',
                          marginBottom: msg.matches ? '1rem' : 0,
                        }}>
                          {msg.text}
                        </div>
                      )}

                      {/* Match result cards */}
                      {msg.matches && msg.matches.map(match => (
                        <div key={match.rank} style={{
                          background: '#ffffff', border: match.rank === 1 ? '2px solid #111827' : '1px solid #e5e7eb',
                          borderRadius: '4px', padding: '1.15rem 1.25rem', marginBottom: '0.75rem',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                              <span style={{
                                background: '#111827', color: '#ffffff',
                                padding: '2px 8px', fontSize: '0.68rem', fontWeight: 800, borderRadius: '2px',
                              }}>{match.score}% MATCH</span>
                              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }}>
                                {match.label}
                              </span>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase' as const }}>TARIFF</div>
                              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827' }}>{formatRate(match.rateVND)}</div>
                              <div style={{ fontSize: '0.68rem', color: '#6b7280' }}>/ pax</div>
                            </div>
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '1rem', alignItems: 'start' }}>
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827', marginBottom: '0.25rem' }}>
                                {match.name}
                              </div>
                              <div style={{ fontSize: '0.78rem', color: '#6b7280', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <IconPin size={13} color="#6b7280" />
                                <span>{match.location} · {match.distance}</span>
                              </div>
                              <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '0.04em', marginBottom: '0.25rem' }}>
                                MATCH RATIONALE
                              </div>
                              <div style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.5 }}>
                                {match.rationale}
                              </div>
                            </div>
                            {/* Placeholder image */}
                            <div style={{
                              width: '140px', background: '#f3f4f6', border: '1px solid #e5e7eb',
                              aspectRatio: '4/3', display: 'flex', flexDirection: 'column',
                              alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.65rem', color: '#9ca3af', textAlign: 'center', padding: '0.5rem',
                              flexShrink: 0,
                            }}>
                              <IconPhoto size={24} color="#9ca3af" />
                              <span style={{ marginTop: '0.25rem' }}>[ ATELIER PREVIEW ]</span>
                            </div>
                          </div>

                          {/* Action buttons */}
                          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' as const }}>
                            <button style={{
                              background: '#111827', color: '#ffffff', border: 'none',
                              padding: '0.45rem 0.9rem', borderRadius: '3px',
                              fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '0.4rem',
                            }}>
                              <IconCalendar size={13} color="#ffffff" />
                              <span>Check Availability Now</span>
                            </button>
                            <button style={{
                              background: '#ffffff', color: '#111827', border: '1px solid #d1d5db',
                              padding: '0.45rem 0.9rem', borderRadius: '3px',
                              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                            }}>
                              View Experience Detail ↗
                            </button>
                            <button style={{
                              background: '#ffffff', color: '#111827', border: '1px solid #d1d5db',
                              padding: '0.45rem 0.9rem', borderRadius: '3px',
                              fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                            }}>
                              Request Custom Quote
                            </button>
                            <Link
                              href="/messages"
                              style={{
                                background: '#ffffff', color: '#111827', border: '1px solid #d1d5db',
                                padding: '0.45rem 0.9rem', borderRadius: '3px',
                                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                              }}
                            >
                              <IconChat size={13} color="#111827" />
                              <span>Chat</span>
                            </Link>
                          </div>
                        </div>
                      ))}

                      {/* Quick actions */}
                      {msg.quickActions && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.72rem', color: '#6b7280', fontWeight: 600 }}>Quick Actions:</span>
                          {msg.quickActions.map(action => (
                            <button
                              key={action}
                              onClick={() => handleQuickAction(action)}
                              style={{
                                background: '#ffffff', border: '1px solid #d1d5db',
                                padding: '0.3rem 0.75rem', borderRadius: '3px',
                                fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#374151',
                              }}
                            >
                              {action}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* User message */
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', alignItems: 'flex-start' }}>
                    <div style={{ maxWidth: '70%' }}>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.35rem', textAlign: 'right', fontWeight: 600 }}>
                        {msg.time} &nbsp; IH VOYAGES (DISPATCH)
                      </div>
                      <div style={{
                        background: '#1e293b', color: '#ffffff',
                        padding: '1rem 1.25rem', borderRadius: '6px 0 6px 6px',
                        fontSize: '0.87rem', lineHeight: 1.6,
                      }}>
                        {msg.text}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input area */}
          <div style={{ background: '#ffffff', borderTop: '1px solid #e5e7eb', padding: '1rem 1.5rem' }}>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
              placeholder="Add specific dietary, mobility, or VIP requirements (e.g., French speaking guide needed, wheelchair access, gluten-free tea snacks)..."
              rows={3}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1px solid #e5e7eb', borderRadius: '4px',
                padding: '0.75rem 1rem', fontSize: '0.87rem',
                resize: 'none', fontFamily: 'inherit', color: '#111827',
                background: '#fafaf9', marginBottom: '0.6rem',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '1rem', color: '#9ca3af', fontSize: '0.85rem', alignItems: 'center' }}>
                <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', display: 'flex', alignItems: 'center' }} title="Attach Document">
                  <IconFileText size={16} color="#9ca3af" />
                </button>
                <span style={{ fontSize: '0.72rem', color: '#9ca3af', alignSelf: 'center' }}>Press Enter ↵ to send</span>
              </div>
              <button
                onClick={handleSend}
                style={{
                  background: '#111827', color: '#ffffff', border: 'none',
                  padding: '0.55rem 1.5rem', borderRadius: '3px',
                  fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                }}
              >
                Send →
              </button>
            </div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.68rem', color: '#9ca3af', textAlign: 'center' }}>
              AI Assistant synchronized with Hanoi Craft Federation Quotas &nbsp;·&nbsp; Session #AIM-8409
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        background: '#ffffff', borderTop: '1px solid #e5e7eb',
        padding: '0.85rem 2rem', display: 'flex', justifyContent: 'space-between',
        fontSize: '0.72rem', color: '#6b7280',
      }}>
        <span>© 2025 Hanoi Artisan Bridge. Official B2B Gateway. &nbsp;|&nbsp; Ministry of Culture &amp; Tourism Certified</span>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>Operator Compliance</Link>
          <Link href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>Master Village Codex</Link>
          <Link href="#" style={{ color: '#6b7280', textDecoration: 'none' }}>B2B Desk / Dispatch Support</Link>
        </div>
      </div>
    </div>
  )
}
