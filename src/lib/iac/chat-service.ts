import { filterAsync } from '@/lib/db/async-collections'
import { randomUUID } from 'node:crypto'
import type { SessionContext } from '../auth/session'
import { demoRepository } from '../db/application-store'
import type { BatchOperation, DemoRow } from '../demo/types'
import { ChatError, isParticipant, requireChatActor, requireParticipant, type ChatActor } from './chat-access'
import { chatFileStore, classifyFile, storageKeyOf, validateBatch, type IncomingFile } from './chat-files'
import { withChatWriteLock } from './chat-lock'
import { messageOperations, nextSentAt, pairChatPlan, pairUserIds, type ChatSource, type PairContext } from './chat-pairs'

// IAC F-CHAT-01..03 (spec-IAC FR-001..FR-003). Every function: authorize → validate → lock →
// read/write; a denied or invalid request writes nothing (lesson #15).

export const MESSAGE_MAX_CODE_POINTS = 4000 // FR-002, spec-IAC #25
export const HISTORY_PAGE_SIZE = 50 // BR-015
const PREVIEW_CODE_POINTS = 120
export const ATTACHMENT_PREVIEW_PREFIX = 'Tệp đính kèm: ' // #48
export const SEED_FILE_MISSING = 'Tệp mẫu không có nội dung.' // #40
const SYSTEM_SENDER = 'Hệ thống'

type Clock = () => Date
const systemClock: Clock = () => new Date()

export interface OpenChatInput {
  source: ChatSource
  experienceId?: string
  matchingSessionId?: string
  quoteRequestId?: string
  bookingId?: string
}

export interface OpenChatResult {
  chat_session_id: string
  chat_status: 'Active'
  is_new_session: boolean
}

/** The Agency–Provider pair and context of an open request, after authorization and validation. */
export async function resolveOpenTarget(actor: ChatActor, input: OpenChatInput): Promise<Omit<PairContext, 'at'>> {
  const repository = demoRepository()
  if (input.source === 'Booking') {
    if (!input.bookingId) throw new ChatError('VALIDATION_ERROR', 'booking_id is required when source = Booking')
    const booking = (await repository.find('bookings', row => row.booking_id === input.bookingId))
    if (!booking) throw new ChatError('NOT_FOUND', 'Booking not found')
    const own = actor.role === 'Tour_Agency' ? booking.agency_id === actor.agencyId : booking.provider_id === actor.providerId
    if (!own) throw new ChatError('FORBIDDEN', 'The Booking belongs to another participant')
    return { agencyId: booking.agency_id, providerId: booking.provider_id, source: 'Booking', bookingId: booking.booking_id, experienceId: booking.experience_id }
  }
  // FR-001, Q5: a Local Provider starts a Chat only from its own Booking in this slice.
  if (actor.role !== 'Tour_Agency') throw new ChatError('FORBIDDEN', 'A Local Provider can open a Chat only from its own Booking')
  if (input.source === 'Quote Request') throw new ChatError('VALIDATION_ERROR', 'source Quote Request is not supported yet')
  if (!input.experienceId) throw new ChatError('VALIDATION_ERROR', 'experience_id is required')
  if (input.source === 'AI Matching' && !input.matchingSessionId) throw new ChatError('VALIDATION_ERROR', 'matching_session_id is required when source = AI Matching')
  const experience = (await repository.find('experiences', row => row.experience_id === input.experienceId && !row.archived_at))
  if (!experience) throw new ChatError('NOT_FOUND', 'Experience not found')
  const provider = (await repository.find('provider_profiles', row => row.provider_id === experience.provider_id))
  if (!provider || provider.verification_status !== 'Verified') throw new ChatError('PROVIDER_UNAVAILABLE', 'Provider is not available')
  return {
    agencyId: actor.agencyId, providerId: provider.provider_id, source: input.source,
    matchingSessionId: input.matchingSessionId, experienceId: experience.experience_id, quoteRequestId: input.quoteRequestId,
  }
}

/** F-CHAT-01: open the pair's Active Chat or create it (FR-001, BR-004, BR-021, spec-IAC #19, #21, #24). */
export async function openChat(
  session: SessionContext,
  input: OpenChatInput,
  // afterPairCheck is a test-only seam: an async pause between the pair check and the write (lesson #13).
  options: { now?: Clock; afterPairCheck?: () => Promise<void> } = {},
): Promise<OpenChatResult> {
  const actor = requireChatActor(session)
  const target = (await resolveOpenTarget(actor, input))
  const at = (options.now ?? systemClock)().toISOString()
  return (await withChatWriteLock(async () => {
    const plan = (await pairChatPlan({ ...target, at }))
    if (options.afterPairCheck) await (await options.afterPairCheck())
    ;(await demoRepository().applyBatch(plan.operations))
    return { chat_session_id: plan.chat.chat_session_id, chat_status: 'Active' as const, is_new_session: plan.isNew }
  }))
}

function codePoints(text: string): number {
  return [...text].length
}

/** The other participant of the pair (recipient of the sender's message). */
async function recipientOf(chat: DemoRow, senderUserId: string): Promise<string> {
  const { agencyUserId, providerUserId } = (await pairUserIds(chat.agency_id, chat.provider_id))
  return senderUserId === agencyUserId ? providerUserId : agencyUserId
}

/** F-CHAT-02: send a text message (FR-002, BR-006, BR-017, BR-021, spec-IAC #25, #26). */
export async function sendMessage(
  session: SessionContext,
  chatSessionId: string,
  text: unknown,
  // afterStatusCheck is a test-only seam between the Active check and the write (spec-IAC #38, lesson #13).
  options: { now?: Clock; afterStatusCheck?: () => Promise<void> } = {},
) {
  return withChatWriteLock(async()=>{
  const chat = await requireParticipant(session, chatSessionId)
  const senderUserId = session.userId!
  const trimmed = typeof text === 'string' ? text.trim() : ''
  if (!trimmed) throw new ChatError('VALIDATION_ERROR', 'Message cannot be empty')
  if (codePoints(trimmed) > MESSAGE_MAX_CODE_POINTS) throw new ChatError('VALIDATION_ERROR', `Message is longer than ${MESSAGE_MAX_CODE_POINTS} characters`)
  {
    const current = (await demoRepository().find('chat_sessions', row => row.chat_session_id === chatSessionId))!
    if (current.status !== 'Active') throw new ChatError('CHAT_CLOSED', 'This Chat is closed; start a new Chat to continue')
    if (options.afterStatusCheck) await options.afterStatusCheck()
    const sentAt = (await nextSentAt(chatSessionId, (options.now ?? systemClock)().toISOString()))
    const message: DemoRow = {
      message_id: randomUUID(), chat_session_id: chatSessionId, sender_user_id: senderUserId, text: trimmed,
      message_kind: 'User Text', experience_id: current.experience_id, quote_request_id: current.quote_request_id,
      booking_id: current.booking_id, sent_at: sentAt,
    }
    ;(await demoRepository().applyBatch((await messageOperations(chatSessionId, message, (await recipientOf(chat, senderUserId))))))
    return { message_id: message.message_id, sent_at: sentAt, last_message_timestamp: sentAt }
  }
  })
}

/** Messages of a Chat in history order: sent_at, then message_id (Q6). */
async function orderedMessages(chatSessionId: string): Promise<DemoRow[]> {
  return (await demoRepository().all('chat_messages'))
    .filter(row => row.chat_session_id === chatSessionId)
    .sort((a, b) => (Date.parse(a.sent_at) - Date.parse(b.sent_at)) || a.message_id.localeCompare(b.message_id))
}

async function fullName(userId: string): Promise<string> {
  return (await demoRepository().find('user_accounts', row => row.user_id === userId))?.full_name ?? ''
}

// spec-IAC #22: counterpart user's full_name and organization.
async function counterpart(actor: ChatActor, chat: DemoRow): Promise<{ participant_name: string; organization: string }> {
  const repository = demoRepository()
  if (actor.role === 'Tour_Agency') {
    const provider = (await repository.find('provider_profiles', row => row.provider_id === chat.provider_id))
    const version = provider && (await repository.find('provider_profile_versions', row => row.provider_id === provider.provider_id && row.version_no === provider.published_version_no))
    return { participant_name: (await fullName(provider?.user_id ?? '')), organization: version?.business_name ?? '' }
  }
  const agency = (await repository.find('agency_profiles', row => row.agency_id === chat.agency_id))
  return { participant_name: (await fullName(agency?.user_id ?? '')), organization: agency?.company_name ?? '' }
}

export interface ChatListEntry {
  chat_session_id: string
  chat_status: 'Active' | 'Closed'
  participant_name: string
  organization: string
  last_message_preview?: string
  last_message_at?: string
  unread_count: number
}

/** F-CHAT-03 Chat list (FR-003, BR-002, BR-013, BR-016). */
export async function listChats(session: SessionContext): Promise<ChatListEntry[]> {
  const actor = requireChatActor(session)
  const repository = demoRepository()
  const activity = (chat: DemoRow) => Date.parse(chat.last_message_at || chat.started_at)
  return (await Promise.all((await filterAsync((await repository.all('chat_sessions')),async chat => (await isParticipant(actor, chat))))
    .sort((a, b) => (activity(b) - activity(a)) || a.chat_session_id.localeCompare(b.chat_session_id))
    .map(async chat => {
      const latest = (await orderedMessages(chat.chat_session_id)).at(-1)
      const own = (await repository.find('chat_participants', row => row.chat_session_id === chat.chat_session_id && row.user_id === actor.userId))
      const entry: ChatListEntry = {
        chat_session_id: chat.chat_session_id,
        chat_status: chat.status as 'Active' | 'Closed',
        ...(await counterpart(actor, chat)),
        unread_count: Number(own?.unread_count || 0),
      }
      const preview = latest && (await previewOf(latest))
      if (preview) entry.last_message_preview = [...preview].slice(0, PREVIEW_CODE_POINTS).join('')
      if (chat.last_message_at) entry.last_message_at = chat.last_message_at
      return entry
    })))
}

// spec-IAC #48: a message without text that has attachments previews as its file names.
async function previewOf(message: DemoRow): Promise<string | undefined> {
  if (message.text) return message.text
  const names = (await attachmentsOf(message.message_id)).map(a => a.file_name)
  return names.length ? `${ATTACHMENT_PREVIEW_PREFIX}${names.join(', ')}` : undefined
}

async function attachmentsOf(messageId: string) {
  const repository = demoRepository()
  return (await Promise.all((await repository.all('chat_attachments')).filter(row => row.message_id === messageId).map(async row => {
    const file = (await repository.find('stored_files', f => f.file_id === row.file_id))
    return { attachment_id: row.attachment_id, file_name: file?.file_name ?? '', file_type: file?.media_type ?? '', file_size: Number(file?.file_size_bytes || 0) }
  })))
}

async function historyItem(message: DemoRow) {
  return {
    message_id: message.message_id,
    message_kind: message.message_kind,
    text: message.text,
    sender_name: message.sender_user_id ? (await fullName(message.sender_user_id)) : SYSTEM_SENDER,
    sent_at: message.sent_at,
    experience_id: message.experience_id, // spec-IAC #28
    booking_id: message.booking_id, // spec-IAC #28
    attachments: (await attachmentsOf(message.message_id)),
  }
}

/**
 * F-CHAT-03 history (BR-014, BR-015, Q6): 50 messages oldest → newest, older pages by before_cursor.
 * The first page resets the reader's unread count (BR-017, spec-IAC #23).
 */
export async function getChatHistory(session: SessionContext, chatSessionId: string, query: { beforeCursor?: string } = {}): Promise<ChatHistory> {
  const chat = (await requireParticipant(session, chatSessionId))
  const userId = session.userId!
  const messages = (await orderedMessages(chatSessionId))
  let end = messages.length
  if (query.beforeCursor !== undefined) {
    end = messages.findIndex(row => row.message_id === query.beforeCursor)
    if (end < 0) throw new ChatError('VALIDATION_ERROR', 'before_cursor is not a message of this Chat')
  }
  const start = Math.max(0, end - HISTORY_PAGE_SIZE)
  const page = messages.slice(start, end)
  if (query.beforeCursor === undefined) {
    await withChatWriteLock(async () => {
      const newest = (await orderedMessages(chatSessionId)).at(-1)
      ;(await demoRepository().applyBatch([{
        table: 'chat_participants',
        match: row => row.chat_session_id === chatSessionId && row.user_id === userId,
        changes: { unread_count: '0', last_read_message_id: newest?.message_id ?? '' },
      }]))
    })
  }
  const result: ChatHistory = {
    chat_session_id: chat.chat_session_id,
    chat_status: chat.status as 'Active' | 'Closed',
    message_history: await Promise.all(page.map(historyItem)),
    has_more_messages: start > 0,
  }
  // spec-IAC #34: who closed a Closed Chat and when.
  if (chat.status === 'Closed') {
    result.closed_at = chat.closed_at
    result.closed_by_name = (await fullName(chat.closed_by))
  }
  return result
}

export interface ChatHistory {
  chat_session_id: string
  chat_status: 'Active' | 'Closed'
  message_history: Awaited<ReturnType<typeof historyItem>>[]
  has_more_messages: boolean
  closed_at?: string
  closed_by_name?: string
}

export const CLOSE_REASON_MAX_CODE_POINTS = 500 // spec-IAC #30
export const CLOSE_SUCCESS_MESSAGE = 'Đã đóng hội thoại. Lịch sử vẫn được lưu; lần trao đổi sau sẽ mở hội thoại mới.' // #32

/**
 * F-CHAT-04 Close Chat (FR-004, BR-019, BR-020, BR-021, spec-IAC #29–#31, #37, #38): either participant;
 * Active → Closed with closed_at / closed_by; one audit_logs row with the optional reason; no message,
 * no unread change. closed_at is never earlier than the latest message (schema chat_message_not_closed).
 */
export async function closeChat(
  session: SessionContext,
  chatSessionId: string,
  input: { closeReason?: unknown },
  // afterStatusCheck is a test-only seam between the Active check and the write (lesson #13).
  options: { now?: Clock; afterStatusCheck?: () => Promise<void> } = {},
) {
  return withChatWriteLock(async()=>{
  await requireParticipant(session, chatSessionId)
  const userId = session.userId!
  if (input.closeReason !== undefined && input.closeReason !== null && typeof input.closeReason !== 'string') {
    throw new ChatError('VALIDATION_ERROR', 'close_reason must be text')
  }
  const reason = typeof input.closeReason === 'string' ? input.closeReason.trim() : ''
  if (codePoints(reason) > CLOSE_REASON_MAX_CODE_POINTS) {
    throw new ChatError('VALIDATION_ERROR', `close_reason is longer than ${CLOSE_REASON_MAX_CODE_POINTS} characters`)
  }
  {
    const current = (await demoRepository().find('chat_sessions', row => row.chat_session_id === chatSessionId))!
    if (current.status !== 'Active') throw new ChatError('CHAT_CLOSED', 'This Chat is already closed')
    if (options.afterStatusCheck) await options.afterStatusCheck()
    const now = (options.now ?? systemClock)().getTime()
    const latest = (await orderedMessages(chatSessionId)).at(-1)
    const closedAt = new Date(Math.max(now, latest ? Date.parse(latest.sent_at) : now)).toISOString()
    const change: Record<string, string> = { from: 'Active', to: 'Closed' }
    if (reason) change.close_reason = reason
    ;(await demoRepository().applyBatch([
      { table: 'chat_sessions', match: row => row.chat_session_id === chatSessionId, changes: { status: 'Closed', closed_at: closedAt, closed_by: userId } },
      {
        table: 'audit_logs',
        row: {
          audit_id: randomUUID(), actor_user_id: userId, action: 'chat.close', target_type: 'chat_session',
          target_id: chatSessionId, occurred_at: closedAt, change_or_result: JSON.stringify(change),
        },
      },
    ]))
    return {
      chat_session_id: chatSessionId, chat_status: 'Closed' as const, closed_at: closedAt, closed_by: userId,
      success_message: CLOSE_SUCCESS_MESSAGE,
    }
  }
  })
}

export interface AttachmentOutput {
  attachment_id: string
  file_name: string
  file_type: string
  file_size: number
}

/**
 * F-CHAT-05 send attachments (FR-005, BR-003, BR-008–BR-010, BR-021, spec-IAC #39, #41–#47):
 * authorize → validate every file → write the files → lock: re-check Active, write one Attachment
 * message with its stored_files / chat_attachments rows in one batch. Any failure after the files were
 * written removes them, so a refused or failed action leaves nothing (#46).
 */
export async function sendAttachments(
  session: SessionContext,
  chatSessionId: string,
  files: readonly IncomingFile[],
  // Test-only seams (lesson #13): afterFilesWritten pauses between the file write and the lock;
  // failRecords runs inside the lock right before the record write.
  options: { now?: Clock; afterFilesWritten?: () => Promise<void>; failRecords?: () => void } = {},
): Promise<{ message_id: string; attachments: AttachmentOutput[]; sent_at: string }> {
  const chat = (await requireParticipant(session, chatSessionId))
  const senderUserId = session.userId!
  validateBatch(files)
  const store = chatFileStore()
  const planned = files.map(file => ({ file, fileId: randomUUID(), attachmentId: randomUUID(), fileType: classifyFile(file.name)! }))
  const written: string[] = []
  try {
    for (const item of planned) {
      await store.write(item.fileId, item.file.bytes)
      written.push(item.fileId)
    }
    if (options.afterFilesWritten) await options.afterFilesWritten()
    return await withChatWriteLock(async () => {
      const current = (await demoRepository().find('chat_sessions', row => row.chat_session_id === chatSessionId))!
      if (current.status !== 'Active') throw new ChatError('CHAT_CLOSED', 'This Chat is closed; start a new Chat to continue')
      const sentAt = (await nextSentAt(chatSessionId, (options.now ?? systemClock)().toISOString()))
      const message: DemoRow = {
        message_id: randomUUID(), chat_session_id: chatSessionId, sender_user_id: senderUserId, text: '',
        message_kind: 'Attachment', experience_id: current.experience_id, quote_request_id: current.quote_request_id,
        booking_id: current.booking_id, sent_at: sentAt,
      }
      const rows: BatchOperation[] = planned.flatMap((item): BatchOperation[] => [
        {
          table: 'stored_files',
          row: {
            file_id: item.fileId, storage_key: storageKeyOf(item.fileId), file_name: item.file.name, media_type: item.fileType,
            file_size_bytes: String(item.file.size), width_px: '', height_px: '', uploaded_by: senderUserId, created_at: sentAt,
          },
        },
        {
          table: 'chat_attachments',
          row: { attachment_id: item.attachmentId, message_id: message.message_id, file_id: item.fileId, uploaded_by: senderUserId, created_at: sentAt },
        },
      ])
      if (options.failRecords) options.failRecords()
      ;(await demoRepository().applyBatch([...(await messageOperations(chatSessionId, message, (await recipientOf(chat, senderUserId)))), ...rows]))
      return {
        message_id: message.message_id,
        attachments: planned.map(item => ({ attachment_id: item.attachmentId, file_name: item.file.name, file_type: item.fileType, file_size: item.file.size })),
        sent_at: sentAt,
      }
    })
  } catch (error) {
    for (const fileId of written) await store.remove(fileId)
    throw error
  }
}

/**
 * F-CHAT-05 download (BR-011, BR-020, spec-IAC #40): participants only, Active or Closed Chat; an
 * attachment outside this Chat answers like an unknown one (403, #27); no stored content → 404.
 */
export async function readAttachment(session: SessionContext, chatSessionId: string, attachmentId: string) {
  ;(await requireParticipant(session, chatSessionId))
  const repository = demoRepository()
  const link = (await repository.find('chat_attachments', row => row.attachment_id === attachmentId))
  const message = link && (await repository.find('chat_messages', row => row.message_id === link.message_id))
  if (!link || !message || message.chat_session_id !== chatSessionId) throw new ChatError('FORBIDDEN', 'Chat access denied')
  const stored = (await repository.find('stored_files', row => row.file_id === link.file_id))
  const bytes = stored ? await chatFileStore().read(stored.file_id) : null
  if (!stored || !bytes) throw new ChatError('NOT_FOUND', SEED_FILE_MISSING)
  return { file_name: stored.file_name, file_type: stored.media_type, bytes }
}
