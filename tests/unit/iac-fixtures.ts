// Shared fixtures for the IAC 014 tests (tasks.md "Shared test fixtures"). Values are from data/seed/.
import { DEMO_IDENTITIES } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'

export const AGENCY = DEMO_IDENTITIES.agency
export const PROVIDER = DEMO_IDENTITIES.provider
export const AGENCY_ID = AGENCY.agencyId!          // 02e568d8… Công ty Du lịch Tràng An
export const AGENCY_USER = AGENCY.userId!          // ac233721… Lý Gia Hân
export const PROVIDER_ID = PROVIDER.providerId!    // 50f2c8fc… Bát Tràng
export const PROVIDER_USER = PROVIDER.userId!      // c2c7fe0d… Kiều Anh Thư
export const EXPERIENCE = 'c9f9faf7-2987-5ae4-b1ed-95c095fcce69' // "Nặn gốm thủ công", Provider 50f2c8fc…
export const AGENCY_CHAT = 'a0b57355-8142-5b47-be08-6130aa21c021' // demo Agency ↔ Phú Vinh 0858b5e8…
export const PHU_VINH = '0858b5e8-89e1-577f-904a-562150c4fe4f'
export const PROVIDER_CHAT = '35ed4094-fa5a-55a6-ba1d-c03e56adfe79' // demo Provider ↔ Sông Hồng 2a1f0cc1…, Provider unread 5
export const AGENCY_BOOKING = '0971a1b6-32e2-5581-a02d-d9636e22e1b6' // Completed, demo Agency ↔ Phú Vinh

export const WRITE_TABLES = ['chat_sessions', 'chat_participants', 'chat_messages', 'quote_requests', 'bookings'] as const
export const writeSnapshot = () => JSON.stringify(WRITE_TABLES.map(table => demoRepository().all(table)))

export const repo = () => demoRepository()
export const activePairChats = (agencyId: string, providerId: string) =>
  repo().all('chat_sessions').filter(row => row.agency_id === agencyId && row.provider_id === providerId && row.status === 'Active')
export const participant = (chatId: string, userId: string) =>
  repo().find('chat_participants', row => row.chat_session_id === chatId && row.user_id === userId)

/** Close a Chat through the repository (F-CHAT-04 is feature 015). */
export function closeChat(chatId: string, closedBy: string) {
  repo().update('chat_sessions', row => row.chat_session_id === chatId, { status: 'Closed', closed_at: '2026-10-01T10:00:00+07:00', closed_by: closedBy })
}
