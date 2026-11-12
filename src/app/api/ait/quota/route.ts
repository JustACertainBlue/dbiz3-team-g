import { NextResponse } from 'next/server'
import { QuotaManager } from '@/lib/ai/quota-manager'

export async function GET() {
  try {
    const status = await QuotaManager.checkCooldown()
    return NextResponse.json({
      in_cooldown: status.inCooldown,
      cooldown_until: status.cooldownUntil?.toISOString() || null,
      remaining_seconds: status.remainingMs ? Math.round(status.remainingMs / 1000) : 0,
      provider: status.provider,
      model: status.model,
      reason: status.reason || null,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 })
  }
}
