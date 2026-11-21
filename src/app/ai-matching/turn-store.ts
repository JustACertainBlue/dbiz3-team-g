/**
 * Screen 22 memory of answered turns, kept in the browser only (localStorage), per agency id + session id.
 * The server stores only the Agency's messages; the answers, chips and cards of each turn live here so an
 * earlier conversation reopens exactly as it was, on the same browser. Every call is wrapped: a blocked, full or
 * missing storage never breaks the screen.
 */
export const MAX_STORED_SESSIONS = 20
const PREFIX = 'hab.ai-matching.v1'

export interface StorageLike {
  readonly length: number
  key(index: number): string | null
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface StoredTurns<M = { id: string; sender: 'Agency' | 'Assistant'; text: string; sent_at: string; [more: string]: unknown }> {
  messages: M[]
  chips: string[]
}

export const turnKey = (agencyId: string, sessionId: string) => `${PREFIX}:${agencyId}:${sessionId}`

export function loadTurns(storage: StorageLike | null, agencyId: string, sessionId: string): StoredTurns | null {
  try {
    const raw = storage?.getItem(turnKey(agencyId, sessionId))
    if (!raw) return null
    const data = JSON.parse(raw) as { messages?: unknown; chips?: unknown }
    if (!Array.isArray(data.messages) || data.messages.length === 0) return null
    return { messages: data.messages as StoredTurns['messages'], chips: Array.isArray(data.chips) ? data.chips as string[] : [] }
  } catch {
    return null
  }
}

export function saveTurns(storage: StorageLike | null, agencyId: string, sessionId: string, turns: StoredTurns, now: Date = new Date()): void {
  if (!storage) return
  try {
    storage.setItem(turnKey(agencyId, sessionId), JSON.stringify({ savedAt: now.toISOString(), ...turns }))
  } catch {
    return
  }
  try {
    const prefix = `${PREFIX}:${agencyId}:`
    const own: { key: string; savedAt: number }[] = []
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i)
      if (!key || !key.startsWith(prefix)) continue
      let savedAt = 0
      try { savedAt = Date.parse((JSON.parse(storage.getItem(key) ?? '{}') as { savedAt?: string }).savedAt ?? '') || 0 } catch { savedAt = 0 }
      own.push({ key, savedAt })
    }
    own.sort((a, b) => b.savedAt - a.savedAt)
    for (const old of own.slice(MAX_STORED_SESSIONS)) storage.removeItem(old.key)
  } catch {
    // Trimming is best effort.
  }
}
