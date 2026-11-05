// IAC F-CHAT-05 file rules shared by the API and the browser (spec-IAC BR-009, BR-010, #42, #43).
// No Node.js imports: the /messages page uses this module too.

export const CHAT_FILE_MAX_BYTES = 10_485_760 // #43
export const CHAT_FILES_PER_ACTION = 5 // BR-010

/** #42: the format is the file-name extension; file_type is derived from it. */
export const CHAT_FILE_TYPES: Readonly<Record<string, string>> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
}

/** spec-IAC #45: one entry per invalid file of an attachment batch. */
export interface FileError {
  file_name: string
  reason: 'UNSUPPORTED_FORMAT' | 'FILE_TOO_LARGE' | 'EMPTY_FILE'
}

export function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}

/** MIME type for a supported file name, or null (#42; the browser MIME type is never used). */
export function classifyFile(name: string): string | null {
  return Object.prototype.hasOwnProperty.call(CHAT_FILE_TYPES, fileExtension(name)) ? CHAT_FILE_TYPES[fileExtension(name)] : null
}

export function fileError(file: { name: string; size: number }): FileError['reason'] | null {
  if (!classifyFile(file.name)) return 'UNSUPPORTED_FORMAT'
  if (file.size <= 0) return 'EMPTY_FILE'
  if (file.size > CHAT_FILE_MAX_BYTES) return 'FILE_TOO_LARGE'
  return null
}
