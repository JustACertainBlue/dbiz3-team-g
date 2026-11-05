// COM125 / COM126 dialog state (spec-IAC #49): the same checks as the API (BR-009, BR-010, #42, #43),
// shown per file before anything is sent.
import { CHAT_FILES_PER_ACTION, fileError, fileExtension } from '@/lib/iac/chat-file-rules'

export const ATTACH_ERROR_TEXT = {
  UNSUPPORTED_FORMAT: 'Định dạng không hỗ trợ (chỉ PDF, DOC, DOCX, XLS, XLSX, JPG, JPEG, PNG)',
  FILE_TOO_LARGE: 'Tệp lớn hơn 10 MB',
  EMPTY_FILE: 'Tệp rỗng',
} as const
export const TOO_MANY_FILES = `Tối đa ${CHAT_FILES_PER_ACTION} tệp`
export const ACCEPT_ATTRIBUTE = '.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png'

export interface AttachRow {
  name: string
  typeLabel: string
  sizeLabel: string
  error?: string
}

export function sizeLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  return bytes < 1_048_576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1_048_576).toFixed(1)} MB`
}

export function typeLabel(name: string): string {
  return fileExtension(name).toUpperCase()
}

export function attachState(files: readonly { name: string; size: number }[], pending: boolean) {
  const rows: AttachRow[] = files.map(file => {
    const reason = fileError(file)
    const row: AttachRow = { name: file.name, typeLabel: typeLabel(file.name), sizeLabel: sizeLabel(file.size) }
    if (reason) row.error = ATTACH_ERROR_TEXT[reason]
    return row
  })
  const tooMany = files.length > CHAT_FILES_PER_ACTION
  const canSend = files.length > 0 && !tooMany && rows.every(row => !row.error) && !pending
  return tooMany ? { rows, canSend, message: TOO_MANY_FILES } : { rows, canSend }
}
