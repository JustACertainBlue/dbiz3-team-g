import { beforeEach, describe, expect, it, vi } from 'vitest'

const inserted: Array<{ table: string; row: Record<string, unknown> }> = []
vi.mock('@/lib/db/application-store', () => ({
  demoRepository: () => ({
    all: async () => [],
    update: async () => undefined,
    insert: async (table: string, row: Record<string, unknown>) => { inserted.push({ table, row }) },
  }),
}))

import { QuotaManager } from '@/lib/ai/quota-manager'

describe('QuotaManager cooldown persistence', () => {
  beforeEach(async () => { inserted.length = 0; await QuotaManager.resetCooldown() })

  it('writes cooldown_id as a uuid, matching the uuid column of ai_quota_cooldowns', async () => {
    const status = await QuotaManager.recordQuotaExhaustion('quota exhausted')
    expect(status.inCooldown).toBe(true)
    expect(inserted).toHaveLength(1)
    expect(inserted[0].table).toBe('ai_quota_cooldowns')
    expect(String(inserted[0].row.cooldown_id)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })
})
