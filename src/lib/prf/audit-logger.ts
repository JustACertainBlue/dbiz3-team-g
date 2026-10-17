/**
 * Audit log recording helper (FR-002, FR-004, FR-005, FR-006)
 * Target schema matches data/seed/audit_logs.csv:
 * audit_id, actor_user_id, action, target_type, target_id, occurred_at, change_or_result
 */

export interface AuditLogEntry {
  audit_id: string
  actor_user_id: string
  action: string
  target_type: string
  target_id: string
  occurred_at: string
  change_or_result: Record<string, unknown> | string
}

export const inMemoryAuditLogs: AuditLogEntry[] = []

export function recordAuditLog(
  actorUserId: string,
  action: string,
  targetType: string,
  targetId: string,
  changeOrResult: Record<string, unknown> | string,
): AuditLogEntry {
  const entry: AuditLogEntry = {
    audit_id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    actor_user_id: actorUserId,
    action,
    target_type: targetType,
    target_id: targetId,
    occurred_at: new Date().toISOString(),
    change_or_result: changeOrResult,
  }
  inMemoryAuditLogs.push(entry)
  return entry
}
