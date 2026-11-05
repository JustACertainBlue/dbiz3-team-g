// T002: shared fixtures for the IAC 016 attachment tests. Seed values are from data/seed/.
import { chatFileStore, type IncomingFile } from '@/lib/iac/chat-files'
import { repo } from './iac-fixtures'

export const MAX_BYTES = 10_485_760 // spec-IAC #43
export const ATTACH_TABLES = ['chat_sessions', 'chat_participants', 'chat_messages', 'stored_files', 'chat_attachments'] as const

/** A file as the service receives it; `size` defaults to the byte length. */
export function file(name: string, content: string | number = 'demo'): IncomingFile {
  if (typeof content === 'number') return { name, size: content, bytes: new Uint8Array(Math.min(content, 16)) }
  const bytes = new TextEncoder().encode(content)
  return { name, size: bytes.length, bytes }
}

/** Rows of every table this slice writes plus the ids held by the file store (lesson #15). */
export const rowsAndFilesSnapshot = () =>
  JSON.stringify({ rows: ATTACH_TABLES.map(t => repo().all(t)), files: chatFileStore().ids().sort() })

export function resetAll() {
  repo().reset()
  chatFileStore().clear()
}

// data/seed/chat_attachments.csv: e64a4f0b… is in the demo Agency Chat a0b57355…, ce1092ad… in the demo Provider Chat 35ed4094….
export const SEED_AGENCY_ATTACHMENT = 'e64a4f0b'
export const SEED_PROVIDER_ATTACHMENT = 'ce1092ad'
export const seedAttachmentId = (prefix: string) => repo().find('chat_attachments', r => r.attachment_id.startsWith(prefix))!.attachment_id
