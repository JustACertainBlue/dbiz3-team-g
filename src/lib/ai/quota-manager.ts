import { demoRepository } from '@/lib/db/application-store'

export interface QuotaStatus {
  inCooldown: boolean
  cooldownUntil?: Date
  remainingMs?: number
  reason?: string
  provider: string
  model: string
}

const COOLDOWN_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours
const PROVIDER_NAME = 'cloudflare_workers_ai'
const DEFAULT_MODEL = '@cf/zai-org/glm-4.7-flash'

/**
 * Manages persistent quota exhaustion and 24-hour cooldown tracking.
 * State is persisted in the database, surviving application restarts and Render redeployments.
 */
export class QuotaManager {
  private static inMemoryCooldownUntil: number | null = null

  /**
   * Checks whether the AI provider is currently in a 24-hour quota cooldown.
   */
  static async checkCooldown(provider: string = PROVIDER_NAME): Promise<QuotaStatus> {
    const now = Date.now()

    // 1. Fast path: check in-memory cache if active
    if (this.inMemoryCooldownUntil && this.inMemoryCooldownUntil > now) {
      return {
        inCooldown: true,
        cooldownUntil: new Date(this.inMemoryCooldownUntil),
        remainingMs: this.inMemoryCooldownUntil - now,
        reason: 'Daily free quota exhausted. 24-hour protective cooldown active.',
        provider,
        model: DEFAULT_MODEL,
      }
    }

    // 2. Persistent check from database
    try {
      const repository = demoRepository()
      const records = await repository.all('ai_quota_cooldowns').catch(() => [])
      const activeRecord = records.find(
        (r: any) =>
          r.provider_name === provider &&
          (r.is_active === true || r.is_active === 'true' || r.is_active === 1) &&
          Number(r.cooldown_until) > now
      )

      if (activeRecord) {
        const cooldownUntil = Number(activeRecord.cooldown_until)
        this.inMemoryCooldownUntil = cooldownUntil
        return {
          inCooldown: true,
          cooldownUntil: new Date(cooldownUntil),
          remainingMs: cooldownUntil - now,
          reason: activeRecord.reason || 'Daily free quota exhausted. 24-hour protective cooldown active.',
          provider,
          model: activeRecord.model_name || DEFAULT_MODEL,
        }
      }

      // If previous cooldown has expired, reset memory cache
      this.inMemoryCooldownUntil = null
      return {
        inCooldown: false,
        provider,
        model: DEFAULT_MODEL,
      }
    } catch {
      // If DB read fails, fall back to in-memory check
      if (this.inMemoryCooldownUntil && this.inMemoryCooldownUntil > now) {
        return {
          inCooldown: true,
          cooldownUntil: new Date(this.inMemoryCooldownUntil),
          remainingMs: this.inMemoryCooldownUntil - now,
          reason: 'Daily free quota exhausted.',
          provider,
          model: DEFAULT_MODEL,
        }
      }
      return {
        inCooldown: false,
        provider,
        model: DEFAULT_MODEL,
      }
    }
  }

  /**
   * Records a confirmed quota exhaustion and initiates a full 24-hour cooldown.
   */
  static async recordQuotaExhaustion(
    reason: string = 'Cloudflare Workers AI daily free 10,000 neurons quota exhausted',
    model: string = DEFAULT_MODEL,
    provider: string = PROVIDER_NAME
  ): Promise<QuotaStatus> {
    const now = Date.now()
    const cooldownUntil = now + COOLDOWN_DURATION_MS
    this.inMemoryCooldownUntil = cooldownUntil

    try {
      const repository = demoRepository()
      // Deactivate any previous cooldowns for this provider
      const records = await repository.all('ai_quota_cooldowns').catch(() => [])
      for (const rec of records) {
        if (rec.provider_name === provider && rec.is_active === 'true') {
          await repository.update(
            'ai_quota_cooldowns',
            (r: any) => r.cooldown_id === rec.cooldown_id,
            { is_active: 'false' }
          ).catch(() => {})
        }
      }

      // Insert new 24h cooldown record
      await repository.insert('ai_quota_cooldowns', {
        cooldown_id: `cooldown-${now}`,
        provider_name: provider,
        model_name: model,
        exhausted_at: String(now),
        cooldown_until: String(cooldownUntil),
        reason,
        is_active: 'true',
        created_at: new Date(now).toISOString(),
      }).catch(() => {})
    } catch (err) {
      console.warn('Failed to persist quota cooldown to DB, using memory fallback:', err)
    }

    return {
      inCooldown: true,
      cooldownUntil: new Date(cooldownUntil),
      remainingMs: COOLDOWN_DURATION_MS,
      reason,
      provider,
      model,
    }
  }

  /**
   * Resets cooldown manually (primarily for testing and administration).
   */
  static async resetCooldown(provider: string = PROVIDER_NAME): Promise<void> {
    this.inMemoryCooldownUntil = null
    try {
      const repository = demoRepository()
      const records = await repository.all('ai_quota_cooldowns').catch(() => [])
      for (const rec of records) {
        if (rec.provider_name === provider) {
          await repository.update(
            'ai_quota_cooldowns',
            (r: any) => r.cooldown_id === rec.cooldown_id,
            { is_active: 'false' }
          ).catch(() => {})
        }
      }
    } catch {}
  }
}
