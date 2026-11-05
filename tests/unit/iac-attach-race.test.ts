// T006: upload succeeds but attaching fails (#46) and attach vs close (#47, #38, lesson #13).
import { beforeEach, describe, expect, it } from 'vitest'
import { chatFileStore } from '@/lib/iac/chat-files'
import { closeChat, sendAttachments } from '@/lib/iac/chat-service'
import { PROVIDER, PROVIDER_CHAT, repo } from './iac-fixtures'
import { file, resetAll } from './iac-attach-fixtures'

const ROW_TABLES = ['chat_messages', 'stored_files', 'chat_attachments', 'chat_participants'] as const
const rows = () => JSON.stringify(ROW_TABLES.map(t => repo().all(t)))

describe('T006 | failure cleanup and close race', () => {
  beforeEach(resetAll)

  it('(a) the Chat is closed after the files were written → 409, no message, files removed', async () => {
    let filesSeenDuringPause: string[] = []
    const before = rows()
    await expect(sendAttachments(PROVIDER, PROVIDER_CHAT, [file('a.pdf'), file('b.xlsx')], {
      afterFilesWritten: async () => {
        filesSeenDuringPause = chatFileStore().ids()
        await closeChat(PROVIDER, PROVIDER_CHAT, {})
      },
    })).rejects.toMatchObject({ code: 'CHAT_CLOSED', statusCode: 409 })
    expect(filesSeenDuringPause).toHaveLength(2) // the seam really runs after the write
    expect(rows()).toBe(before)
    expect(chatFileStore().ids()).toEqual([])
  })

  it('(b) writing the records fails → the error is thrown, no rows, files removed', async () => {
    const before = rows()
    await expect(sendAttachments(PROVIDER, PROVIDER_CHAT, [file('a.pdf'), file('b.png')], {
      failRecords: () => { throw new Error('disk full') },
    })).rejects.toThrow('disk full')
    expect(rows()).toBe(before)
    expect(chatFileStore().ids()).toEqual([])
  })

  it('(c) a later valid upload still works after a failed one', async () => {
    await expect(sendAttachments(PROVIDER, PROVIDER_CHAT, [file('a.pdf')], { failRecords: () => { throw new Error('x') } })).rejects.toThrow()
    const ok = await sendAttachments(PROVIDER, PROVIDER_CHAT, [file('a.pdf')])
    expect(chatFileStore().ids()).toHaveLength(1)
    expect(repo().all('chat_attachments').filter(a => a.message_id === ok.message_id)).toHaveLength(1)
  })
})
