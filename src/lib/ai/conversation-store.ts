import { demoRepository } from '@/lib/db/application-store'
import {
  emptyConversationState,
  normalizeConversationState,
  type AitConversationState,
} from '@/lib/ait/conversation-state'

// The conversation state of one matching session lives in matching_sessions.conversation_context
// (an existing column), so no schema change is needed.

export async function loadConversationState(sessionId: string): Promise<AitConversationState> {
  const row = await demoRepository().find('matching_sessions', item => item.matching_session_id === sessionId)
  if (!row?.conversation_context) return emptyConversationState()
  try {
    const raw = typeof row.conversation_context === 'string' ? JSON.parse(row.conversation_context) : row.conversation_context
    return normalizeConversationState(raw)
  } catch {
    return emptyConversationState()
  }
}

export async function saveConversationState(sessionId: string, state: AitConversationState): Promise<void> {
  await demoRepository().update(
    'matching_sessions',
    row => row.matching_session_id === sessionId,
    { conversation_context: JSON.stringify(state) },
  )
}
