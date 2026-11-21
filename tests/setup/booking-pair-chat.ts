import { beforeAll, expect } from 'vitest'

// UI v3 decision #1: a Provider can book only for an Agency that already chatted with it.
// The synthetic seed (data/, human-owned) has no chat between the demo Tour Agency and the demo Local Provider,
// so every fixture reset also gets one Closed chat (id below) for that pair. A Closed chat never counts as the
// pair's Active Chat (IAC FR-001). tests/unit/v3-booking-rules.test.ts removes it by id to test "never chatted".
// Skipped for tests that count seed rows or mock the file system (EXCLUDED); they must import the repository untouched.
// The test path is read when the file starts running (beforeAll), not at import: with one shared worker
// (--pool=forks singleFork) the import-time value is not reliable.
// Proper fix: add this chat row to data/seed (the data/ owner decides), then delete this file and its setupFiles entry.
const EXCLUDED = /iac-seed|json-lock-eperm/

beforeAll(async () => {
  if (EXCLUDED.test(expect.getState().testPath ?? '')) return
  const { JsonDemoRepository } = await import('@/lib/demo/json-repository')
  const proto = JsonDemoRepository.prototype as unknown as { reset: () => void; __pairChat?: true }
  if (proto.__pairChat) return
  proto.__pairChat = true
  const original = proto.reset
  proto.reset = function resetWithPairChat(this: InstanceType<typeof JsonDemoRepository>) {
    original.call(this)
    if (EXCLUDED.test(expect.getState().testPath ?? '')) return // the patch can outlive its file in a shared worker
    this.insert('chat_sessions', {
      chat_session_id: 'f0f0f0f0-0000-4000-8000-000000000001', agency_id: '02e568d8-d65e-54b1-a554-b411150d1dcb', provider_id: '50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374',
      source: 'Explore', matching_session_id: '', experience_id: '', quote_request_id: '', booking_id: '', status: 'Closed',
      started_at: '2026-09-01T08:00:00+07:00', last_message_at: '', closed_at: '2026-09-02T08:00:00+07:00', closed_by: 'ac233721-7dd3-5466-941b-dc7d5d1b0bfa',
    })
  }
})
