// Mockup v3 select: 44 px, 1 px --c-input-border, radius 6 px, appearance none with a drawn chevron in --c-primary.
import React from 'react'

export default function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <span className={['hab-select', className].filter(Boolean).join(' ')}>
    <select {...rest}>{children}</select>
    <svg className="hab-select__chevron" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
  </span>
}
