'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { getCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'
import RoleNavbar from '@/app/components/RoleNavbar'
import {
  IconSearch,
  IconFileText,
  IconCalendar,
  IconUsers,
  IconCheck,
  IconClose,
  IconChat,
} from '@/app/components/Icons'

// COM048 (Agency view) + COM065 (Provider view)
// Interactive B2B messaging hub — viewport-locked, scroll inside panels only

interface MessageAttachment {
  name: string
  size: string
  isDoc?: boolean
}

interface MessageBookingCard {
  ref: string
  title: string
  pax: number
  date: string
  amount: string
  status: 'PENDING APPROVAL' | 'CONFIRMED'
}

interface MessageItem {
  id: string
  sender: 'me' | 'partner'
  senderName: string
  avatar: string
  time: string
  text: string
  attachment?: MessageAttachment
  bookingCard?: MessageBookingCard
}

interface ConversationItem {
  id: string
  partner: string
  preview: string
  ref: string
  time: string
  unread?: boolean
  subtitle: string
  partnerAvatar: string
  tag: string
}

export default function MessagesChatPage() {
  const [role, setRole] = useState<CurrentUserRole>('TourAgency')
  const [messageText, setMessageText] = useState('')
  const [selectedConvId, setSelectedConvId] = useState('1')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')

  // Staged attachment: selected but NOT yet sent — user must click Send
  const [stagedAttachment, setStagedAttachment] = useState<MessageAttachment | null>(null)

  // Modals state
  const [showAttachModal, setShowAttachModal] = useState(false)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [viewingDoc, setViewingDoc] = useState<MessageAttachment | null>(null)

  // Quote form state
  const [quoteProgram, setQuoteProgram] = useState('Traditional Hand-Wheel Throwing & Glazing')
  const [quotePax, setQuotePax] = useState('20')
  const [quoteDate, setQuoteDate] = useState('2025-10-25')

  const messagesEndRef = useRef<HTMLDivElement>(null)

  const providerId = '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374'
  const agencyId = '5fecc699-71e4-5bf0-ac1b-2090e05c2cd9'

  useEffect(() => {
    setRole(getCurrentRole())
    const onRoleChanged = () => setRole(getCurrentRole())
    window.addEventListener('hab_role_changed', onRoleChanged)
    return () => window.removeEventListener('hab_role_changed', onRoleChanged)
  }, [])

  const isAgencyView = role === 'TourAgency'

  // Agency conversations (COM048)
  const [agencyConversations, setAgencyConversations] = useState<ConversationItem[]>([
    {
      id: '1',
      partner: 'Hung Thinh Artisan Pottery Workshop',
      preview: 'Confirmed 2.5h hand-wheel masterclass for your VIP group…',
      ref: '#BKG-8409',
      time: '10:42 AM',
      unread: true,
      subtitle: 'Bat Trang Ceramic Village, Gia Lam, Hanoi · Typical reply: < 1 hour',
      partnerAvatar: 'HT',
      tag: 'Accredited Maker',
    },
    {
      id: '2',
      partner: 'Chuong Village Conical Hats',
      preview: 'Material sourcing update: authentic bamboo frames ready',
      ref: '#BKG-8392',
      time: 'Yesterday',
      subtitle: 'Chuong Village, Thanh Oai, Hanoi · Typical reply: < 4 hours',
      partnerAvatar: 'CH',
      tag: 'Heritage Guild',
    },
    {
      id: '3',
      partner: 'Van Phuc Silk Cooperative',
      preview: 'Raw silk swatches dispatched via courier to your agency desk',
      ref: '#BKG-8210',
      time: 'Oct 14',
      subtitle: 'Van Phuc Silk Village, Ha Dong, Hanoi · Typical reply: < 2 hours',
      partnerAvatar: 'VP',
      tag: 'Verified Cooperative',
    },
    {
      id: '4',
      partner: 'Phu Vinh Bamboo & Rattan',
      preview: 'Schedule finalized for UNESCO architecture delegation tour',
      ref: '#BKG-8115',
      time: 'Oct 10',
      subtitle: 'Phu Vinh Village, Chuong My, Hanoi · Typical reply: < 3 hours',
      partnerAvatar: 'PV',
      tag: 'Master Artisan',
    },
  ])

  const [providerConversations, setProviderConversations] = useState<ConversationItem[]>([
    {
      id: '1',
      partner: 'Indochina Heritage Voyages',
      preview: 'Inquiry for 20 Pax VIP ceramic masterclass on Oct 25th…',
      ref: '#Q-2024-91',
      time: '10:42 AM',
      unread: true,
      subtitle: 'Mr. Le Hoang Nam, Head of Artisan Partnerships · Hanoi HQ',
      partnerAvatar: 'IH',
      tag: 'VNAT Licensed DMC',
    },
    {
      id: '2',
      partner: 'Hanoi Cultural Eco-Tours',
      preview: 'Requesting bespoke dragon kiln evening firing availability...',
      ref: '#Q-2024-88',
      time: 'Yesterday',
      subtitle: 'Ms. Tran Thu Ha, Product Director',
      partnerAvatar: 'HE',
      tag: 'Inbound Operator',
    },
    {
      id: '3',
      partner: 'Asia Heritage Discovery Guild',
      preview: 'Invoice settlement receipt approved for October workshops',
      ref: '#Q-2024-76',
      time: 'Oct 14',
      subtitle: 'Operations Department · Account Verified',
      partnerAvatar: 'AH',
      tag: 'Fair Trade Partner',
    },
    {
      id: '4',
      partner: 'Red River Artisan Trails',
      preview: 'Requesting group capacity allocation for November peak dates',
      ref: '#Q-2024-60',
      time: 'Oct 10',
      subtitle: 'Expedition Planning Desk',
      partnerAvatar: 'RR',
      tag: 'B2B Partner',
    },
  ])

  // Message threads
  const [messagesByConv, setMessagesByConv] = useState<Record<string, MessageItem[]>>({
    '1': [
      {
        id: 'm1',
        sender: 'partner',
        senderName: 'Hung Thinh Atelier',
        avatar: 'HT',
        time: '09:15 AM',
        text: 'Good morning! We received your booking dispatch for reference #BKG-8409. Our master atelier has reserved 15 manual kick wheels for your agency group this coming Saturday at 10:00 AM.',
      },
      {
        id: 'm2',
        sender: 'me',
        senderName: 'Indochina Heritage (You)',
        avatar: 'IH',
        time: '09:42 AM',
        text: 'Wonderful Master Hung. Could you confirm if the clay is prepared from raw Bat Trang alluvial sediment? The client delegation includes ceramic curators who require authentic material origin.',
        attachment: {
          name: 'B2B_Guest_Manifest_BKG8409.pdf',
          size: '1.4 MB',
          isDoc: true,
        },
      },
      {
        id: 'm3',
        sender: 'partner',
        senderName: 'Hung Thinh Atelier',
        avatar: 'HT',
        time: '10:30 AM',
        text: 'Yes, absolutely. We only use 100% natural alluvial clay from the Red River basin, aged for 3 months. Here is our official provenance certificate:',
        attachment: {
          name: 'BatTrang_Heritage_Clay_Provenance_Cert.pdf',
          size: '920 KB',
          isDoc: true,
        },
      },
    ],
    '2': [
      {
        id: 'm201',
        sender: 'partner',
        senderName: 'Chuong Village Conical Hats',
        avatar: 'CH',
        time: 'Yesterday',
        text: 'Bamboo frames have been selected and dried in the autumn sun. Ready for assembly demonstrations next week.',
      },
    ],
    '3': [
      {
        id: 'm301',
        sender: 'partner',
        senderName: 'Van Phuc Silk Cooperative',
        avatar: 'VP',
        time: 'Oct 14',
        text: 'Raw silk swatches dispatched via courier to your agency desk in Hoan Kiem. Let us know your preferred dye shade.',
      },
    ],
    '4': [
      {
        id: 'm401',
        sender: 'partner',
        senderName: 'Phu Vinh Bamboo & Rattan',
        avatar: 'PV',
        time: 'Oct 10',
        text: 'Schedule finalized for UNESCO architecture delegation. Master artisans will demonstrate double-weave basketry.',
      },
    ],
  })

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messagesByConv, selectedConvId])

  const conversations = isAgencyView ? agencyConversations : providerConversations
  const activeConv = conversations.find(c => c.id === selectedConvId) || conversations[0]
  const currentMessages = messagesByConv[activeConv.id] || []

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch =
      conv.partner.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.preview.toLowerCase().includes(searchQuery.toLowerCase())
    if (!matchesSearch) return false
    if (activeTab === 'unread') return !!conv.unread
    if (activeTab === 'pending') return conv.ref.includes('BKG') || conv.ref.includes('Q-')
    return true
  })

  // Select conversation
  const handleSelectConv = (id: string) => {
    setSelectedConvId(id)
    setStagedAttachment(null)
    if (isAgencyView) {
      setAgencyConversations(prev => prev.map(c => (c.id === id ? { ...c, unread: false } : c)))
    } else {
      setProviderConversations(prev => prev.map(c => (c.id === id ? { ...c, unread: false } : c)))
    }
  }

  // Send message (includes staged attachment if any)
  const handleSendMessage = () => {
    const hasText = messageText.trim()
    const hasAttachment = !!stagedAttachment
    if (!hasText && !hasAttachment) return

    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const senderName = isAgencyView ? 'Indochina Heritage (You)' : 'Hung Thinh Artisan Pottery (You)'
    const avatar = isAgencyView ? 'IH' : 'HT'

    const newMsg: MessageItem = {
      id: `m-${Date.now()}`,
      sender: 'me',
      senderName,
      avatar,
      time: timeStr,
      text: hasText ? messageText.trim() : stagedAttachment ? `Sent document: ${stagedAttachment.name}` : '',
      attachment: stagedAttachment ?? undefined,
    }

    setMessagesByConv(prev => ({
      ...prev,
      [activeConv.id]: [...(prev[activeConv.id] || []), newMsg],
    }))

    const updatePreview = (list: ConversationItem[]) =>
      list.map(c =>
        c.id === activeConv.id
          ? { ...c, preview: (messageText || stagedAttachment?.name || '').slice(0, 48) + '…', time: 'Just now' }
          : c
      )
    if (isAgencyView) setAgencyConversations(updatePreview)
    else setProviderConversations(updatePreview)

    const sentText = messageText.trim()
    setMessageText('')
    setStagedAttachment(null)

    // Simulated partner reply after 1.2s
    setTimeout(() => {
      const partnerReply: MessageItem = {
        id: `reply-${Date.now()}`,
        sender: 'partner',
        senderName: activeConv.partner,
        avatar: activeConv.partnerAvatar,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: isAgencyView
          ? `Thank you for the update regarding ${activeConv.ref}! ${sentText ? `We have noted: "${sentText.slice(0, 50)}".` : 'We received your document.'} Our master artisan desk will ensure every step complies with your requirements.`
          : `Acknowledged with thanks! Our agency team is reviewing your message for ${activeConv.ref}. We look forward to our continued collaboration.`,
      }
      setMessagesByConv(prev => ({
        ...prev,
        [activeConv.id]: [...(prev[activeConv.id] || []), partnerReply],
      }))
    }, 1200)
  }

  // Stage attachment (select only — does NOT send)
  const handleStageAttachment = (fileName: string, size: string) => {
    setStagedAttachment({ name: fileName, size, isDoc: true })
    setShowAttachModal(false)
  }

  // Issue quotation card
  const handleCreateQuote = () => {
    const paxNum = parseInt(quotePax, 10) || 1
    const totalVND = (paxNum * 450000).toLocaleString() + ' VND'

    const quoteMsg: MessageItem = {
      id: `quote-${Date.now()}`,
      sender: 'me',
      senderName: 'Hung Thinh Artisan Pottery Workshop (You)',
      avatar: 'HT',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: `Issued official B2B quotation for ${quoteProgram} (${quotePax} Pax on ${quoteDate}):`,
      bookingCard: {
        ref: activeConv.ref,
        title: quoteProgram,
        pax: paxNum,
        date: quoteDate,
        amount: totalVND,
        status: 'PENDING APPROVAL',
      },
    }

    setMessagesByConv(prev => ({
      ...prev,
      [activeConv.id]: [...(prev[activeConv.id] || []), quoteMsg],
    }))
    setShowQuoteModal(false)
  }

  // Helper: avatar bubble
  const AvatarBubble = ({ initials, dark }: { initials: string; dark?: boolean }) => (
    <div style={{
      width: '34px', height: '34px', borderRadius: '50%',
      background: dark ? '#111827' : '#e2e8f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: '0.78rem',
      color: dark ? '#ffffff' : '#334155',
      flexShrink: 0,
    }}>
      {initials}
    </div>
  )

  const canSend = messageText.trim() || !!stagedAttachment

  return (
    /* Outer shell: fixed to viewport height — NO page scroll */
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      background: '#ffffff',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Navbar — fixed height */}
      <div style={{ flexShrink: 0 }}>
        <RoleNavbar
          providerId={providerId}
          agencyId={agencyId}
          breadcrumbs={
            isAgencyView
              ? <>HOME / TRAVEL AGENCIES / <strong>B2B MESSAGES (COM048)</strong></>
              : <>HOME / LOCAL PROVIDER / <strong>B2B INQUIRIES &amp; CHATS (COM065)</strong></>
          }
        />
      </div>

      {/* Chat area: takes remaining height, overflows never escape */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>

        {/* ── LEFT PANEL: channel list, scrolls internally ── */}
        <div style={{
          width: '340px',
          flexShrink: 0,
          borderRight: '1px solid #e5e7eb',
          display: 'flex',
          flexDirection: 'column',
          background: '#ffffff',
          minHeight: 0,
        }}>
          {/* Panel header — non-scrolling */}
          <div style={{ flexShrink: 0, padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#111827' }}>
                {isAgencyView ? 'Active Artisan Channels' : 'Active Agency Inquiries'}
              </span>
              <span style={{
                background: '#111827', color: '#ffffff',
                fontSize: '0.65rem', fontWeight: 800, padding: '2px 7px', borderRadius: '2px',
              }}>
                {filteredConversations.length} Live
              </span>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', display: 'flex', alignItems: 'center' }}><IconSearch size={14} color="#9ca3af" /></span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={isAgencyView ? 'Search provider or booking ID…' : 'Search agency or quote ref…'}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  padding: '0.5rem 0.75rem 0.5rem 2rem',
                  border: '1px solid #e5e7eb', borderRadius: '4px',
                  fontSize: '0.8rem', color: '#111827', background: '#f9fafb',
                }}
              />
            </div>
          </div>

          {/* Filter tabs — non-scrolling */}
          <div style={{ flexShrink: 0, display: 'flex', borderBottom: '1px solid #e5e7eb', padding: '0 1rem' }}>
            {[
              { id: 'all', label: 'All Chats' },
              { id: 'unread', label: 'Unread' },
              { id: 'pending', label: 'Pending' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  background: 'none', border: 'none', padding: '0.65rem 0.65rem',
                  fontSize: '0.78rem', fontWeight: activeTab === tab.id ? 800 : 600,
                  color: activeTab === tab.id ? '#111827' : '#6b7280',
                  borderBottom: activeTab === tab.id ? '2px solid #111827' : '2px solid transparent',
                  cursor: 'pointer', marginRight: '0.25rem',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Scrollable conversation list */}
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {filteredConversations.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#6b7280', fontSize: '0.82rem' }}>
                No active conversations match filter.
              </div>
            ) : (
              filteredConversations.map(conv => {
                const isSelected = conv.id === activeConv.id
                return (
                  <div
                    key={conv.id}
                    onClick={() => handleSelectConv(conv.id)}
                    style={{
                      padding: '0.9rem 1.25rem',
                      borderBottom: '1px solid #f3f4f6',
                      background: isSelected ? '#f8fafc' : '#ffffff',
                      cursor: 'pointer',
                      borderLeft: isSelected ? '3px solid #111827' : '3px solid transparent',
                      transition: 'background 0.12s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem', alignItems: 'center' }}>
                      <span style={{ fontWeight: isSelected ? 800 : 700, fontSize: '0.85rem', color: '#111827' }}>
                        {conv.partner}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>{conv.time}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#4b5563', marginBottom: '0.35rem', lineHeight: 1.4 }}>
                      {conv.preview}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: '#6b7280', fontWeight: 600, fontFamily: 'monospace' }}>
                        {conv.ref}
                      </span>
                      {conv.unread && (
                        <span style={{ background: '#b84c24', color: '#ffffff', fontSize: '0.6rem', padding: '1px 6px', borderRadius: '10px', fontWeight: 800 }}>
                          NEW
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: chat thread, scrolls internally ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#ffffff', minHeight: 0, minWidth: 0 }}>

          {/* Thread header — non-scrolling */}
          <div style={{
            flexShrink: 0,
            padding: '0.85rem 1.5rem',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between',
            background: '#ffffff',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', minWidth: 0 }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: '#1e3a5f',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: '0.9rem', color: '#ffffff', flexShrink: 0,
              }}>
                {activeConv.partnerAvatar}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#111827' }}>
                    {activeConv.partner}
                  </span>
                  <span style={{
                    background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
                    fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: '2px',
                    whiteSpace: 'nowrap',
                  }}>
                    {activeConv.tag}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.1rem' }}>
                  {activeConv.subtitle}
                </div>
              </div>
            </div>

            <div style={{
              flexShrink: 0,
              border: '1px solid #e5e7eb', borderRadius: '4px', padding: '0.4rem 0.85rem',
              fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.6rem', background: '#f9fafb',
            }}>
              <span style={{ color: '#6b7280', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: '0.65rem' }}>
                REF
              </span>
              <span style={{ fontWeight: 800, color: '#111827', fontFamily: 'monospace' }}>{activeConv.ref}</span>
            </div>
          </div>

          {/* Scrollable messages area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0,
            padding: '1.5rem',
            display: 'flex', flexDirection: 'column', gap: '1.25rem',
            background: '#f8fafc',
          }}>
            <div style={{ textAlign: 'center' }}>
              <span style={{
                background: '#e2e8f0', color: '#475569', fontSize: '0.72rem',
                fontWeight: 700, padding: '3px 12px', borderRadius: '12px',
              }}>
                Today · B2B Secure Channel · {activeConv.ref}
              </span>
            </div>

            {currentMessages.map(msg => {
              const isMe = msg.sender === 'me'
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                    justifyContent: isMe ? 'flex-end' : 'flex-start',
                  }}
                >
                  {!isMe && <AvatarBubble initials={msg.avatar} />}

                  <div style={{ maxWidth: '68%', textAlign: isMe ? 'right' : 'left' }}>
                    <div style={{ fontSize: '0.72rem', color: '#64748b', marginBottom: '0.3rem' }}>
                      {msg.senderName} · {msg.time}
                    </div>
                    <div style={{
                      background: isMe ? '#111827' : '#ffffff',
                      color: isMe ? '#ffffff' : '#111827',
                      border: isMe ? 'none' : '1px solid #e2e8f0',
                      padding: '0.85rem 1.1rem',
                      borderRadius: isMe ? '6px 0 6px 6px' : '0 6px 6px 6px',
                      fontSize: '0.85rem',
                      lineHeight: 1.55,
                      textAlign: 'left',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}>
                      {msg.text}

                      {/* Attachment preview inside bubble */}
                      {msg.attachment && (
                        <div style={{
                          marginTop: '0.75rem',
                          border: isMe ? '1px solid #374151' : '1px solid #e2e8f0',
                          borderRadius: '4px',
                          padding: '0.6rem 0.85rem',
                          background: isMe ? '#1f2937' : '#f8fafc',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <IconFileText size={18} color={isMe ? '#9ca3af' : '#475569'} />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.78rem', color: isMe ? '#ffffff' : '#0f172a' }}>
                                {msg.attachment.name}
                              </div>
                              <div style={{ fontSize: '0.68rem', color: isMe ? '#9ca3af' : '#64748b' }}>
                                {msg.attachment.size} · Verified B2B Document
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => setViewingDoc(msg.attachment!)}
                            style={{
                              background: isMe ? '#374151' : '#ffffff',
                              border: isMe ? 'none' : '1px solid #cbd5e1',
                              padding: '3px 8px',
                              borderRadius: '3px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              color: isMe ? '#60a5fa' : '#2563eb',
                              cursor: 'pointer',
                            }}
                          >
                            View
                          </button>
                        </div>
                      )}

                      {/* Quotation card inside bubble */}
                      {msg.bookingCard && (
                        <div style={{
                          marginTop: '0.75rem',
                          border: '2px solid #b84c24',
                          borderRadius: '6px',
                          padding: '1rem',
                          background: isMe ? '#1e293b' : '#fffbeb',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#b84c24', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <IconChat size={12} color="#b84c24" /> OFFICIAL B2B QUOTATION
                            </span>
                            <span style={{ fontSize: '0.65rem', background: '#fef3c7', color: '#92400e', padding: '2px 6px', fontWeight: 800, borderRadius: '2px' }}>
                              {msg.bookingCard.status}
                            </span>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.4rem', color: isMe ? '#ffffff' : '#111827' }}>
                            {msg.bookingCard.title}
                          </div>
                          <div style={{ fontSize: '0.76rem', lineHeight: 1.6, color: isMe ? '#cbd5e1' : '#475569', marginBottom: '0.75rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><IconCalendar size={12} color={isMe ? '#9ca3af' : '#6b7280'} /> Date: <strong>{msg.bookingCard.date}</strong></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}><IconUsers size={12} color={isMe ? '#9ca3af' : '#6b7280'} /> Guests: <strong>{msg.bookingCard.pax} Pax</strong></div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>Total: <strong style={{ color: '#059669', fontSize: '0.85rem' }}>{msg.bookingCard.amount}</strong></div>
                          </div>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => alert(`Quotation ${msg.bookingCard?.ref} approved! Voucher sent to both parties.`)}
                              style={{ background: '#059669', color: '#ffffff', border: 'none', padding: '4px 10px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <IconCheck size={11} color="#ffffff" /> Approve &amp; Lock Dates
                            </button>
                            <button
                              onClick={() => alert('Downloading PDF quote specification...')}
                              style={{ background: 'transparent', color: isMe ? '#ffffff' : '#334155', border: '1px solid #cbd5e1', padding: '4px 10px', borderRadius: '3px', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}
                            >
                              Download PDF
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {isMe && <AvatarBubble initials={msg.avatar} dark />}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Staged attachment indicator (non-scrolling, above input bar) */}
          {stagedAttachment && (
            <div style={{
              flexShrink: 0,
              borderTop: '1px solid #e2e8f0',
              padding: '0.5rem 1.5rem',
              background: '#f0f9ff',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
            }}>
              <IconFileText size={16} color="#0284c7" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {stagedAttachment.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>{stagedAttachment.size} · Ready to send</div>
              </div>
              <button
                onClick={() => setStagedAttachment(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', flexShrink: 0, display: 'flex', alignItems: 'center', padding: '2px' }}
              >
                <IconClose size={14} color="#94a3b8" />
              </button>
            </div>
          )}

          {/* Security note — non-scrolling */}
          <div style={{
            flexShrink: 0,
            padding: '0.35rem 1.5rem',
            background: '#f8fafc',
            borderTop: '1px solid #e2e8f0',
            display: 'flex', justifyContent: 'space-between',
            fontSize: '0.68rem', color: '#64748b',
          }}>
            <span>⏱ B2B record linked to <strong>{activeConv.ref}</strong></span>
            <span>Enter to send · Shift+Enter new line</span>
          </div>

          {/* Input bar — non-scrolling */}
          <div style={{ flexShrink: 0, borderTop: '1px solid #e2e8f0', padding: '0.75rem 1.5rem', background: '#ffffff' }}>
            <textarea
              value={messageText}
              onChange={e => setMessageText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              placeholder={`Type message to ${activeConv.partner} regarding ${activeConv.ref}...`}
              rows={2}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1px solid #e2e8f0', borderRadius: '4px',
                padding: '0.65rem 0.85rem', fontSize: '0.85rem',
                resize: 'none', fontFamily: 'inherit', color: '#0f172a',
                marginBottom: '0.5rem',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                {/* Attach button — opens picker modal, does NOT auto-send */}
                <button
                  type="button"
                  onClick={() => setShowAttachModal(true)}
                  title="Attach a document (you choose when to send)"
                  style={{
                    background: '#f1f5f9', border: '1px solid #cbd5e1', cursor: 'pointer',
                    fontSize: '0.78rem', color: '#334155', fontWeight: 700, padding: '5px 10px',
                    borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.35rem',
                  }}
                >
                  <IconFileText size={13} color="#334155" /> Attach
                </button>

                {/* Provider-only: issue quotation */}
                {!isAgencyView && (
                  <button
                    type="button"
                    onClick={() => setShowQuoteModal(true)}
                    style={{
                      background: '#fffbeb', border: '1px solid #fde68a', cursor: 'pointer',
                      fontSize: '0.78rem', color: '#92400e', fontWeight: 700, padding: '5px 10px',
                      borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '0.35rem',
                    }}
                  >
                    <IconFileText size={13} color="#92400e" /> Issue Quotation
                  </button>
                )}

                <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                  {activeConv.ref}
                </span>
              </div>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={!canSend}
                style={{
                  background: canSend ? '#111827' : '#d1d5db',
                  color: '#ffffff',
                  border: 'none', padding: '0.5rem 1.25rem', borderRadius: '4px',
                  fontSize: '0.82rem', fontWeight: 700,
                  cursor: canSend ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  transition: 'background 0.15s ease',
                }}
              >
                Send →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── MODAL: Attach File (stage only — user must press Send) ── */}
      {showAttachModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '6px', maxWidth: '460px', width: '100%',
            padding: '1.75rem', boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconFileText size={18} color="#111827" /> Select B2B Document to Attach
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              Select a file to stage in the composer — it will be sent when you click <strong>Send →</strong>.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.5rem' }}>
              {[
                { name: 'B2B_Guest_Manifest_BKG8409.pdf', size: '1.4 MB', desc: 'Approved visitor name list & dietary notes' },
                { name: 'BatTrang_Natural_Ash_Glaze_Cert.pdf', size: '820 KB', desc: 'Chemical-free environmental safety certificate' },
                { name: 'VAT_Invoice_Draft_2025_Oct.pdf', size: '1.1 MB', desc: 'Electronic tax compliance receipt draft' },
                { name: 'Atelier_Safety_Audit_Pass_2025.pdf', size: '640 KB', desc: 'Commune UBND fire & sanitation clearance' },
              ].map(item => {
                const isStaged = stagedAttachment?.name === item.name
                return (
                  <div
                    key={item.name}
                    onClick={() => handleStageAttachment(item.name, item.size)}
                    style={{
                      border: isStaged ? '2px solid #2563eb' : '1px solid #e2e8f0',
                      borderRadius: '4px', padding: '0.75rem',
                      cursor: 'pointer',
                      background: isStaged ? '#eff6ff' : '#f8fafc',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#0f172a' }}>{item.name}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{item.desc} · {item.size}</div>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: isStaged ? '#2563eb' : '#64748b', fontWeight: 800, marginLeft: '0.75rem', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      {isStaged ? <><IconCheck size={12} color="#2563eb" /> Selected</> : 'Select'}
                    </span>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowAttachModal(false)}
                className="spec-btn-white"
                style={{ fontSize: '0.78rem' }}
              >
                Cancel
              </button>
              {stagedAttachment && (
                <button
                  type="button"
                  onClick={() => setShowAttachModal(false)}
                  className="spec-btn-black"
                  style={{ fontSize: '0.78rem' }}
                >
                  Attach &amp; Return to Composer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Issue Official Quotation (Provider only) ── */}
      {showQuoteModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '6px', maxWidth: '520px', width: '100%',
            padding: '1.75rem', boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
          }}>
            <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.2rem', fontWeight: 800, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <IconFileText size={20} color="#111827" /> Issue Official B2B Workshop Quotation
            </h3>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.8rem', color: '#64748b' }}>
              Master quotation codified with standard tariff and group capacity:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                  EXPERIENCE PROGRAM
                </label>
                <select
                  value={quoteProgram}
                  onChange={e => setQuoteProgram(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem' }}
                >
                  <option value="Traditional Hand-Wheel Throwing & Glazing">EXP-01 · Traditional Hand-Wheel Throwing & Glazing (2.5h)</option>
                  <option value="Historic Natural Ash Glaze Formulation">EXP-02 · Historic Natural Ash Glaze Formulation (3.0h)</option>
                  <option value="Dragon Kiln Firing Night Residency">EXP-03 · Dragon Kiln Firing Night Residency (Evening)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    GROUP SIZE (PAX)
                  </label>
                  <input
                    type="number"
                    value={quotePax}
                    onChange={e => setQuotePax(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#334155', marginBottom: '0.25rem' }}>
                    SCHEDULED DATE
                  </label>
                  <input
                    type="date"
                    value={quoteDate}
                    onChange={e => setQuoteDate(e.target.value)}
                    style={{ width: '100%', boxSizing: 'border-box', padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '0.85rem', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b' }}>
                  <span>Standard Tariff:</span>
                  <strong style={{ color: '#0f172a' }}>450,000 VND / person</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', fontWeight: 800, color: '#059669', marginTop: '0.4rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.4rem' }}>
                  <span>Estimated Total:</span>
                  <span>{((parseInt(quotePax, 10) || 1) * 450000).toLocaleString()} VND</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setShowQuoteModal(false)}
                className="spec-btn-white"
                style={{ fontSize: '0.78rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateQuote}
                className="spec-btn-black"
                style={{ fontSize: '0.78rem', background: '#b84c24' }}
              >
                Post Quotation to Chat →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Document Lightbox ── */}
      {viewingDoc && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem',
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '6px', maxWidth: '600px', width: '100%',
            padding: '2rem', boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <div>
                <span className="spec-badge-pill" style={{ background: '#ecfdf5', color: '#065f46', borderColor: '#a7f3d0', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  <IconCheck size={11} color="#065f46" /> VERIFIED HERITAGE DOCUMENT
                </span>
                <h3 style={{ margin: '0.4rem 0 0.2rem 0', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
                  {viewingDoc.name}
                </h3>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                  File size: {viewingDoc.size} · Hash Verified (VNAT CODEX)
                </div>
              </div>
              <button
                onClick={() => setViewingDoc(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center', padding: '2px' }}
              >
                <IconClose size={16} color="#94a3b8" />
              </button>
            </div>

            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '1.5rem', marginBottom: '1.5rem', fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.8, color: '#334155' }}>
              <div>[DOCUMENT SPECIFICATION]</div>
              <div>ISSUER: Hanoi Artisan Bridge · B2B Cultural Exchange Network</div>
              <div>DATE: October 2025</div>
              <div>STATUS: VALID &amp; ENFORCEABLE UNDER VIETNAMESE TOURISM LAW</div>
              <div style={{ margin: '0.75rem 0', borderTop: '1px dashed #cbd5e1' }} />
              <div>This document certifies the agreed booking manifest, artisan remuneration schedule, and cultural field conduct standards for the referenced craft village visit.</div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => { alert(`Downloading ${viewingDoc.name}...`); setViewingDoc(null) }}
                className="spec-btn-black"
                style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <IconFileText size={13} color="#ffffff" /> Download Copy
              </button>
              <button
                type="button"
                onClick={() => setViewingDoc(null)}
                className="spec-btn-white"
                style={{ fontSize: '0.8rem' }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
