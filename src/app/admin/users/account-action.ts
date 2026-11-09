// ADM118 (F-AUTH-22): request body of the disable / enable action. #160: an optional Reason is
// sent for disable only (screen-spec-ADM118 element #4); an empty field sends none, so the server
// stores its default text.
export { DEFAULT_DISABLE_REASON } from '@/lib/auth/disable-reason'

export function accountActionBody(user: { user_id: string; status: string }, reason: string): Record<string, string> {
  if (user.status === 'Disabled') return { user_id: user.user_id, action: 'enable' }
  const text = reason.trim()
  return text ? { user_id: user.user_id, action: 'disable', reason: text } : { user_id: user.user_id, action: 'disable' }
}
