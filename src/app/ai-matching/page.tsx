'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { readSessionContext } from '@/lib/auth/client-session'
import { AI_FAILURE_TEXT, HANDOFF_FAILURE_TEXT, handoffOutcome, matchResultsView, messageOutcome, noMatchView, understoodDateLine, type ApiResult } from './matching-view'
import { RESTRICTED_TEXT } from './ai-matching-access'
import './ai-matching.css'

interface Message {
  id: string
  sender: 'Agency' | 'Assistant'
  text: string
  sent_at: string
  dateLine?: string
  clarificationQuestions?: string[]
  recommendations?: any[]
  additionalSuggestions?: any[] // FR-008 (#188): up to 5 after the Top 5
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
  const [quotaInfo, setQuotaInfo] = useState<{ in_cooldown: boolean; remaining_seconds?: number } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const sessionInitializationRef = useRef(false)

  useEffect(() => {
    fetch('/api/ait/quota')
      .then(res => res.json())
      .then(data => {
        if (data.in_cooldown) setQuotaInfo(data)
      })
      .catch(() => {})
  }, [])

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
    const lastMsg = messages[messages.length - 1]
    if (lastMsg && lastMsg.sender === 'Assistant' && lastMsg.recommendations && lastMsg.recommendations.length > 0) {
      // UX Fix: Khi có kết quả matching, cuộn đến đầu tin nhắn AI để hiện ngay Đề xuất #1, không bị trôi xuống đáy
      const timer = setTimeout(() => {
        const el = document.getElementById(lastMsg.id)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      }, 50)
      return () => clearTimeout(timer)
    }
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
      const conversationalReply = 'body' in result && result.body && typeof result.body === 'object' && 'conversational_reply' in result.body
        ? String((result.body as Record<string, unknown>).conversational_reply || '')
        : undefined
      if (outcome.kind === 'guidance') {
        addAssistant({ text: outcome.reply })
      } else if (outcome.kind === 'clarify') {
        addAssistant({
          text: conversationalReply || 'I need a few more details to find the best craft match for your tour:',
          clarificationQuestions: outcome.questions,
          dateLine,
        })
      } else if (outcome.kind === 'match') {
        await fetchMatchingResults(outcome.profile, dateLine, conversationalReply)
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
  const fetchMatchingResults = async (profile: unknown, dateLine?: string, customIntro?: string) => {
    const result = await postJson('/api/ait/matching', { session_id: sessionId, tour_preference_profile: profile })
    if ('networkError' in result || !result.ok) {
      addAssistant({ text: AI_FAILURE_TEXT, retry: 'reanalyze' })
      return
    }
    const { top: topMatches, additional } = matchResultsView(result.body)
    if (topMatches.length > 0) {
      addAssistant({
        text: customIntro || 'I have analyzed your tour requirements against verified Local Providers. Here are your ranked recommendations:',
        dateLine,
        recommendations: topMatches,
        additionalSuggestions: additional,
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
    <div className="ait-container">
      {/* SIDEBAR BÊN TRÁI: LỊCH SỬ YÊU CẦU TOUR (Ảnh 2) */}
      <aside className="ait-sidebar">
        <button
          type="button"
          className="ait-btn-new-tour"
          onClick={() => {
            setMessages([
              {
                id: `welcome-${Date.now()}`,
                sender: 'Assistant',
                text: 'Xin chào đội điều phối tour. Hãy mô tả đoàn dự kiến, sở thích văn hoá, ngân sách hoặc lịch trình. Tôi sẽ phân tích lịch trống của các xưởng bậc thầy đã xác minh, lộ trình di chuyển và hạn mức nghệ nhân chứng nhận theo thời gian thực.',
                sent_at: new Date().toLocaleTimeString(),
              },
            ])
            setInputText('')
          }}
        >
          <span>+ Yêu cầu tour mới</span>
        </button>

        <div className="ait-search-wrap">
          <span className="ait-search-icon">🔍</span>
          <input
            type="text"
            className="ait-search-input"
            placeholder="Tìm lịch sử yêu cầu..."
          />
        </div>

        <div className="ait-sidebar-history">
          <div className="ait-history-group">
            <div className="ait-history-label">HÔM NAY</div>
            <div className="ait-history-list">
              <div className="ait-history-item active">
                <div className="ait-history-item-title">
                  <span>Đoàn Pháp 14 khách</span>
                  <span className="ait-status-dot" />
                </div>
                <div className="ait-history-item-sub">Gốm & lụa · 09:15 · #AIM-8409</div>
              </div>
              <div className="ait-history-item">
                <div className="ait-history-item-title">
                  <span>Eco-tour VIP Thụy Sĩ 8 khách</span>
                </div>
                <div className="ait-history-item-sub">Sơn mài & mây tự nhiên Hạ Thái · 08:10</div>
              </div>
            </div>
          </div>

          <div className="ait-history-group">
            <div className="ait-history-label">7 NGÀY TRƯỚC</div>
            <div className="ait-history-list">
              <div className="ait-history-item">
                <div className="ait-history-item-title">
                  <span>Đoàn học sinh 25 khách</span>
                </div>
                <div className="ait-history-item-sub">Lò gốm Bát Tràng · Nặn đất sét</div>
              </div>
              <div className="ait-history-item">
                <div className="ait-history-item-title">
                  <span>Hội kiến trúc Đức 18 khách</span>
                </div>
                <div className="ait-history-item-sub">Mộc truyền thống · Chàng Sơn</div>
              </div>
              <div className="ait-history-item">
                <div className="ait-history-item-title">
                  <span>Đầu bếp Michelin 6 khách</span>
                </div>
                <div className="ait-history-item-sub">Lụa Vạn Phúc & bún Cự Đà</div>
              </div>
            </div>
          </div>

          <div className="ait-history-group">
            <div className="ait-history-label">30 NGÀY TRƯỚC</div>
            <div className="ait-history-list">
              <div className="ait-history-item">
                <div className="ait-history-item-title">
                  <span>Triển lãm thiết kế Tokyo 4 khách</span>
                </div>
                <div className="ait-history-item-sub">Bạc chạm Định Công</div>
              </div>
              <div className="ait-history-item">
                <div className="ait-history-item-title">
                  <span>Hội đồng Anh 12 khách</span>
                </div>
                <div className="ait-history-item-sub">Mây tre đan Phú Vinh</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* KHUNG CHAT & ĐỀ XUẤT MATCHING BÊN PHẢI (FULL WIDTH) */}
      <section className="ait-main-chat">
        {/* HEADER KHUNG CHAT */}
        <header className="ait-chat-header">
          <div>
            <div className="ait-header-title-row">
              <h1 className="ait-header-h1">AI Tour Matching</h1>
              <span className="ait-badge-pill ait-badge-session">Phiên AIM-8409</span>
              <span className="ait-badge-pill ait-badge-tool">Công cụ ý định nghề v4.2</span>
              {quotaInfo?.in_cooldown && (
                <span className="ait-badge-pill" style={{ backgroundColor: '#FEF3C7', color: '#92400E', border: '1px solid #FCD34D' }}>
                  🛡️ Bảo vệ hạn ngạch (Rule-based)
                </span>
              )}
            </div>
            <p className="ait-header-sub">
              Ghép bằng ngôn ngữ tự nhiên đang bật · Hạn mức xưởng chứng nhận đã đồng bộ
            </p>
          </div>
        </header>

        {/* VÙNG DANH SÁCH TIN NHẮN */}
        <main className="ait-messages-stream">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={msg.sender === 'Agency' ? 'ait-msg-agency' : 'ait-msg-assistant'}
            >
              {msg.sender === 'Assistant' ? (
                <>
                  <div className="ait-assistant-header">
                    <span className="ait-assistant-avatar">AI</span>
                    <span className="ait-assistant-name">TRỢ LÝ HANOI ARTISAN · {msg.sent_at}</span>
                  </div>
                  <div className="ait-assistant-bubble">
                    <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>

                    {/* #156: Ngày được trợ lý nhận diện */}
                    {msg.dateLine && (
                      <div id="understood-date" style={{ marginTop: '8px', fontSize: '13px', color: '#166534', fontWeight: 600 }}>
                        {msg.dateLine}
                      </div>
                    )}

                    {/* Gợi ý nới lỏng tiêu chí khi no-match */}
                    {msg.relaxationLines && msg.relaxationLines.length > 0 && (
                      <ul id="relaxation-suggestions" style={{ margin: '10px 0 0 0', paddingLeft: '18px', fontSize: '13px', color: '#B45309' }}>
                        {msg.relaxationLines.map(line => <li key={line}>{line}</li>)}
                      </ul>
                    )}

                    {/* Nút Retry khi AI tạm gián đoạn */}
                    {msg.retry && (
                      <button
                        id="retry-analysis-btn"
                        onClick={() => analyze(msg.retry === 'resend' && msg.retryText ? { sender: 'Agency', text: msg.retryText } : { retry: true })}
                        disabled={loading}
                        className="ait-btn-primary"
                        style={{ marginTop: '10px' }}
                      >
                        Thử lại
                      </button>
                    )}

                    {/* Hộp câu hỏi làm rõ */}
                    {msg.clarificationQuestions && msg.clarificationQuestions.length > 0 && (
                      <div
                        id="clarification-box"
                        style={{
                          marginTop: '12px',
                          padding: '12px 14px',
                          backgroundColor: '#FFFBEB',
                          borderLeft: '3px solid #D97706',
                          borderRadius: '6px',
                        }}
                      >
                        <strong style={{ color: '#92400E', fontSize: '13px', display: 'block', marginBottom: '6px' }}>
                          Cần bổ sung thêm thông tin cốt lõi:
                        </strong>
                        <ul style={{ margin: 0, paddingLeft: '18px', color: '#78350F', fontSize: '13px' }}>
                          {msg.clarificationQuestions.map((q, idx) => (
                            <li key={idx} style={{ marginBottom: '4px' }}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* DANH SÁCH THẺ ĐỀ XUẤT */}
                    {msg.recommendations && msg.recommendations.length > 0 && (
                      <div id="recommendations-container" style={{ marginTop: '16px' }}>
                        {[...msg.recommendations, ...(msg.additionalSuggestions ?? [])].map((rec, index) => (
                          <React.Fragment key={rec.experience_id}>
                            {index === msg.recommendations!.length && (
                              <h4 style={{ margin: '16px 0 8px', fontSize: '14px', color: '#4B5563', fontWeight: 700 }}>
                                Gợi ý thêm
                              </h4>
                            )}
                            <div className="rec-card">
                              <div className="rec-card-header">
                                <div className="rec-card-badges">
                                  <span className="rec-badge-score">{rec.match_score}% PHÙ HỢP</span>
                                  <span className="rec-badge-tag">{index === 0 ? 'ĐỀ XUẤT TỐT NHẤT' : 'GẮN VỚI VĂN HOÁ CAO'}</span>
                                </div>
                                <div className="rec-card-price">
                                  <div className="rec-price-label">GIÁ B2B</div>
                                  <div className="rec-price-value">
                                    {rec.price_per_person?.toLocaleString()} đ <span style={{ fontSize: '12px', fontWeight: 400, color: '#6B7280' }}>/ khách</span>
                                  </div>
                                </div>
                              </div>

                              <h3 className="rec-card-title">{rec.experience_name}</h3>
                              <p className="rec-card-location">
                                📍 Làng {rec.village_name} · {rec.distance_km ? `${rec.distance_km} km` : '13,2 km'} (khoảng 28 phút di chuyển)
                              </p>

                              <div className="rec-card-body">
                                <div className="rec-card-reason-wrap">
                                  <div className="rec-card-reason-title">LÝ DO PHÙ HỢP</div>
                                  <p className="rec-card-reason-text">
                                    {rec.explanation}
                                  </p>
                                </div>
                                <div className="rec-card-thumb">
                                  <span style={{ fontSize: '20px', marginBottom: '4px' }}>🏛️</span>
                                  <span>{rec.village_name}</span>
                                  <span style={{ fontSize: '10px', opacity: 0.8 }}>Không gian xưởng</span>
                                </div>
                              </div>

                              <div className="rec-card-actions">
                                <button
                                  type="button"
                                  className="ait-btn-primary"
                                  onClick={() => handleRequestQuote(rec.experience_id)}
                                >
                                  Kiểm tra suất trống ngay
                                </button>
                                <Link
                                  href={`/explore/experiences/${rec.experience_id}`}
                                  className="ait-btn-secondary"
                                >
                                  Xem chi tiết trải nghiệm &rarr;
                                </Link>
                                <button
                                  type="button"
                                  id={`quote-btn-${rec.experience_id}`}
                                  onClick={() => handleRequestQuote(rec.experience_id)}
                                  className="ait-btn-secondary"
                                >
                                  Yêu cầu báo giá
                                </button>
                                <button
                                  type="button"
                                  id={`chat-btn-${rec.provider_id}`}
                                  onClick={() => handleChat(rec.experience_id, rec.provider_id)}
                                  className="ait-btn-text"
                                >
                                  Nhắn tin
                                </button>
                              </div>

                              {quoteStatus[rec.experience_id] && (
                                <div style={{ marginTop: '10px', fontSize: '12.5px', color: '#065F46', backgroundColor: '#ECFDF5', padding: '6px 12px', borderRadius: '6px' }}>
                                  {quoteStatus[rec.experience_id] === HANDOFF_FAILURE_TEXT ? (
                                    <>
                                      {HANDOFF_FAILURE_TEXT}{' '}
                                      <button className="handoff-retry-btn" onClick={() => handleRequestQuote(rec.experience_id)}>Thử lại</button>
                                    </>
                                  ) : quoteStatus[rec.experience_id]}
                                </div>
                              )}

                              {chatStatus[rec.provider_id] && (
                                <div style={{ marginTop: '8px', fontSize: '12.5px', color: '#1E40AF', backgroundColor: '#EFF6FF', padding: '6px 12px', borderRadius: '6px' }}>
                                  {chatStatus[rec.provider_id] === HANDOFF_FAILURE_TEXT ? (
                                    <>
                                      {HANDOFF_FAILURE_TEXT}{' '}
                                      <button className="handoff-retry-btn" onClick={() => handleChat(rec.experience_id, rec.provider_id)}>Thử lại</button>
                                    </>
                                  ) : chatStatus[rec.provider_id]}
                                </div>
                              )}
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="ait-agency-header">
                    09:15 TOUR AGENCY (ĐIỀU PHỐI)
                  </div>
                  <div className="ait-agency-bubble">
                    {msg.text}
                  </div>
                </>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4B5563', fontSize: '13px', fontStyle: 'italic' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#17382B', animation: 'pulse 1s infinite' }} />
              Trợ lý AI đang phân tích yêu cầu tour và đối soát các xưởng nghề phù hợp...
            </div>
          )}

          <div ref={messagesEndRef} />
        </main>

        {/* THAO TÁC NHANH (QUICK CHIPS) */}
        <div className="ait-quick-prompts-bar">
          <span className="ait-quick-label">Thao tác nhanh:</span>
          <button
            type="button"
            className="ait-quick-chip"
            onClick={() =>
              handleSendMessage(
                'Chúng tôi có đoàn văn hoá cao cấp từ Pháp (14 khách gồm 2 trưởng đoàn) tới Hà Nội vào Thứ Năm tuần sau. Họ muốn một buổi sáng thực hành thủ công đích thực cùng nghệ nhân chứng nhận, sau đó là nghi thức trà truyền thống. Ưu tiên gốm hoặc dệt lụa, tổng thời gian di chuyển dưới 45 phút từ phố cổ. Ngân sách khoảng 350.000 – 500.000 đ/khách.'
              )
            }
          >
            Đoàn Pháp 14 khách (Gốm / Lụa)
          </button>
          <button
            type="button"
            className="ait-quick-chip"
            onClick={() => handleSendMessage('Chúng tôi cần tìm xưởng lụa truyền thống tại làng Vạn Phúc')}
          >
            Lụa Vạn Phúc (Làm rõ)
          </button>
          <button
            type="button"
            className="ait-quick-chip"
            onClick={() =>
              handleSendMessage('Đoàn 100 khách muốn tham gia tour làng nghề ngày 25/12 với ngân sách 20.000 đ/khách')
            }
          >
            Ngân sách hẹp (Gợi ý nới lỏng)
          </button>
        </div>

        {/* KHUNG NHẬP LIỆU FOOTER */}
        <footer className="ait-input-footer">
          <form
            onSubmit={e => {
              e.preventDefault()
              handleSendMessage()
            }}
          >
            <div className="ait-input-box">
              <input
                id="matching-prompt-input"
                type="text"
                value={inputText}
                maxLength={2000}
                onChange={e => setInputText(e.target.value)}
                placeholder="Thêm yêu cầu về ăn uống, đi lại hoặc VIP (ví dụ: cần hướng dẫn viên tiếng Pháp, lối đi xe lăn, đồ ăn nhẹ không gluten)..."
                className="ait-prompt-input"
              />
              <button
                id="send-message-btn"
                type="submit"
                disabled={!inputText.trim() || loading}
                className="ait-btn-send"
              >
                Gửi
              </button>
            </div>
          </form>
          <div className="ait-footer-hints">
            <span>Trợ lý AI đồng bộ với hạn mức Liên đoàn làng nghề Hà Nội</span>
            <span>Phiên #AIM-8409 · {inputText.length} / 2000 ký tự</span>
          </div>
        </footer>
      </section>
    </div>
  )
}
