import type { SessionContext } from '../auth/session'
import { demoRepository } from '../db/application-store'
import type { DemoRow } from '../demo/types'
import type { FileError } from './chat-file-rules'

export type ChatErrorCode = 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | 'CHAT_CLOSED' | 'PROVIDER_UNAVAILABLE'

const STATUS: Record<ChatErrorCode, number> = {
  FORBIDDEN: 403, NOT_FOUND: 404, VALIDATION_ERROR: 400, CHAT_CLOSED: 409, PROVIDER_UNAVAILABLE: 409,
}

export class ChatError extends Error {
  readonly statusCode: number
  constructor(public readonly code: ChatErrorCode, message: string, public readonly fileErrors?: FileError[]) {
    super(message)
    this.name = 'ChatError'
    this.statusCode = STATUS[code]
  }
}

export type ChatActor =
  | { role: 'Tour_Agency'; userId: string; agencyId: string; providerId?: undefined }
  | { role: 'Local_Provider'; userId: string; providerId: string; agencyId?: undefined }

// BR-001, BR-003, spec-IAC #27: only an authenticated Tour Agency or Local Provider uses Chat;
// Guest, UBND and HDT get 403 like spec-BKG #67.
export function requireChatActor(session: SessionContext): ChatActor {
  if (session.authenticated && session.userId) {
    if (session.role === 'Tour_Agency' && session.agencyId) return { role: 'Tour_Agency', userId: session.userId, agencyId: session.agencyId }
    if (session.role === 'Local_Provider' && session.providerId) return { role: 'Local_Provider', userId: session.userId, providerId: session.providerId }
  }
  throw new ChatError('FORBIDDEN', 'Only a Tour Agency or a Local Provider can use Chat')
}

/** BR-002, BR-016: the actor's user is a participant and the Chat belongs to the actor's side of the pair. */
export async function isParticipant(actor: ChatActor, chat: DemoRow): Promise<boolean> {
  const ownSide = actor.role === 'Tour_Agency' ? chat.agency_id === actor.agencyId : chat.provider_id === actor.providerId
  if (!ownSide) return false
  return Boolean((await demoRepository().find('chat_participants', row => row.chat_session_id === chat.chat_session_id && row.user_id === actor.userId)))
}

// #27: an unknown Chat id and a Chat of someone else get the same 403, so existence is not revealed.
export async function requireParticipant(session: SessionContext, chatSessionId: string): Promise<DemoRow> {
  const actor = requireChatActor(session)
  const chat = (await demoRepository().find('chat_sessions', row => row.chat_session_id === chatSessionId))
  if (!chat || !(await isParticipant(actor, chat))) throw new ChatError('FORBIDDEN', 'Chat access denied')
  return chat
}
