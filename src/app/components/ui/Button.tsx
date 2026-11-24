// Mockup v3 buttons (design-tokens.md "Hình khối"): primary, secondary (white with 1.5 px inset ring), danger,
// underlined link, and white (on the dark bar). Min height 48 px (44 px for size "sm").
import Link from 'next/link'
import React from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'link' | 'white'
type Common = { variant?: ButtonVariant; size?: 'md' | 'sm'; className?: string; children: React.ReactNode }
type AsLink = Common & { href: string } & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href' | 'className' | 'children'>
type AsButton = Common & { href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

export function buttonClass(variant: ButtonVariant = 'primary', size: 'md' | 'sm' = 'md', extra?: string): string {
  return ['hab-btn', `hab-btn--${variant}`, size === 'sm' ? 'hab-btn--sm' : '', extra ?? ''].filter(Boolean).join(' ')
}

export default function Button(props: AsLink | AsButton) {
  if (props.href !== undefined) {
    const { variant, size, className, children, href, ...rest } = props
    return <Link href={href} className={buttonClass(variant, size, className)} {...rest}>{children}</Link>
  }
  const { variant, size, className, children, type = 'button', ...rest } = props as AsButton
  return <button type={type} className={buttonClass(variant, size, className)} {...rest}>{children}</button>
}
