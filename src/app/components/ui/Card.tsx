// Mockup v3 card: white, 1 px border, radius 8 px, padding 20-28 px.
import React from 'react'

export default function Card({ as: Tag = 'div', className, children, ...rest }: { as?: 'div' | 'section' | 'article' | 'aside'; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return <Tag className={['hab-card', className].filter(Boolean).join(' ')} {...rest}>{children}</Tag>
}
