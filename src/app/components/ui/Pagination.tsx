// Mockup v3 pagination (README rule 5): "Hiển thị x–y / N" on the left, two round 44 px arrow buttons on the right;
// a disabled arrow uses --c-disabled. Arrows are links when an href is given, otherwise buttons.
import Link from 'next/link'
import React from 'react'

type Arrow = { href?: string; onClick?: () => void }

function ArrowControl({ dir, arrow }: { dir: 'prev' | 'next'; arrow?: Arrow }) {
  const label = dir === 'prev' ? 'Trang trước' : 'Trang sau'
  const icon = <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={dir === 'prev' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} /></svg>
  if (arrow?.href) return <Link className="hab-pager__arrow" href={arrow.href} aria-label={label}>{icon}</Link>
  return <button type="button" className="hab-pager__arrow" aria-label={label} disabled={!arrow?.onClick} onClick={arrow?.onClick}>{icon}</button>
}

export default function Pagination({ from, to, total, unit, prev, next, loading }: { from: number; to: number; total: number; unit?: string; prev?: Arrow; next?: Arrow; loading?: boolean }) {
  const range = total === 0 ? '0' : `${from}–${to}`
  return <nav className="hab-pager" aria-label="Phân trang">
    <p className="hab-pager__text">{loading ? 'Đang tải…' : `Hiển thị ${range} / ${total}${unit ? ` ${unit}` : ''}`}</p>
    <div className="hab-pager__arrows"><ArrowControl dir="prev" arrow={loading ? undefined : prev} /><ArrowControl dir="next" arrow={loading ? undefined : next} /></div>
  </nav>
}
