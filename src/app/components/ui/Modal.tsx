'use client'
// Mockup v3 popup (design-tokens.md; png/20a): overlay rgba(18,26,22,.55), box max 560 px (logout 460 px), radius
// 12-14 px, close "×" top right with aria-label "Đóng". Escape and the overlay close it; Tab stays inside.
import React, { useEffect, useId, useRef } from 'react'

export default function Modal({ open, onClose, title, icon, tone = 'default', width, children, actions, closeDisabled }: {
  open: boolean; onClose: () => void; title: string; icon?: React.ReactNode; tone?: 'default' | 'danger'; width?: number
  children?: React.ReactNode; actions?: React.ReactNode; closeDisabled?: boolean
}) {
  const box = useRef<HTMLDivElement>(null)
  const titleId = useId()
  useEffect(() => {
    if (!open) return
    const previous = document.activeElement as HTMLElement | null
    (box.current?.querySelector<HTMLElement>('[data-autofocus]') ?? box.current?.querySelector<HTMLElement>('button:not(:disabled), a[href]'))?.focus()
    return () => previous?.focus?.()
  }, [open])
  if (!open) return null
  const close = () => { if (!closeDisabled) onClose() }
  function keys(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return }
    if (event.key !== 'Tab') return
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not(:disabled), input, select, textarea'))
    const first = focusable[0], last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus() }
  }
  return <div className="hab-modal" onClick={close}>
    <div ref={box} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`hab-modal__box hab-modal__box--${tone}`}
      style={width ? { maxWidth: width } : undefined} onClick={event => event.stopPropagation()} onKeyDown={keys}>
      <button type="button" className="hab-modal__close" aria-label="Đóng" onClick={close} disabled={closeDisabled}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
      </button>
      {icon && <span className="hab-modal__icon" aria-hidden="true">{icon}</span>}
      <h2 id={titleId} className="hab-modal__title">{title}</h2>
      {children && <div className="hab-modal__body">{children}</div>}
      {actions && <div className="hab-modal__actions">{actions}</div>}
    </div>
  </div>
}
