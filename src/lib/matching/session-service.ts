import { MessageTextSchema } from '@/lib/matching/types'
import { randomUUID } from 'node:crypto'
import { demoRepository } from '@/lib/db/application-store'

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

export interface MatchingConversationContext extends Record<string, unknown> {
  state?: unknown
  pending_question?: unknown
}

const matchingSessionWriteQueues = new Map<string, Promise<void>>()

export async function withMatchingSessionWriteLock<T>(
  sessionId: string,
  operation: () => Promise<T>
): Promise<T> {
  const previous = matchingSessionWriteQueues.get(sessionId) ?? Promise.resolve()
  let release!: () => void
  const current = new Promise<void>(resolve => { release = resolve })
  matchingSessionWriteQueues.set(sessionId, current)
  await previous
  try {
    return await operation()
  } finally {
    release()
    if (matchingSessionWriteQueues.get(sessionId) === current) {
      matchingSessionWriteQueues.delete(sessionId)
    }
  }
}

function parseConversationContext(value: unknown): MatchingConversationContext {
  if (value == null || value === '') return {}
  const parsed = typeof value === 'string' ? JSON.parse(value) : value
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Matching session conversation context is invalid.')
  }
  return parsed as MatchingConversationContext
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

  ;(await demoRepository().insert('matching_sessions', {
    matching_session_id: id,
    agency_id: agencyId,
    conversation_context: JSON.stringify({
      state: { exclusions: { villages: [], crafts: [] } },
      pending_question: null,
    }),
    started_at: now.toISOString(),
    last_activity_at: now.toISOString(),
    status: 'active',
  }))

  return session
}

export async function getMatchingSession(sessionId: string): Promise<MatchingSession | null> {
  const row = (await demoRepository().find('matching_sessions', item => item.matching_session_id === sessionId))
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

export async function getMatchingSessionContext(
  sessionId: string
): Promise<MatchingConversationContext> {
  const row = await demoRepository().find(
    'matching_sessions',
    item => item.matching_session_id === sessionId
  )
  if (!row) throw new Error('Matching session not found')
  return parseConversationContext(row.conversation_context)
}

export async function addMessage(
  sessionId: string,
  sender: string,
  text: string
): Promise<ConversationMessage> {
  return demoRepository().atomic(["matching_sessions","matching_messages"],async()=>{

  const parseResult = MessageTextSchema.safeParse(text)
  if (!parseResult.success) {
    throw new Error('Message text invalid: must be between 1 and 2000 characters.')
  }

  const repository = demoRepository()
  const session = (await repository.find('matching_sessions', row => row.matching_session_id === sessionId))
  if (!session) throw new Error('Matching session not found')
  const now = new Date().toISOString()
  ;(await repository.update('matching_sessions', row => row.matching_session_id === sessionId, { last_activity_at: now }))

  const message: ConversationMessage = {
    message_id: randomUUID(),
    session_id: sessionId,
    sender,
    text,
    sent_at: now,
  }
  ;(await repository.insert('matching_messages', {
    message_id: message.message_id,
    matching_session_id: sessionId,
    sender,
    text,
    sent_at: now,
  }))

  return message

  })
}

export async function getMessages(sessionId: string): Promise<ConversationMessage[]> {
  return (await demoRepository().all('matching_messages'))
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

export async function getAgencyMatchingSessions(agencyId: string): Promise<Array<MatchingSession & { conversation_context?: any; messageCount?: number; lastMessageText?: string }>> {
  const allSessions = await demoRepository().all('matching_sessions')
  const allMessages = await demoRepository().all('matching_messages')

  return allSessions
    .filter(row => row.agency_id === agencyId && row.status !== 'closed')
    .sort((a, b) => new Date(b.last_activity_at).getTime() - new Date(a.last_activity_at).getTime())
    .map(row => {
      let context: any = {}
      try {
        context = typeof row.conversation_context === 'string'
          ? JSON.parse(row.conversation_context)
          : (row.conversation_context || {})
      } catch {}

      const sessionMessages = allMessages.filter(m => m.matching_session_id === row.matching_session_id)
      const sortedMsgs = [...sessionMessages].sort((a, b) => String(a.sent_at).localeCompare(String(b.sent_at)))
      const lastMsg = sortedMsgs[sortedMsgs.length - 1]

      return {
        matching_session_id: row.matching_session_id,
        session_id: row.matching_session_id,
        agency_id: row.agency_id,
        started_at: new Date(row.started_at),
        last_activity_at: new Date(row.last_activity_at),
        status: (row.status === 'closed' ? 'closed' : 'active') as 'active' | 'closed',
        conversation_context: context,
        messageCount: sessionMessages.length,
        lastMessageText: lastMsg?.text,
      }
    })
}

export async function updateMatchingSessionContext(
  sessionId: string,
  context: Record<string, unknown>
): Promise<void> {
  const repository = demoRepository()
  const existing = await repository.find('matching_sessions', row => row.matching_session_id === sessionId)
  if (!existing) return

  const currentContext = parseConversationContext(existing.conversation_context)

  const merged = { ...currentContext, ...context }
  const now = new Date().toISOString()
  await repository.update(
    'matching_sessions',
    row => row.matching_session_id === sessionId,
    {
      conversation_context: JSON.stringify(merged),
      last_activity_at: now,
    }
  )
}

export async function closeMatchingSession(sessionId: string): Promise<void> {
  const repository = demoRepository()
  await repository.update(
    'matching_sessions',
    row => row.matching_session_id === sessionId,
    {
      status: 'closed',
      last_activity_at: new Date().toISOString(),
    }
  )
}

export interface MatchingSessionSummary {
  session_id: string
  title: string
  started_at: string
  last_activity_at: string
}

/** Screen 22 history: the company's own sessions with at least one Agency message, newest first (read-only). */
export async function listMatchingSessions(agencyId: string, limit = 20): Promise<MatchingSessionSummary[]> {
  const repository = demoRepository()
  const sessions = (await repository.all('matching_sessions')).filter(row => row.agency_id === agencyId)
  const messages = (await repository.all('matching_messages')).filter(row => row.sender === 'Agency')
  const firstText = new Map<string, { sent_at: string; text: string }>()
  for (const row of messages) {
    const seen = firstText.get(row.matching_session_id)
    if (!seen || Date.parse(row.sent_at) < Date.parse(seen.sent_at)) firstText.set(row.matching_session_id, { sent_at: row.sent_at, text: row.text })
  }
  return sessions
    .filter(row => firstText.has(row.matching_session_id))
    .sort((a, b) => Date.parse(b.last_activity_at) - Date.parse(a.last_activity_at))
    .slice(0, limit)
    .map(row => ({
      session_id: row.matching_session_id,
      title: firstText.get(row.matching_session_id)!.text,
      started_at: row.started_at,
      last_activity_at: row.last_activity_at,
    }))
}
}
