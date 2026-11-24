// Mockup v3 page frame: content at most 1100 px, centred, at least 24 px from the edges. A "band" spans the full
// width (bar, hero, footer backgrounds) and pads its content with --gx to the same frame.
import React from 'react'

type Tag = 'div' | 'main' | 'section' | 'header' | 'footer'

export default function Container({ as: Tag = 'div', band = false, className, children, ...rest }: { as?: Tag; band?: boolean; className?: string; children: React.ReactNode } & React.HTMLAttributes<HTMLElement>) {
  return <Tag className={[band ? 'hab-band' : 'hab-container', className].filter(Boolean).join(' ')} {...rest}>{children}</Tag>
}
