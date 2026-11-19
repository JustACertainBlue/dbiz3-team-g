'use client'
// Screen 02 below 900 px (human review 2026-11-19): "Lọc (n)" opens a full-screen filter sheet (dialog titled "Lọc",
// × close, Escape closes and returns focus to the button) with a sticky bottom bar "Xoá bộ lọc" / "Xem N kết quả".
// Filter changes update the URL at once (FilterPanel), so "Xem N kết quả" only closes the sheet.
import React, { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SlidersHorizontal, X } from 'lucide-react'

export default function MobileFilters({ count, total, clearHref, initiallyOpen = false, children }: {
  count: number; total: number; clearHref: string; initiallyOpen?: boolean; children?: React.ReactNode
}) {
  const [open, setOpen] = useState(initiallyOpen)
  const button = useRef<HTMLButtonElement>(null)
  const close = useCallback(() => { setOpen(false); button.current?.focus() }, [])
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); close() } }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow }
  }, [open, close])
  return <>
    <button ref={button} type="button" className="v3s-filterbtn" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <SlidersHorizontal aria-hidden="true" />Lọc ({count})</button>
    {open && <div className="v3s-sheet" role="dialog" aria-modal="true" aria-labelledby="v3s-sheet-title">
      <div className="v3s-sheet__head"><h2 id="v3s-sheet-title" className="v3s-sheet__title">Lọc</h2>
        <button type="button" className="v3s-sheet__close" aria-label="Đóng bảng lọc" autoFocus onClick={close}><X aria-hidden="true" /></button></div>
      <div className="v3s-sheet__body">{children}</div>
      <div className="v3s-sheet__bar"><Link className="hab-btn hab-btn--secondary" href={clearHref}>Xoá bộ lọc</Link><button type="button" className="hab-btn hab-btn--primary" onClick={close}>Xem {total} kết quả</button></div>
    </div>}
  </>
}
