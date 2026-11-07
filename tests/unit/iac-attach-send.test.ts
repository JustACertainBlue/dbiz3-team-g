// T004, T005: F-CHAT-05 send attachments (FR-005, BR-003, BR-008, BR-011, BR-021, SC-005, AC-IAC-FILE, #41, #44, #45, #47).
import { beforeEach, describe, expect, it } from 'vitest'
import { demoSessionContextFor } from '@/lib/auth/session'
import { chatFileStore } from '@/lib/iac/chat-files'
import { closeChat, getChatHistory, sendAttachments, sendMessage } from '@/lib/iac/chat-service'
import { AGENCY, AGENCY_CHAT, AGENCY_USER, PROVIDER, PROVIDER_CHAT, PROVIDER_USER, participant, repo } from './iac-fixtures'
import { MAX_BYTES, file, resetAll, rowsAndFilesSnapshot } from './iac-attach-fixtures'

const chatRow = (id: string) => repo().find('chat_sessions', r => r.chat_session_id === id)!
const latestSentAt = (id: string) => Math.max(...repo().all('chat_messages').filter(m => m.chat_session_id === id).map(m => Date.parse(m.sent_at)))

describe('T004 | sendAttachments', () => {
  beforeEach(resetAll)

  it('the Agency sends one PDF: one Attachment message, rows, bytes, output (FR-005, #41, #44)', async () => {
    const before = latestSentAt(AGENCY_CHAT)
    const result = await sendAttachments(AGENCY, AGENCY_CHAT, [file('bao-gia.pdf', 'noi dung')])
    expect(result).toEqual({
      message_id: expect.any(String),
      attachments: [{ attachment_id: expect.any(String), file_name: 'bao-gia.pdf', file_type: 'application/pdf', file_size: 8 }],
      sent_at: expect.any(String),
    })
    expect(Date.parse(result.sent_at)).toBeGreaterThan(before)
    const message = repo().find('chat_messages', m => m.message_id === result.message_id)!
    expect(message).toMatchObject({ chat_session_id: AGENCY_CHAT, sender_user_id: AGENCY_USER, message_kind: 'Attachment', sent_at: result.sent_at })
    expect(message.text ?? '').toBe('')
    const link = repo().find('chat_attachments', a => a.attachment_id === result.attachments[0].attachment_id)!
    expect(link).toMatchObject({ message_id: result.message_id, uploaded_by: AGENCY_USER })
    const stored = repo().find('stored_files', f => f.file_id === link.file_id)!
    expect(stored).toMatchObject({
      storage_key: `chat-files/${link.file_id}`, file_name: 'bao-gia.pdf', media_type: 'application/pdf',
      uploaded_by: AGENCY_USER,
    })
    expect(Number(stored.file_size_bytes)).toBe(8)
    expect(new TextDecoder().decode((await chatFileStore().read(link.file_id))!)).toBe('noi dung')
  })

  it('the Provider sends five files in one message; PNG stored without dimensions (BR-010, #41, #44)', async () => {
    const files = [file('a.pdf'), file('b.docx'), file('c.xlsx'), file('d.jpg'), file('so-do.PNG', MAX_BYTES)]
    const result = await sendAttachments(PROVIDER, PROVIDER_CHAT, files)
    expect(result.attachments.map(a => a.file_name)).toEqual(['a.pdf', 'b.docx', 'c.xlsx', 'd.jpg', 'so-do.PNG'])
    expect(result.attachments[4]).toMatchObject({ file_type: 'image/png', file_size: MAX_BYTES })
    expect(repo().all('chat_messages').filter(m => m.message_id === result.message_id)).toHaveLength(1)
    const links = repo().all('chat_attachments').filter(a => a.message_id === result.message_id)
    expect(links).toHaveLength(5)
    const png = repo().find('stored_files', f => f.file_id === links.find(l => l.attachment_id === result.attachments[4].attachment_id)!.file_id)!
    expect(png.width_px ?? '').toBe('')
    expect(png.height_px ?? '').toBe('')
  })

  it('recipient unread +1, last_message_at = sent_at; the sender unread unchanged (#47, #26)', async () => {
    const agencyUserOfChat = repo().all('chat_participants').find(p => p.chat_session_id === PROVIDER_CHAT && p.user_id !== PROVIDER_USER)!.user_id
    const unreadBefore = Number(participant(PROVIDER_CHAT, agencyUserOfChat)!.unread_count || 0)
    const senderBefore = participant(PROVIDER_CHAT, PROVIDER_USER)!.unread_count
    const result = await sendAttachments(PROVIDER, PROVIDER_CHAT, [file('a.pdf')])
    expect(Number(participant(PROVIDER_CHAT, agencyUserOfChat)!.unread_count)).toBe(unreadBefore + 1)
    expect(participant(PROVIDER_CHAT, PROVIDER_USER)!.unread_count).toBe(senderBefore)
    expect(chatRow(PROVIDER_CHAT).last_message_at).toBe(result.sent_at)
  })

  it('history returns the attachment message with its attachments; a text sent right after comes later (BR-011, SC-005)', async () => {
    const result = await sendAttachments(AGENCY, AGENCY_CHAT, [file('lich-trinh.xlsx')])
    const text = await sendMessage(AGENCY, AGENCY_CHAT, 'Đã gửi lịch trình')
    expect(Date.parse(text.sent_at)).toBeGreaterThan(Date.parse(result.sent_at))
    const history = await getChatHistory(AGENCY, AGENCY_CHAT)
    const item = history.message_history.find(m => m.message_id === result.message_id)!
    expect(item.attachments).toEqual(result.attachments)
    expect(item.message_kind).toBe('Attachment')
  })
})

describe('T005 | refused requests store nothing', async () => {
  beforeEach(resetAll)

  it.each([
    ['guest', (await demoSessionContextFor('guest')), AGENCY_CHAT],
    ['ubnd', (await demoSessionContextFor('ubnd')), AGENCY_CHAT],
    ['hdt', (await demoSessionContextFor('hdt')), AGENCY_CHAT],
    ['non-participant Provider', PROVIDER, AGENCY_CHAT],
    ['non-participant Agency', AGENCY, PROVIDER_CHAT],
    ['unknown Chat', AGENCY, '00000000-0000-0000-0000-000000000000'],
  ])('%s → 403 FORBIDDEN (BR-003, #47)', async (_label, session, chatId) => {
    const before = rowsAndFilesSnapshot()
    await expect(sendAttachments(session, chatId, [file('a.pdf')])).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
    expect(rowsAndFilesSnapshot()).toBe(before)
  })

  it('an invalid batch → 400 with file_errors (AC-IAC-FILE, #45)', async () => {
    const before = rowsAndFilesSnapshot()
    await expect(sendAttachments(AGENCY, AGENCY_CHAT, [file('a.pdf'), file('b.txt')])).rejects.toMatchObject({
      code: 'VALIDATION_ERROR', statusCode: 400, fileErrors: [{ file_name: 'b.txt', reason: 'UNSUPPORTED_FORMAT' }],
    })
    await expect(sendAttachments(AGENCY, AGENCY_CHAT, [])).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    expect(rowsAndFilesSnapshot()).toBe(before)
  })

  it('a Closed Chat → 409 CHAT_CLOSED (BR-021, #47)', async () => {
    await closeChat(AGENCY, AGENCY_CHAT, {})
    const before = rowsAndFilesSnapshot()
    await expect(sendAttachments(AGENCY, AGENCY_CHAT, [file('a.pdf')])).rejects.toMatchObject({ code: 'CHAT_CLOSED', statusCode: 409 })
    expect(rowsAndFilesSnapshot()).toBe(before)
  })
})
