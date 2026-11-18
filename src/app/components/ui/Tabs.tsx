// Mockup v3 tabs as links (the selected tab has aria-current="page"); each tab is at least 44 px high.
import Link from 'next/link'
import React from 'react'

export default function Tabs({ label, items }: { label: string; items: Array<{ href: string; label: React.ReactNode; active?: boolean }> }) {
  return <nav className="hab-tabs" aria-label={label}>
    {items.map(item => <Link key={item.href} href={item.href} aria-current={item.active ? 'page' : undefined} className={item.active ? 'is-active' : undefined}>{item.label}</Link>)}
  </nav>
}
