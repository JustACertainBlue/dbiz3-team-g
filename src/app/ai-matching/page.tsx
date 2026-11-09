'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { readSessionContext } from '@/lib/auth/client-session'
import { AI_FAILURE_TEXT, HANDOFF_FAILURE_TEXT, handoffOutcome, messageOutcome, noMatchView, understoodDateLine, type ApiResult } from './matching-view'
import { RESTRICTED_TEXT } from './ai-matching-access'

interface Message {
  id: string
  sender: 'Agency' | 'Assistant'
  text: string
  sent_at: string
  dateLine?: string
  clarificationQuestions?: string[]
  recommendations?: any[]
  relaxationLines?: string[]
  retry?: 'reanalyze' | 'resend'
  retryText?: string
}

export default function AiMatchingScreen() {
  const router = useRouter()
  const [role, setRole] = useState<'Agency' | 'Guest'>('Guest')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [agencyId, setAgencyId] = useState<string>('')
  const [inputText, setInputText] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [quoteStatus, setQuoteStatus] = useState<Record<string, string>>({})
  const [chatStatus, setChatStatus] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionInitializationRef = useRef(false)

  useEffect(() => {
    readSessionContext()
      .then(session => {
        if (session.role === 'Tour_Agency' && session.agencyId) {
          setAgencyId(session.agencyId)
          setRole('Agency')
        } else {
          setRole('Guest')
        }
      })
      .catch(() => setRole('Guest'))
  }, [])

  // Create a matching session only after the shared cookie session identifies an Agency.
  useEffect(() => {
    if (role === 'Agency' && agencyId) {
      if (sessionInitializationRef.current) return
      sessionInitializationRef.current = true
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
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
            {RESTRICTED_TEXT}
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <a
              id="switch-to-agency-btn"
              href="/login?next=/ai-matching"
              style={{
                backgroundColor: '#D97706',
                color: '#FFF',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                textDecoration: 'none',
              }}
            >
              Sign In as Agency
            </a>
          </div>
        </div>
      </div>
    )
  }

  const addAssistant = (message: Omit<Message, 'id' | 'sender' | 'sent_at'>) =>
    setMessages(prev => [
      ...prev,
      { id: `assistant-${Date.now()}-${prev.length}`, sender: 'Assistant', sent_at: new Date().toLocaleTimeString(), ...message },
    ])

  const postJson = async (url: string, body: unknown): Promise<ApiResult> => {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) }
    } catch {
      return { networkError: true }
    }
  }

  // Analyze a new Agency message, or on Retry the stored conversation without adding a message (#33).
  const analyze = async (body: Record<string, unknown>) => {
    if (!sessionId) return
    setLoading(true)
    try {
      const result = await postJson(`/api/ait/sessions/${sessionId}/messages`, body)
      const outcome = messageOutcome(result)
      // #156: show the date understood so the Agency can correct it.
      const dateLine = 'body' in result ? understoodDateLine(result.body) ?? undefined : undefined
      if (outcome.kind === 'clarify') {
        addAssistant({ text: 'I need a few more details to find the best craft match for your tour:', clarificationQuestions: outcome.questions, dateLine })
      } else if (outcome.kind === 'match') {
        await fetchMatchingResults(outcome.profile, dateLine)
      } else {
        addAssistant({ text: outcome.text, retry: outcome.retry, retryText: typeof body.text === 'string' ? body.text : undefined })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText
    if (!textToSend.trim() || !sessionId) return

    setMessages(prev => [...prev, { id: `msg-${Date.now()}`, sender: 'Agency', text: textToSend, sent_at: new Date().toLocaleTimeString() }])
    if (!customPrompt) setInputText('')
    await analyze({ sender: 'Agency', text: textToSend })
  }

  /**
   * Calls the real matching pipeline via the server API. A failure shows the #27 message with Retry;
   * no offline or fabricated result is ever shown (FR-003, BR-017).
   */
  const fetchMatchingResults = async (profile: unknown, dateLine?: string) => {
    const result = await postJson('/api/ait/matching', { session_id: sessionId, tour_preference_profile: profile })
    if ('networkError' in result || !result.ok) {
      addAssistant({ text: AI_FAILURE_TEXT, retry: 'reanalyze' })
      return
    }
    const topMatches: any[] = result.body?.top_matches || []
    if (topMatches.length > 0) {
      addAssistant({
        text: 'I have analyzed your tour requirements against verified Local Providers. Here are your ranked recommendations:',
        dateLine,
        recommendations: topMatches.map(m => ({
          experience_id: m.experience_id,
          provider_id: m.provider_id,
          experience_name: m.experience_name || m.name,
          provider_name: m.provider_name,
          village_name: m.village_name,
          rank: m.rank,
          match_score: m.match_score,
          price_per_person: m.price_per_person,
          max_participants: m.max_participants,
          explanation: m.explanation,
        })),
      })
    } else {
      // No candidate reaches the constraints or 60/100 → relaxation suggestions (BR-011, FR-012)
      const view = noMatchView(result.body)
      addAssistant({ text: view.prompt, relaxationLines: view.lines, dateLine })
    }
  }

  // Request Quote / Chat: open Messages (COM048) with the Chat selected only after success (#31).
  const runHandoff = async (kind: 'quote' | 'chat', experienceId: string, statusKey: string) => {
    if (!sessionId) return
    const setStatus = kind === 'quote' ? setQuoteStatus : setChatStatus
    setStatus(prev => ({ ...prev, [statusKey]: kind === 'quote' ? 'Requesting quote…' : 'Opening chat…' }))
    const outcome = handoffOutcome(await postJson(`/api/ait/sessions/${sessionId}/${kind}`, { experience_id: experienceId }))
    if (outcome.kind === 'success') router.push(outcome.navigateTo)
    else setStatus(prev => ({ ...prev, [statusKey]: outcome.text }))
  }

  const handleRequestQuote = (experienceId: string) => runHandoff('quote', experienceId, experienceId)
  const handleChat = (experienceId: string, providerId: string) => runHandoff('chat', experienceId, providerId)

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

        {/* Current organization context comes from the authenticated session. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '12px', color: '#CBD5E1' }}>
            Active Agency: <strong style={{ color: '#F59E0B' }}>{agencyId}</strong>
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

              {/* #156: the date the assistant understood, so the Agency can correct it */}
              {msg.dateLine && (
                <div id="understood-date" style={{ marginTop: '8px', fontSize: '13px', color: '#FCD34D' }}>{msg.dateLine}</div>
              )}

              {/* Relaxation suggestions (BR-011, FR-012, #23, #24) */}
              {msg.relaxationLines && msg.relaxationLines.length > 0 && (
                <ul id="relaxation-suggestions" style={{ margin: '10px 0 0 0', paddingLeft: '18px', fontSize: '13px', color: '#CBD5E1' }}>
                  {msg.relaxationLines.map(line => <li key={line}>{line}</li>)}
                </ul>
              )}

              {/* Temporary AI Failure: Retry re-analyzes the saved conversation (#33) or resends an unsent message (#36) */}
              {msg.retry && (
                <button
                  id="retry-analysis-btn"
                  onClick={() => analyze(msg.retry === 'resend' && msg.retryText ? { sender: 'Agency', text: msg.retryText } : { retry: true })}
                  disabled={loading}
                  style={{ marginTop: '10px', backgroundColor: '#D97706', color: '#FFF', border: 'none', padding: '6px 14px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Retry
                </button>
              )}

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

                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <Link
                            href={`/explore/experiences/${rec.experience_id}`}
                            style={{ color: '#F8FAFC', border: '1px solid #475569', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
                          >
                            View Experience
                          </Link>
                          <Link
                            href={`/explore/providers/${rec.provider_id}`}
                            style={{ color: '#CBD5E1', border: '1px solid #334155', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}
                          >
                            Provider
                          </Link>
                          <button
                            id={`quote-btn-${rec.experience_id}`}
                            onClick={() => handleRequestQuote(rec.experience_id)}
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
                            onClick={() => handleChat(rec.experience_id, rec.provider_id)}
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
                          {quoteStatus[rec.experience_id] === HANDOFF_FAILURE_TEXT ? (
                            <>
                              {HANDOFF_FAILURE_TEXT}{' '}
                              <button className="handoff-retry-btn" onClick={() => handleRequestQuote(rec.experience_id)}>Retry</button>
                            </>
                          ) : quoteStatus[rec.experience_id]}
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
                          {chatStatus[rec.provider_id] === HANDOFF_FAILURE_TEXT ? (
                            <>
                              {HANDOFF_FAILURE_TEXT}{' '}
                              <button className="handoff-retry-btn" onClick={() => handleChat(rec.experience_id, rec.provider_id)}>Retry</button>
                            </>
                          ) : chatStatus[rec.provider_id]}
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
