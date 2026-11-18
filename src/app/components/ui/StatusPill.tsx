// Mockup v3 status label: "Đang hoạt động" / "Đã thanh toán" (success), "Chờ duyệt" / "Chờ thanh toán" (warn),
// cancel and warning (danger), neutral chip. Text always carries the meaning; colour only supports it.
import React from 'react'

export type PillTone = 'success' | 'warn' | 'danger' | 'neutral'

export default function StatusPill({ tone = 'neutral', children, className }: { tone?: PillTone; children: React.ReactNode; className?: string }) {
  return <span className={['hab-pill', `hab-pill--${tone}`, className].filter(Boolean).join(' ')}>{children}</span>
}
