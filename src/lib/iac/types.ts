/**
 * Domain types and interfaces for IAC (In-app Chat).
 * Traces to: spec-IAC.md §5, §5.1, §6 and data/schema.sql.
 */

export type ChatSessionStatus = 'Active' | 'Closed'

export type ChatSource =
  | 'AI Matching'
  | 'Explore'
  | 'Provider Profile'
  | 'Quote Request'
  | 'Booking'

export type ChatMessageKind =
  | 'User Text'
  | 'Quote Request'
  | 'Booking Update'
  | 'Attachment'

export interface ChatSession {
  chat_session_id: string
  agency_id: string
  provider_id: string
  source: ChatSource
  matching_session_id?: string | null
  experience_id?: string | null
  quote_request_id?: string | null
  booking_id?: string | null
  status: ChatSessionStatus
  started_at: string
  last_message_at?: string | null
  closed_at?: string | null
  closed_by?: string | null
}

export interface ChatParticipant {
  chat_session_id: string
  user_id: string
  last_read_message_id?: string | null
  unread_count: number
}

export interface ChatMessage {
  message_id: string
  chat_session_id: string
  sender_user_id: string | null
  text: string | null
  message_kind: ChatMessageKind
  experience_id?: string | null
  quote_request_id?: string | null
  booking_id?: string | null
  sent_at: string
}

export interface ChatListEntry {
  chat_session_id: string
  chat_status: ChatSessionStatus
  participant_name: string
  organization: string
  last_message_preview?: string | null
  last_message_at?: string | null
  unread_count: number
}

export interface ChatHistoryMessage {
  message_id: string
  text: string | null
  sender_id: string | null
  sender_name: string
  sent_at: string
}

export interface OpenSessionInput {
  recipient_id: string
  source: ChatSource
  experience_id?: string | null
  quote_request_id?: string | null
  booking_id?: string | null
}

export interface OpenSessionOutput {
  chat_session_id: string
  chat_status: ChatSessionStatus
  is_new_session: boolean
}

export interface SendMessageInput {
  message_text: string
}

export interface SendMessageOutput {
  message_id: string
  sent_at: string
  last_message_timestamp: string
}

