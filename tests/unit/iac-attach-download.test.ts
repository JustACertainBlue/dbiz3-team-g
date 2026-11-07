// T007: F-CHAT-05 download (BR-011, BR-020, SC-005, spec-IAC #40).
import { beforeEach, describe, expect, it } from 'vitest'
import { demoSessionContextFor } from '@/lib/auth/session'
import { closeChat, readAttachment, sendAttachments } from '@/lib/iac/chat-service'
import { AGENCY, AGENCY_CHAT, PROVIDER, PROVIDER_CHAT } from './iac-fixtures'
import { SEED_AGENCY_ATTACHMENT, SEED_PROVIDER_ATTACHMENT, file, resetAll, rowsAndFilesSnapshot, seedAttachmentId } from './iac-attach-fixtures'

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes)

describe('T007 | readAttachment', () => {
  beforeEach(resetAll)

  it('the sender and the other participant read the bytes, name and type; reading writes nothing', async () => {
    const sent = await sendAttachments(PROVIDER, PROVIDER_CHAT, [file('bao-gia.pdf', 'PDF-1')])
    const id = sent.attachments[0].attachment_id
    const before = rowsAndFilesSnapshot()
    const own = await readAttachment(PROVIDER, PROVIDER_CHAT, id)
    expect(own).toMatchObject({ file_name: 'bao-gia.pdf', file_type: 'application/pdf' })
    expect(text(own.bytes)).toBe('PDF-1')
    expect(rowsAndFilesSnapshot()).toBe(before)
  })

  it('files of a Closed Chat stay downloadable (BR-020, #40)', async () => {
    const sent = await sendAttachments(AGENCY, AGENCY_CHAT, [file('hop-dong.docx', 'DOCX')])
    await closeChat(AGENCY, AGENCY_CHAT, {})
    expect(text((await readAttachment(AGENCY, AGENCY_CHAT, sent.attachments[0].attachment_id)).bytes)).toBe('DOCX')
  })

  it('non-participant, unknown Chat, attachment of another Chat, Guest, UBND, HDT → 403 (BR-011, #40, #27)', async () => {
    const sent = await sendAttachments(PROVIDER, PROVIDER_CHAT, [file('a.pdf')])
    const id = sent.attachments[0].attachment_id
    const cases: [typeof AGENCY, string, string][] = [
      [AGENCY, PROVIDER_CHAT, id],
      [AGENCY, '00000000-0000-0000-0000-000000000000', id],
      [AGENCY, AGENCY_CHAT, id], // AGENCY is a participant of AGENCY_CHAT, but the attachment is not in it
      [AGENCY, AGENCY_CHAT, 'no-such-attachment'],
      [(await demoSessionContextFor('guest')), PROVIDER_CHAT, id],
      [(await demoSessionContextFor('ubnd')), PROVIDER_CHAT, id],
      [(await demoSessionContextFor('hdt')), PROVIDER_CHAT, id],
    ]
    for (const [session, chatId, attachmentId] of cases) {
      await expect(readAttachment(session, chatId, attachmentId)).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 })
    }
  })

  it('a seed attachment has no content → 404 "Tệp mẫu không có nội dung." (#40)', async () => {
    await expect(readAttachment(AGENCY, AGENCY_CHAT, seedAttachmentId(SEED_AGENCY_ATTACHMENT)))
      .rejects.toMatchObject({ code: 'NOT_FOUND', statusCode: 404, message: 'Tệp mẫu không có nội dung.' })
    await expect(readAttachment(PROVIDER, PROVIDER_CHAT, seedAttachmentId(SEED_PROVIDER_ATTACHMENT)))
      .rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})
