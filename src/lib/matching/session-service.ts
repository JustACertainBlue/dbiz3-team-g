import { MessageTextSchema } from '@/lib/matching/types'
import { randomUUID } from 'node:crypto'
import { demoRepository } from '@/lib/demo/json-repository'

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

export async function createMatchingSession(
  input: string | { agencyId: string }
): Promise<MatchingSession> {
  const agencyId = typeof input === 'string' ? input : input.agencyId
  const id = randomUUID()
  const now = new Date()

  const session: MatchingSession = {
    matching_session_id: id,
    session_id: id,
    agency_id: agencyId,
    started_at: now,
    last_activity_at: now,
    status: 'active',
  }

  demoRepository().insert('matching_sessions', {
    matching_session_id: id,
    agency_id: agencyId,
    conversation_context: '{}',
    started_at: now.toISOString(),
    last_activity_at: now.toISOString(),
    status: 'active',
  })

  return session
}

export async function getMatchingSession(sessionId: string): Promise<MatchingSession | null> {
  const row = demoRepository().find('matching_sessions', item => item.matching_session_id === sessionId)
  if (!row) return null
  return {
    matching_session_id: row.matching_session_id,
    session_id: row.matching_session_id,
    agency_id: row.agency_id,
    started_at: new Date(row.started_at),
    last_activity_at: new Date(row.last_activity_at),
    status: row.status === 'closed' ? 'closed' : 'active',
  }
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

  const repository = demoRepository()
  const session = repository.find('matching_sessions', row => row.matching_session_id === sessionId)
  if (!session) throw new Error('Matching session not found')
  const now = new Date().toISOString()
  repository.update('matching_sessions', row => row.matching_session_id === sessionId, { last_activity_at: now })

  const message: ConversationMessage = {
    message_id: randomUUID(),
    session_id: sessionId,
    sender,
    text,
    sent_at: now,
  }
  repository.insert('matching_messages', {
    message_id: message.message_id,
    matching_session_id: sessionId,
    sender,
    text,
    sent_at: now,
  })

  return message
}

export async function getMessages(sessionId: string): Promise<ConversationMessage[]> {
  return demoRepository().all('matching_messages')
    .filter(row => row.matching_session_id === sessionId)
    .sort((a, b) => a.sent_at.localeCompare(b.sent_at))
    .map(row => ({
      message_id: row.message_id,
      session_id: row.matching_session_id,
      sender: row.sender,
      text: row.text,
      sent_at: row.sent_at,
    }))
}
