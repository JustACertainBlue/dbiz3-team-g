// Mockup v3 breadcrumb: links separated by "›"; the last item is the current page (aria-current="page").
import Link from 'next/link'
import React from 'react'

export default function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return <nav className="hab-breadcrumb" aria-label="Đường dẫn">
    <ol>{items.map((item, index) => {
      const last = index === items.length - 1
      return <li key={`${item.label}-${index}`}>
        {last || !item.href ? <span aria-current={last ? 'page' : undefined}>{item.label}</span> : <Link href={item.href}>{item.label}</Link>}
      </li>
    })}</ol>
  </nav>
}
