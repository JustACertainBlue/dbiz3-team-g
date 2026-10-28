import { randomUUID } from 'node:crypto'
import { demoRepository } from '@/lib/demo/json-repository'

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
    audit_id: randomUUID(),
    actor_user_id: actorUserId,
    action,
    target_type: targetType,
    target_id: targetId,
    occurred_at: new Date().toISOString(),
    change_or_result: changeOrResult,
  }
  inMemoryAuditLogs.push(entry)
  demoRepository().insert('audit_logs', {
    audit_id: entry.audit_id,
    actor_user_id: entry.actor_user_id,
    action: entry.action,
    target_type: entry.target_type,
    target_id: entry.target_id,
    occurred_at: entry.occurred_at,
    change_or_result: typeof entry.change_or_result === 'string' ? entry.change_or_result : JSON.stringify(entry.change_or_result),
  })
  return entry
}
