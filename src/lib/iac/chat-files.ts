import { writeObject,readObject,removeObject } from '../storage/object-store'
import { ChatError } from './chat-access'
import { CHAT_FILES_PER_ACTION, fileError, type FileError } from './chat-file-rules'

// IAC F-CHAT-05 file rules (spec-IAC BR-009, BR-010, #39, #42, #43, #45) and the private file store.

export { CHAT_FILE_MAX_BYTES, CHAT_FILES_PER_ACTION, CHAT_FILE_TYPES, classifyFile, fileError, fileExtension } from './chat-file-rules'

export interface IncomingFile {
  name: string
  size: number
  bytes: Uint8Array
}

/** BR-009, BR-010, #45: 1–5 files, every file valid; otherwise 400 with every file error. */
export function validateBatch(files: readonly { name: string; size: number }[]): void {
  if (files.length === 0) throw new ChatError('VALIDATION_ERROR', 'Choose at least one file')
  if (files.length > CHAT_FILES_PER_ACTION) throw new ChatError('VALIDATION_ERROR', `At most ${CHAT_FILES_PER_ACTION} files per attachment`)
  const errors: FileError[] = []
  for (const file of files) {
    const reason = fileError(file)
    if (reason) errors.push({ file_name: file.name, reason })
  }
  if (errors.length) throw new ChatError('VALIDATION_ERROR', 'Some files cannot be attached', errors)
}

export interface ChatFileStore {
  write(fileId: string, bytes: Uint8Array): void | Promise<void>
  read(fileId: string): Uint8Array | null | Promise<Uint8Array|null>
  remove(fileId: string): void | Promise<void>
  ids(): string[]
  clear(): void
}

/** Tests keep files in memory, like the volatile repository. */
class MemoryChatFileStore implements ChatFileStore {
  private readonly files = new Map<string, Uint8Array>()
  write(fileId: string, bytes: Uint8Array) { this.files.set(fileId, new Uint8Array(bytes)) }
  read(fileId: string) { return this.files.get(fileId) ?? null }
  remove(fileId: string) { this.files.delete(fileId) }
  ids() { return [...this.files.keys()] }
  clear() { this.files.clear() }
}

class SupabaseChatFileStore implements ChatFileStore {
  async write(id:string,bytes:Uint8Array){await writeObject(storageKeyOf(id),bytes,'application/octet-stream')}
  async read(id:string){return readObject(storageKeyOf(id))}
  async remove(id:string){await removeObject(storageKeyOf(id))}
  ids():string[]{throw new Error('Remote storage enumeration is an administrative operation')}
  clear():void{throw new Error('Remote storage cannot be cleared by the application')}
}

declare global {
  // eslint-disable-next-line no-var
  var __habChatFileStore: ChatFileStore | undefined
}

export function chatFileStore(): ChatFileStore {
  return globalThis.__habChatFileStore ??= process.env.NODE_ENV === 'test' && process.env.HAB_TEST_STORAGE !== '1'
    ? new MemoryChatFileStore()
    : new SupabaseChatFileStore()
}

export const storageKeyOf = (fileId: string) => `chat-files/${fileId}`
