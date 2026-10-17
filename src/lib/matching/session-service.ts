import { MessageTextSchema } from '@/lib/matching/types'

export interface MatchingSession {
  matching_session_id: string
  session_id: string
  agency_id: string
  started_at: Date
  last_activity_at: Date
  status: 'active' | 'closed'
}

export interface ConversationMessage {
  message_id: string
  session_id: string
  sender: 'Agency' | 'Assistant' | string
  text: string
  sent_at: string
}

const globalForSessions = globalThis as unknown as {
  sessionsStore?: Map<string, MatchingSession>
  messagesStore?: Map<string, ConversationMessage[]>
}

export const sessionsStore = globalForSessions.sessionsStore ?? new Map<string, MatchingSession>()
export const messagesStore = globalForSessions.messagesStore ?? new Map<string, ConversationMessage[]>()

if (process.env.NODE_ENV !== 'production') {
  globalForSessions.sessionsStore = sessionsStore
  globalForSessions.messagesStore = messagesStore
}

export async function createMatchingSession(
  input: string | { agencyId: string }
): Promise<MatchingSession> {
  const agencyId = typeof input === 'string' ? input : input.agencyId
  const id = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
  const now = new Date()

  const session: MatchingSession = {
    matching_session_id: id,
    session_id: id,
    agency_id: agencyId,
    started_at: now,
    last_activity_at: now,
    status: 'active',
  }

  sessionsStore.set(id, session)
  messagesStore.set(id, [])

  return session
}

export async function getMatchingSession(sessionId: string): Promise<MatchingSession | null> {
  return sessionsStore.get(sessionId) || null
}

export async function addMessage(
  sessionId: string,
  sender: string,
  text: string
): Promise<ConversationMessage> {
  const parseResult = MessageTextSchema.safeParse(text)
  if (!parseResult.success) {
    throw new Error('Message text invalid: must be between 1 and 2000 characters.')
  }

  const session = sessionsStore.get(sessionId)
  if (session) {
    session.last_activity_at = new Date()
  }

  const message: ConversationMessage = {
    message_id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    session_id: sessionId,
    sender,
    text,
    sent_at: new Date().toISOString(),
  }

  const list = messagesStore.get(sessionId) || []
  list.push(message)
  messagesStore.set(sessionId, list)

  return message
}

export async function getMessages(sessionId: string): Promise<ConversationMessage[]> {
  return messagesStore.get(sessionId) || []
}
