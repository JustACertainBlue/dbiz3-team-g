import type { ActorSession } from '../auth/demo-session'
import { demoRepository } from '../demo/json-repository'
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
  | { role: 'TourAgency'; userId: string; agencyId: string; providerId?: undefined }
  | { role: 'LocalProvider'; userId: string; providerId: string; agencyId?: undefined }

// BR-001, BR-003, spec-IAC #27: only an authenticated Tour Agency or Local Provider uses Chat;
// Guest, UBND and HDT get 403 like spec-BKG #67.
export function requireChatActor(session: ActorSession): ChatActor {
  if (session.authenticated && session.userId) {
    if (session.role === 'TourAgency' && session.agencyId) return { role: 'TourAgency', userId: session.userId, agencyId: session.agencyId }
    if (session.role === 'LocalProvider' && session.providerId) return { role: 'LocalProvider', userId: session.userId, providerId: session.providerId }
  }
  throw new ChatError('FORBIDDEN', 'Only a Tour Agency or a Local Provider can use Chat')
}

/** BR-002, BR-016: the actor's user is a participant and the Chat belongs to the actor's side of the pair. */
export function isParticipant(actor: ChatActor, chat: DemoRow): boolean {
  const ownSide = actor.role === 'TourAgency' ? chat.agency_id === actor.agencyId : chat.provider_id === actor.providerId
  if (!ownSide) return false
  return Boolean(demoRepository().find('chat_participants', row => row.chat_session_id === chat.chat_session_id && row.user_id === actor.userId))
}

// #27: an unknown Chat id and a Chat of someone else get the same 403, so existence is not revealed.
export function requireParticipant(session: ActorSession, chatSessionId: string): DemoRow {
  const actor = requireChatActor(session)
  const chat = demoRepository().find('chat_sessions', row => row.chat_session_id === chatSessionId)
  if (!chat || !isParticipant(actor, chat)) throw new ChatError('FORBIDDEN', 'Chat access denied')
  return chat
}
