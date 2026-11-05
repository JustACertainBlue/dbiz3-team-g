// T009: POST /api/iac/chats/{id}/attachments and GET …/attachments/{attachmentId} (contracts/attach-api.md).
import { beforeEach, describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as uploadRoute } from '@/app/api/iac/chats/[id]/attachments/route'
import { GET as downloadRoute } from '@/app/api/iac/chats/[id]/attachments/[attachmentId]/route'
import { POST as closeRoute } from '@/app/api/iac/chats/[id]/close/route'
import { AGENCY_CHAT, PROVIDER_CHAT } from '../unit/iac-fixtures'
import { SEED_AGENCY_ATTACHMENT, resetAll, rowsAndFilesSnapshot, seedAttachmentId } from '../unit/iac-attach-fixtures'

const base = 'http://localhost:3000/api/iac/chats'

function form(files: [string, string][]) {
  const data = new FormData()
  for (const [name, content] of files) data.append('files', new File([content], name))
  return data
}

async function upload(account: string, id: string, body: FormData | string) {
  const request = new NextRequest(`${base}/${id}/attachments`, {
    method: 'POST',
    headers: typeof body === 'string' ? { cookie: `hab_demo_account=${account}`, 'content-type': 'application/json' } : { cookie: `hab_demo_account=${account}` },
    body,
  })
  const response = await uploadRoute(request as never, { params: { id } } as never)
  return { status: response.status, body: await response.json() as any }
}

async function download(account: string, id: string, attachmentId: string) {
  const request = new NextRequest(`${base}/${id}/attachments/${attachmentId}`, { headers: { cookie: `hab_demo_account=${account}` } })
  return downloadRoute(request as never, { params: { id, attachmentId } } as never)
}

describe('T009 | attachments API', () => {
  beforeEach(resetAll)

  it('201 with the FR-005 output, then the participant downloads the bytes with safe headers', async () => {
    const created = await upload('agency', AGENCY_CHAT, form([['báo giá tháng 11.pdf', 'demo']]))
    expect(created).toEqual({ status: 201, body: { data: {
      message_id: expect.any(String),
      attachments: [{ attachment_id: expect.any(String), file_name: 'báo giá tháng 11.pdf', file_type: 'application/pdf', file_size: 4 }],
      sent_at: expect.any(String),
    } } })
    const response = await download('agency', AGENCY_CHAT, created.body.data.attachments[0].attachment_id)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('application/pdf')
    expect(response.headers.get('content-disposition')).toBe(`attachment; filename*=UTF-8''${encodeURIComponent('báo giá tháng 11.pdf')}`)
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect(await response.text()).toBe('demo')
  })

  it('400 with file_errors for a bad file; 400 for 6 files and for a body that is not multipart; nothing stored', async () => {
    const before = rowsAndFilesSnapshot()
    const bad = await upload('agency', AGENCY_CHAT, form([['a.pdf', 'x'], ['b.txt', 'y']]))
    expect(bad).toEqual({ status: 400, body: { error: { code: 'VALIDATION_ERROR', message: expect.any(String), file_errors: [{ file_name: 'b.txt', reason: 'UNSUPPORTED_FORMAT' }] } } })
    const six = await upload('agency', AGENCY_CHAT, form(Array.from({ length: 6 }, (_, i) => [`f${i}.pdf`, 'x'] as [string, string])))
    expect(six.status).toBe(400)
    expect((await upload('agency', AGENCY_CHAT, '{"files":[]}')).status).toBe(400)
    expect(rowsAndFilesSnapshot()).toBe(before)
  })

  it('403 for a non-participant, unknown Chat, guest, ubnd, hdt (upload and download)', async () => {
    const created = await upload('provider', PROVIDER_CHAT, form([['a.pdf', 'x']]))
    const id = created.body.data.attachments[0].attachment_id
    expect((await upload('agency', PROVIDER_CHAT, form([['a.pdf', 'x']]))).status).toBe(403)
    expect((await upload('provider', 'no-such-chat', form([['a.pdf', 'x']]))).status).toBe(403)
    for (const account of ['guest', 'ubnd', 'hdt']) {
      expect((await upload(account, PROVIDER_CHAT, form([['a.pdf', 'x']]))).status).toBe(403)
      expect((await download(account, PROVIDER_CHAT, id)).status).toBe(403)
    }
    expect((await download('agency', PROVIDER_CHAT, id)).status).toBe(403)
  })

  it('409 after close; earlier files still download; seed file → 404', async () => {
    const created = await upload('agency', AGENCY_CHAT, form([['a.pdf', 'truoc khi dong']]))
    const closeRequest = new NextRequest(`${base}/${AGENCY_CHAT}/close`, { method: 'POST', headers: { cookie: 'hab_demo_account=agency', 'content-type': 'application/json' }, body: '{}' })
    expect((await closeRoute(closeRequest as never, { params: { id: AGENCY_CHAT } } as never)).status).toBe(200)
    expect(await upload('agency', AGENCY_CHAT, form([['b.pdf', 'x']]))).toEqual({ status: 409, body: { error: { code: 'CHAT_CLOSED', message: expect.any(String) } } })
    const old = await download('agency', AGENCY_CHAT, created.body.data.attachments[0].attachment_id)
    expect(old.status).toBe(200)
    expect(await old.text()).toBe('truoc khi dong')
    const seed = await download('agency', AGENCY_CHAT, seedAttachmentId(SEED_AGENCY_ATTACHMENT))
    expect(seed.status).toBe(404)
    expect(await seed.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Tệp mẫu không có nội dung.' } })
  })
})
