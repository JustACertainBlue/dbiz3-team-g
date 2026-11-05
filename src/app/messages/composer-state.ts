// Pure helper for the COM048 / COM065 composer: FR-002 ≤ 4000 code points of the trimmed text (spec-IAC #25),
// Send disabled while a send is pending (Q8), a Closed Chat is read-only (BR-021).
export const MESSAGE_LIMIT = 4000

export function composerState(input: { text: string; pending: boolean; chatStatus: string }) {
  const length = [...input.text.trim()].length
  const readOnly = input.chatStatus !== 'Active'
  return {
    canSend: !readOnly && !input.pending && length > 0 && length <= MESSAGE_LIMIT,
    counter: `${length}/${MESSAGE_LIMIT}`,
    readOnly,
  }
}
