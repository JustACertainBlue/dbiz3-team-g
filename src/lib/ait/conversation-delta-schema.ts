import type { ConversationSlotName } from './conversation-state'

export type ConversationDeltaSlot = ConversationSlotName | 'guide_language'
export type ConversationDeltaAction = 'set' | 'clear' | 'relax'
export type ConversationDeltaValue = string | number | boolean | string[]

export interface ConversationDeltaOperation {
  action: ConversationDeltaAction
  value?: ConversationDeltaValue
  raw_span: string
}

export type ConversationDelta = Partial<Record<ConversationDeltaSlot, ConversationDeltaOperation>>

export interface RejectedConversationDelta {
  slot: ConversationDeltaSlot
  reason: string
}

export interface ValidatedConversationDelta {
  accepted: ConversationDelta
  unsupported: ConversationDelta
  rejected: RejectedConversationDelta[]
}
