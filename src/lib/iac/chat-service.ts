/**
 * IAC Chat Service — core business logic for US-1 (P1).
 * Traces to: spec-IAC.md §5, FR-001, FR-002, FR-003.
 * Data access: demoRepository (chat_sessions, chat_participants, chat_messages,
 *   user_accounts, agency_profiles, provider_profiles, provider_profile_versions).
 */

import { randomUUID } from 'node:crypto'
import { demoRepository } from '@/lib/demo/json-repository'
import { ChatAuthError } from './auth-guard'
import {
  findAgencyById,
  findAgencyByUserId,
  findProviderById,
  findProviderByUserId,
  findUserById,
} from './seed-accessor'
import type {
  ChatListEntry,
  ChatHistoryMessage,
  ChatSessionStatus,
  ChatSource,
  OpenSessionOutput,
  SendMessageOutput,
} from './types'

// ---------------------------------------------------------------------------
// FR-001 — Open or reuse an active session (AC-IAC-PAIR, BR-004, BR-005)
// ---------------------------------------------------------------------------

export function findOrCreateActiveSession(
  agencyId: string,
  providerId: string,
  source: ChatSource,
  contextIds?: {
    matching_session_id?: string | null
    experience_id?: string | null
    quote_request_id?: string | null
    booking_id?: string | null
  }
): OpenSessionOutput {
  const repo = demoRepository()

  // BR-004: reuse existing Active session for the same agency-provider pair
  const existing = repo.find(
    'chat_sessions',
    s =>
      String(s.agency_id) === agencyId &&
      String(s.provider_id) === providerId &&
      String(s.status) === 'Active'
  )

  if (existing) {
    return {
      chat_session_id: String(existing.chat_session_id),
      chat_status: 'Active',
      is_new_session: false,
    }
  }

  // BR-005: create a new session
  const chat_session_id = randomUUID()
  const started_at = new Date().toISOString()

  repo.insert('chat_sessions', {
    chat_session_id,
    agency_id: agencyId,
    provider_id: providerId,
    source,
    matching_session_id: contextIds?.matching_session_id ?? '',
    experience_id: contextIds?.experience_id ?? '',
    quote_request_id: contextIds?.quote_request_id ?? '',
    booking_id: contextIds?.booking_id ?? '',
    status: 'Active',
    started_at,
    last_message_at: '',
    closed_at: '',
    closed_by: '',
  })

  // Insert agency participant
  const agencyProfile = findAgencyById(agencyId)
  if (agencyProfile) {
    repo.insert('chat_participants', {
      chat_session_id,
      user_id: agencyProfile.user_id,
      last_read_message_id: '',
      unread_count: '0',
    })
  }

  // Insert provider participant
  const providerProfile = findProviderById(providerId)
  if (providerProfile) {
    repo.insert('chat_participants', {
      chat_session_id,
      user_id: providerProfile.user_id,
      last_read_message_id: '',
      unread_count: '0',
    })
  }

  return {
    chat_session_id,
    chat_status: 'Active',
    is_new_session: true,
  }
}

// ---------------------------------------------------------------------------
// FR-002 — Send a message (BR-006, BR-007, BR-021)
// ---------------------------------------------------------------------------

export function sendMessage(
  chatSessionId: string,
  senderUserId: string,
  messageText: string
): SendMessageOutput {
  const repo = demoRepository()

  // Verify session exists and is Active (BR-021)
  const session = repo.find(
    'chat_sessions',
    s => String(s.chat_session_id) === chatSessionId
  )

  if (!session) {
    throw new ChatAuthError('Chat session not found', 404)
  }

  if (String(session.status) === 'Closed') {
    throw new ChatAuthError(
      'Cannot send a message to a Closed chat session (BR-021)',
      403
    )
  }

  // Verify sender is a participant (BR-002)
  const senderParticipant = repo.find(
    'chat_participants',
    p =>
      String(p.chat_session_id) === chatSessionId &&
      String(p.user_id) === senderUserId
  )

  if (!senderParticipant) {
    throw new ChatAuthError(
      'You are not a participant in this chat session (BR-002)',
      403
    )
  }

  const message_id = randomUUID()
  const sent_at = new Date().toISOString()

  repo.insert('chat_messages', {
    message_id,
    chat_session_id: chatSessionId,
    sender_user_id: senderUserId,
    text: messageText,
    message_kind: 'User Text',
    experience_id: '',
    quote_request_id: '',
    booking_id: '',
    sent_at,
  })

  // Update last_message_at on the session
  repo.update(
    'chat_sessions',
    s => String(s.chat_session_id) === chatSessionId,
    { last_message_at: sent_at }
  )

  // Increment unread_count for the OTHER participant
  const allParticipants = repo.all('chat_participants').filter(
    p => String(p.chat_session_id) === chatSessionId && String(p.user_id) !== senderUserId
  )
  for (const other of allParticipants) {
    repo.update(
      'chat_participants',
      p =>
        String(p.chat_session_id) === chatSessionId &&
        String(p.user_id) === String(other.user_id),
      { unread_count: String(Number(other.unread_count || '0') + 1) }
    )
  }

  return {
    message_id,
    sent_at,
    last_message_timestamp: sent_at,
  }
}

// ---------------------------------------------------------------------------
// FR-003 — List all chats for a user (BR-013, BR-016)
// ---------------------------------------------------------------------------

export function listUserChats(userId: string, role: string): ChatListEntry[] {
  const repo = demoRepository()

  // Get all sessions where this user is a participant
  const participantRows = repo.all('chat_participants').filter(
    p => String(p.user_id) === userId
  )

  const entries: ChatListEntry[] = []

  for (const participant of participantRows) {
    const sessionId = String(participant.chat_session_id)

    const session = repo.find(
      'chat_sessions',
      s => String(s.chat_session_id) === sessionId
    )
    if (!session) continue

    // Resolve the counterpart name and organization (BR-016)
    let participantName = 'Unknown'
    let organization = 'Unknown'

    if (role === 'TourAgency') {
      // Counterpart is the provider
      const providerProfile = findProviderById(String(session.provider_id))
      if (providerProfile) {
        const providerUser = findUserById(providerProfile.user_id)
        participantName = providerUser?.full_name ?? 'Unknown'
        organization = providerProfile.business_name ?? 'Unknown'
      }
    } else if (role === 'LocalProvider') {
      // Counterpart is the agency
      const agencyProfile = findAgencyById(String(session.agency_id))
      if (agencyProfile) {
        const agencyUser = findUserById(agencyProfile.user_id)
        participantName = agencyUser?.full_name ?? 'Unknown'
        organization = agencyProfile.company_name ?? 'Unknown'
      }
    }

    // Get last message preview
    const messages = repo
      .all('chat_messages')
      .filter(m => String(m.chat_session_id) === sessionId)
      .sort((a, b) => String(a.sent_at).localeCompare(String(b.sent_at)))

    const lastMessage = messages[messages.length - 1]

    entries.push({
      chat_session_id: sessionId,
      chat_status: String(session.status) as ChatSessionStatus,
      participant_name: participantName,
      organization,
      last_message_preview: lastMessage ? String(lastMessage.text ?? '') : null,
      last_message_at: session.last_message_at ? String(session.last_message_at) : null,
      unread_count: Number(participant.unread_count ?? 0),
    })
  }

  // BR-013: sort by last_message_at DESC
  entries.sort((a, b) => {
    if (!a.last_message_at && !b.last_message_at) return 0
    if (!a.last_message_at) return 1
    if (!b.last_message_at) return -1
    return b.last_message_at.localeCompare(a.last_message_at)
  })

  return entries
}

// ---------------------------------------------------------------------------
// FR-003 — Get paginated message history (BR-014, BR-015, BR-017)
// ---------------------------------------------------------------------------

export function getSessionMessages(
  chatSessionId: string,
  userId: string,
  beforeCursor?: string,
  limit = 50
): { message_history: ChatHistoryMessage[]; has_more_messages: boolean } {
  const repo = demoRepository()

  // Verify user is a participant (BR-002)
  const participant = repo.find(
    'chat_participants',
    p =>
      String(p.chat_session_id) === chatSessionId &&
      String(p.user_id) === userId
  )

  if (!participant) {
    throw new ChatAuthError(
      'You are not a participant in this chat session (BR-002)',
      403
    )
  }

  // BR-017: reset caller's unread_count to 0
  repo.update(
    'chat_participants',
    p =>
      String(p.chat_session_id) === chatSessionId && String(p.user_id) === userId,
    { unread_count: '0' }
  )

  // Fetch messages, apply before_cursor filter if provided, sort sent_at ASC (BR-014)
  let messages = repo
    .all('chat_messages')
    .filter(m => String(m.chat_session_id) === chatSessionId)
    .sort((a, b) => String(a.sent_at).localeCompare(String(b.sent_at)))

  if (beforeCursor) {
    messages = messages.filter(m => String(m.sent_at) < beforeCursor)
  }

  // BR-015: max 50
  const safeLimit = Math.min(Math.max(1, limit), 50)
  const has_more_messages = messages.length > safeLimit
  const page = messages.slice(0, safeLimit)

  // Resolve sender names from user_accounts
  const message_history: ChatHistoryMessage[] = page.map(m => {
    const senderId = m.sender_user_id ? String(m.sender_user_id) : null
    const senderUser = senderId ? findUserById(senderId) : undefined
    return {
      message_id: String(m.message_id),
      text: m.text ? String(m.text) : null,
      sender_id: senderId,
      sender_name: senderUser?.full_name ?? 'System',
      sent_at: String(m.sent_at),
    }
  })

  return { message_history, has_more_messages }
}

