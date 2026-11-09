// Status badge (Design System v9 §2, Figma "Status Badge"): icon + Vietnamese label, the same colours on every
// screen; never colour alone. Works in server and client components.
import React from 'react'
import { Ban, Bell, Calendar, Check, CheckCheck, CircleCheck, Clock, Layers, Lock, Pencil, Shield, TriangleAlert, X } from 'lucide-react'
import { statusLook, type StatusFamily, type StatusIcon } from '@/lib/status-labels'

const ICONS: Record<StatusIcon, typeof Clock> = {
  clock: Clock, 'circle-check': CircleCheck, 'check-check': CheckCheck, ban: Ban, calendar: Calendar, lock: Lock,
  pen: Pencil, shield: Shield, alert: TriangleAlert, layers: Layers, check: Check, x: X, bell: Bell,
}

export default function StatusBadge({ family, status, className }: { family: StatusFamily; status: string | null | undefined; className?: string }) {
  const look = statusLook(family, status)
  const Icon = ICONS[look.icon]
  const tone = `--color-status-${look.tone}`
  return (
    <span
      className={['status-badge', className].filter(Boolean).join(' ')}
      data-status={status ?? ''}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)', padding: '2px var(--space-3)',
        borderRadius: 'var(--radius-pill)', font: '600 var(--text-bodysm-size)/var(--text-bodysm-line) var(--font-body)',
        whiteSpace: 'nowrap', color: `var(${tone}-fg)`, background: `var(${tone}-bg)`,
        boxShadow: look.outlined ? `inset 0 0 0 2px var(${tone}-border)` : undefined,
      }}
    >
      <Icon aria-hidden="true" size={16} strokeWidth={2.25} />
      {look.label}
    </span>
  )
}
