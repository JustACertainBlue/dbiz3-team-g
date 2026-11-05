// T008: list preview of an attachment message (#48) and the seed check (Session 5 data package).
import { beforeEach, describe, expect, it } from 'vitest'
import { getChatHistory, listChats, sendAttachments } from '@/lib/iac/chat-service'
import { AGENCY, AGENCY_CHAT, PROVIDER, PROVIDER_CHAT } from './iac-fixtures'
import { SEED_AGENCY_ATTACHMENT, file, resetAll } from './iac-attach-fixtures'

describe('T008 | list preview and seed attachments', () => {
  beforeEach(resetAll)

  it('the latest attachment message previews as "Tệp đính kèm: <names>" for both participants (#48)', async () => {
    await sendAttachments(PROVIDER, PROVIDER_CHAT, [file('bao-gia.pdf'), file('lich-trinh.xlsx')])
    const entry = listChats(PROVIDER).find(c => c.chat_session_id === PROVIDER_CHAT)!
    expect(entry.last_message_preview).toBe('Tệp đính kèm: bao-gia.pdf, lich-trinh.xlsx')
  })

  it('seed: the demo Agency Chat lists attachment e64a4f0b… as Hinh-anh-chatfile-2.jpg, image/jpeg, 1400000 bytes', async () => {
    const history = await getChatHistory(AGENCY, AGENCY_CHAT)
    const attachment = history.message_history.flatMap(m => m.attachments).find(a => a.attachment_id.startsWith(SEED_AGENCY_ATTACHMENT))
    expect(attachment).toMatchObject({ file_name: 'Hinh-anh-chatfile-2.jpg', file_type: 'image/jpeg', file_size: 1400000 })
  })
})
