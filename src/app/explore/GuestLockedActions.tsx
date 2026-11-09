import React from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'

// spec-EXP FR-001 / FR-003 and BR-009 (#209 EXP120, #202 DSC124): for a Guest, Request Quote and Chat stay
// disabled and show "Login required"; attempting one goes to Login. Rendered as links marked aria-disabled so the
// attempt still reaches /login. No handoff request is made for a Guest.
export default function GuestLockedActions({ buttonClassName }: { buttonClassName: string }) {
  return <div className="guest-locked-actions" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }} role="group" aria-label="Yêu cầu báo giá và Nhắn tin: cần đăng nhập">
    <Link href="/login" aria-disabled="true" className={buttonClassName} style={{ opacity: 0.65 }}><Lock aria-hidden="true" size={16} />Yêu cầu báo giá</Link>
    <Link href="/login" aria-disabled="true" className={buttonClassName} style={{ opacity: 0.65 }}><Lock aria-hidden="true" size={16} />Nhắn tin</Link>
    <p className="guest-locked-note" style={{ width: '100%', margin: 0, fontSize: 13, color: 'var(--color-text-secondary)' }}>Cần đăng nhập</p>
  </div>
}
