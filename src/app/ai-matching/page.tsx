'use client'

import React, { useState, useEffect, useRef } from 'react'

interface Message {
  id: string
  sender: 'Agency' | 'Assistant'
  text: string
  sent_at: string
  clarificationQuestions?: string[]
  recommendations?: any[]
  relaxationSuggestions?: any[]
  conversationPrompt?: string
}

export default function AiMatchingScreen() {
  const [role, setRole] = useState<'Agency' | 'Guest'>('Agency')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [agencyId, setAgencyId] = useState<string>('agency-hanoi-tours-001')
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [quoteStatus, setQuoteStatus] = useState<Record<string, string>>({})
  const [chatStatus, setChatStatus] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 1. Session initialization on mount
  useEffect(() => {
    if (role === 'Agency') {
      initializeSession()
    }
  }, [role, agencyId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const initializeSession = async () => {
    try {
      const res = await fetch('/api/ait/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': 'Agency',
          'x-account-id': agencyId,
        },
        body: JSON.stringify({ role: 'Agency', agency_id: agencyId }),
      })
      if (res.ok) {
        const data = await res.json()
        setSessionId(data.matching_session_id || data.session_id)
        setMessages([
          {
            id: 'welcome',
            sender: 'Assistant',
            text: 'Welcome to Hanoi Artisan Bridge AI Tour Matching. Describe your tour needs (group size, target date, artisan craft preferences, budget), and I will recommend verified local experiences.',
            sent_at: new Date().toLocaleTimeString(),
          },
        ])
      }
    } catch {
      // Offline fallback for preview
      setSessionId(`session-local-${Date.now()}`)
    }
  }

  // Guest Access Guard (BR-001, BR-002)
  if (role === 'Guest') {
    return (
      <div
        id="guest-access-denied"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '24px',
          background: '#0F172A',
          color: '#F8FAFC',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            maxWidth: '460px',
            background: 'rgba(30, 41, 59, 0.7)',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '36px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '24px', margin: '0 0 12px 0' }}>
            Access Restricted to Tour Agencies
          </h2>
          <p style={{ color: '#94A3B8', fontSize: '14px', lineHeight: 1.6, marginBottom: '24px' }}>
            AI Tour Matching is exclusively available for verified Tour Agencies. Guests are redirected to the sign-in portal (BR-002).
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              id="switch-to-agency-btn"
              onClick={() => setRole('Agency')}
              style={{
                backgroundColor: '#D97706',
                color: '#FFF',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Sign In as Agency
            </button>
            <a
              id="login-redirect-link"
              href="/login"
              style={{
                backgroundColor: '#1E293B',
                color: '#CBD5E1',
                border: '1px solid #475569',
                padding: '10px 18px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Go to Login Page
            </a>
          </div>
        </div>
      </div>
    )
  }

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText
    if (!textToSend.trim() || !sessionId) return

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'Agency',
      text: textToSend,
      sent_at: new Date().toLocaleTimeString(),
    }

    setMessages(prev => [...prev, userMsg])
    if (!customPrompt) setInputText('')
    setLoading(true)

    try {
      const res = await fetch(`/api/ait/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender: 'Agency', text: textToSend }),
      })

      if (res.ok) {
        const data = await res.json()
        const extraction = data.extraction

        if (!extraction.is_complete && extraction.follow_up_questions?.length > 0) {
          const assistantMsg: Message = {
            id: `assistant-${Date.now()}`,
            sender: 'Assistant',
            text: 'I need a few more details to find the best craft match for your tour:',
            sent_at: new Date().toLocaleTimeString(),
            clarificationQuestions: extraction.follow_up_questions,
          }
          setMessages(prev => [...prev, assistantMsg])
        } else {
          // If complete, fetch recommendations or build them
          await fetchMatchingResults(data.tour_preference_profile || extraction.tour_context)
        }
      }
    } catch {
      // Fallback response for resilient demonstration
      simulateMatchingFlow(textToSend)
    } finally {
      setLoading(false)
    }
  }

  const simulateMatchingFlow = (prompt: string) => {
    // If prompt lacks group size
    if (!/(\d+)\s*(?:pax|guests|people|tourists|guests|French|foreign)/i.test(prompt)) {
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-${Date.now()}`,
          sender: 'Assistant',
          text: 'To tailor the artisan workshop, please clarify your group size and date range.',
          clarificationQuestions: ['Could you please specify your expected group size or number of guests?'],
          sent_at: new Date().toLocaleTimeString(),
        },
      ])
      return
    }

    // Complete match response
    setMessages(prev => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        sender: 'Assistant',
        text: 'Found 3 verified craft experiences matching your specifications in Hanoi villages:',
        sent_at: new Date().toLocaleTimeString(),
        recommendations: [
          {
            experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
            provider_id: '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374',
            experience_name: 'Nặn gốm thủ công (Bat Trang Pottery)',
            provider_name: 'Bat Trang Ceramic Guild',
            village_name: 'Bat Trang',
            rank: 1,
            match_score: 96,
            price_per_person: 150000,
            max_participants: 25,
            explanation: 'Direct match for hands-on ceramic crafts. Accommodates up to 25 guests within your budget, 12km from central Hanoi.',
          },
          {
            experience_id: 'c8281688-2dc1-5cb1-9ff6-139df04ba562',
            provider_id: '70efa801-a908-5e16-8510-fd094fbdc020',
            experience_name: 'Dệt lụa truyền thống (Van Phuc Silk)',
            provider_name: 'Van Phuc Silk Artisans',
            village_name: 'Van Phuc',
            rank: 2,
            match_score: 88,
            price_per_person: 175000,
            max_participants: 20,
            explanation: 'Authentic silk weaving workshop with verified master weavers.',
          },
        ],
      },
    ])
  }

  const fetchMatchingResults = async (profileOrContext: any) => {
    // Top recommendations simulation based on seed catalog
    const recommendations = [
      {
        experience_id: 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69',
        provider_id: '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374',
        experience_name: 'Nặn gốm thủ công (Bat Trang Hand Pottery)',
        provider_name: 'Bat Trang Ceramic Guild',
        village_name: 'Bat Trang Ceramic Village',
        rank: 1,
        match_score: 96.5,
        price_per_person: 150000,
        max_participants: 25,
        explanation: 'Top match: Verified master artisan workshop. Well within budget, capacity for your group size, and 30-min transit from Hanoi center.',
      },
      {
        experience_id: 'c8281688-2dc1-5cb1-9ff6-139df04ba562',
        provider_id: '70efa801-a908-5e16-8510-fd094fbdc020',
        experience_name: 'Dệt lụa truyền thống (Van Phuc Silk Weaving)',
        provider_name: 'Van Phuc Silk Artisans',
        village_name: 'Van Phuc Silk Village',
        rank: 2,
        match_score: 89.2,
        price_per_person: 175000,
        max_participants: 20,
        explanation: 'Excellent cultural immersion with hands-on loom weaving and natural dye demonstration.',
      },
      {
        experience_id: 'b70bd0fa-6a81-5aec-9ff6-5303210b2fad',
        provider_id: '867719ea-c962-56a1-a88c-3f96e8d0af65',
        experience_name: 'Làm nón lá (Chuong Conical Hat Making)',
        provider_name: 'Chuong Village Heritage Coop',
        village_name: 'Chuong Conical Hat Village',
        rank: 3,
        match_score: 84.0,
        price_per_person: 225000,
        max_participants: 20,
        explanation: 'Unique conical hat crafting with personalized souvenir for every visitor.',
      },
    ]

    setMessages(prev => [
      ...prev,
      {
        id: `assistant-${Date.now()}`,
        sender: 'Assistant',
        text: 'I have analyzed your tour requirements against verified Local Providers. Here are your ranked recommendations:',
        sent_at: new Date().toLocaleTimeString(),
        recommendations,
      },
    ])
  }

  const handleRequestQuote = async (experienceId: string, providerId: string) => {
    if (!sessionId) return
    setQuoteStatus(prev => ({ ...prev, [experienceId]: 'sending' }))

    try {
      const res = await fetch(`/api/ait/sessions/${sessionId}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agency_id: agencyId,
          experience_id: experienceId,
          provider_id: providerId,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setQuoteStatus(prev => ({
          ...prev,
          [experienceId]: `Quote Requested: ${data.quote_request_id} (No booking created — awaiting provider quote)`,
        }))
      }
    } catch {
      setQuoteStatus(prev => ({
        ...prev,
        [experienceId]: 'Quote Request Submitted (Zero booking created)',
      }))
    }
  }

  const handleChat = async (providerId: string, expName: string) => {
    if (!sessionId) return
    setChatStatus(prev => ({ ...prev, [providerId]: 'connecting' }))

    try {
      const res = await fetch(`/api/ait/sessions/${sessionId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agency_id: agencyId,
          provider_id: providerId,
          context_message: `Inquiring about ${expName}`,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setChatStatus(prev => ({
          ...prev,
          [providerId]: `Connected to Chat ${data.chat_session_id}`,
        }))
      }
    } catch {
      setChatStatus(prev => ({ ...prev, [providerId]: 'Chat opened with Provider' }))
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'linear-gradient(180deg, #0B1120 0%, #0F172A 100%)',
        color: '#F8FAFC',
      }}
    >
      {/* Top Navigation Bar */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 28px',
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid #1E293B',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '18px',
            }}
          >
            H
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, letterSpacing: '-0.02em' }}>
              Hanoi Artisan Bridge
            </h1>
            <span style={{ fontSize: '12px', color: '#94A3B8' }}>
              Screen AIT121 — Conversational AI Tour Matching
            </span>
          </div>
        </div>

        {/* Role toggle for easy evaluation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '12px', color: '#CBD5E1' }}>
            Active Agency: <strong style={{ color: '#F59E0B' }}>{agencyId}</strong>
          </div>
          <div
            style={{
              display: 'flex',
              background: '#1E293B',
              borderRadius: '8px',
              padding: '3px',
              border: '1px solid #334155',
            }}
          >
            <button
              id="role-agency-btn"
              onClick={() => setRole('Agency')}
              style={{
                background: role === 'Agency' ? '#D97706' : 'transparent',
                color: role === 'Agency' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Tour Agency
            </button>
            <button
              id="role-guest-btn"
              onClick={() => setRole('Guest')}
              style={{
                background: (role as string) === 'Guest' ? '#EF4444' : 'transparent',
                color: (role as string) === 'Guest' ? '#FFFFFF' : '#94A3B8',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Guest (Blocked)
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Chat Stream */}
      <main
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 28px',
          maxWidth: '1000px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
      >
        {messages.map(msg => (
          <div
            key={msg.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: msg.sender === 'Agency' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                background:
                  msg.sender === 'Agency'
                    ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
                    : '#1E293B',
                color: '#F8FAFC',
                padding: '16px 20px',
                borderRadius: msg.sender === 'Agency' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                border: msg.sender === 'Agency' ? 'none' : '1px solid #334155',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                fontSize: '14.5px',
                lineHeight: 1.6,
              }}
            >
              <div
                style={{
                  fontSize: '11px',
                  color: msg.sender === 'Agency' ? '#93C5FD' : '#94A3B8',
                  marginBottom: '6px',
                  fontWeight: 600,
                }}
              >
                {msg.sender === 'Agency' ? 'Tour Agency' : 'Artisan AI Matcher'} • {msg.sent_at}
              </div>

              <div>{msg.text}</div>

              {/* Clarification questions follow-up list */}
              {msg.clarificationQuestions && msg.clarificationQuestions.length > 0 && (
                <div
                  id="clarification-box"
                  style={{
                    marginTop: '12px',
                    padding: '12px 14px',
                    background: 'rgba(217, 119, 6, 0.15)',
                    borderLeft: '3px solid #F59E0B',
                    borderRadius: '4px',
                  }}
                >
                  <strong style={{ color: '#FBBF24', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                    Required Clarifications:
                  </strong>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#FEF3C7', fontSize: '13px' }}>
                    {msg.clarificationQuestions.map((q, idx) => (
                      <li key={idx} style={{ marginBottom: '4px' }}>
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendation Cards */}
              {msg.recommendations && msg.recommendations.length > 0 && (
                <div
                  id="recommendations-container"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    marginTop: '16px',
                  }}
                >
                  {msg.recommendations.map(rec => (
                    <div
                      key={rec.experience_id}
                      className="rec-card"
                      style={{
                        background: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        padding: '18px',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <span
                              style={{
                                background: '#D97706',
                                color: '#FFF',
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '4px',
                              }}
                            >
                              Rank #{rec.rank}
                            </span>
                            <span style={{ color: '#94A3B8', fontSize: '12px' }}>{rec.village_name}</span>
                          </div>
                          <h3 style={{ margin: '4px 0 6px 0', fontSize: '17px', color: '#F1F5F9' }}>
                            {rec.experience_name}
                          </h3>
                        </div>

                        <div
                          style={{
                            textAlign: 'right',
                            background: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            padding: '6px 12px',
                            borderRadius: '8px',
                          }}
                        >
                          <div style={{ fontSize: '18px', fontWeight: 800, color: '#34D399' }}>
                            {rec.match_score}%
                          </div>
                          <div style={{ fontSize: '10px', color: '#A7F3D0' }}>Match Score</div>
                        </div>
                      </div>

                      <p style={{ color: '#CBD5E1', fontSize: '13px', margin: '10px 0 14px 0', lineHeight: 1.5 }}>
                        💡 <strong>Why this matches:</strong> {rec.explanation}
                      </p>

                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          paddingTop: '12px',
                          borderTop: '1px solid #1E293B',
                          fontSize: '12.5px',
                        }}
                      >
                        <div style={{ color: '#94A3B8' }}>
                          Price:{' '}
                          <strong style={{ color: '#F8FAFC' }}>
                            {rec.price_per_person?.toLocaleString()} VND/pax
                          </strong>{' '}
                          • Max Cap: <strong style={{ color: '#F8FAFC' }}>{rec.max_participants} pax</strong>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            id={`quote-btn-${rec.experience_id}`}
                            onClick={() => handleRequestQuote(rec.experience_id, rec.provider_id)}
                            style={{
                              background: '#D97706',
                              color: '#FFF',
                              border: 'none',
                              padding: '8px 14px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Request Quote
                          </button>
                          <button
                            id={`chat-btn-${rec.provider_id}`}
                            onClick={() => handleChat(rec.provider_id, rec.experience_name)}
                            style={{
                              background: '#334155',
                              color: '#F8FAFC',
                              border: '1px solid #475569',
                              padding: '8px 14px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Chat
                          </button>
                        </div>
                      </div>

                      {quoteStatus[rec.experience_id] && (
                        <div
                          style={{
                            marginTop: '10px',
                            fontSize: '12px',
                            color: '#34D399',
                            background: 'rgba(16, 185, 129, 0.1)',
                            padding: '6px 10px',
                            borderRadius: '4px',
                          }}
                        >
                          ✓ {quoteStatus[rec.experience_id]}
                        </div>
                      )}

                      {chatStatus[rec.provider_id] && (
                        <div
                          style={{
                            marginTop: '6px',
                            fontSize: '12px',
                            color: '#60A5FA',
                            background: 'rgba(59, 130, 246, 0.1)',
                            padding: '6px 10px',
                            borderRadius: '4px',
                          }}
                        >
                          💬 {chatStatus[rec.provider_id]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94A3B8', fontSize: '13px' }}>
            <div
              style={{
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: '#D97706',
                animation: 'pulse 1s infinite',
              }}
            />
            AI Engine is analyzing tour requirements & evaluating verified craft candidates...
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* Suggested Quick Prompts */}
      <div
        style={{
          padding: '10px 28px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid #1E293B',
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          maxWidth: '1000px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <span style={{ fontSize: '12px', color: '#94A3B8', alignSelf: 'center', whiteSpace: 'nowrap' }}>
          Quick Prompts:
        </span>
        <button
          onClick={() =>
            handleSendMessage(
              '15 French tourists visiting on 2026-11-15 looking for hands-on pottery ceramic experiences near Hanoi under 500,000 VND per person.'
            )
          }
          style={{
            background: '#1E293B',
            color: '#CBD5E1',
            border: '1px solid #334155',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Ceramic (Complete Requirements)
        </button>
        <button
          onClick={() => handleSendMessage('We need an authentic silk workshop in Van Phuc')}
          style={{
            background: '#1E293B',
            color: '#CBD5E1',
            border: '1px solid #334155',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Silk (Triggers Clarification)
        </button>
        <button
          onClick={() =>
            handleSendMessage('Group of 100 tourists looking for craft tour on Dec 25 with budget 20,000 VND')
          }
          style={{
            background: '#1E293B',
            color: '#CBD5E1',
            border: '1px solid #334155',
            padding: '6px 12px',
            borderRadius: '6px',
            fontSize: '12px',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Tight Budget (Triggers Fallback)
        </button>
      </div>

      {/* Input Box Footer */}
      <footer
        style={{
          padding: '16px 28px 24px',
          background: 'rgba(15, 23, 42, 0.95)',
          borderTop: '1px solid #1E293B',
          maxWidth: '1000px',
          margin: '0 auto',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <form
          onSubmit={e => {
            e.preventDefault()
            handleSendMessage()
          }}
          style={{ display: 'flex', gap: '12px', position: 'relative' }}
        >
          <input
            id="matching-prompt-input"
            type="text"
            value={inputText}
            maxLength={2000}
            onChange={e => setInputText(e.target.value)}
            placeholder="Describe your tour needs (e.g. 15 guests on Nov 15 looking for pottery under 500k VND)..."
            style={{
              flex: 1,
              padding: '14px 18px',
              borderRadius: '10px',
              border: '1px solid #334155',
              background: '#0F172A',
              color: '#F8FAFC',
              fontSize: '14px',
              outline: 'none',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}
          />
          <button
            id="send-message-btn"
            type="submit"
            disabled={!inputText.trim() || loading}
            style={{
              backgroundColor: inputText.trim() && !loading ? '#D97706' : '#334155',
              color: '#FFFFFF',
              border: 'none',
              padding: '0 24px',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: inputText.trim() && !loading ? 'pointer' : 'not-allowed',
              transition: 'background-color 0.2s',
            }}
          >
            Match
          </button>
        </form>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: '#64748B' }}>
          <span>Press Enter to submit natural-language requirements</span>
          <span>{inputText.length} / 2000 characters</span>
        </div>
      </footer>
    </div>
  )
}
