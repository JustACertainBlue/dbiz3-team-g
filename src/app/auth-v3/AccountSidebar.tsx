// Screens 19, 19a (png/19, png/19a): left menu of "Tài khoản của tôi". "Doanh nghiệp của tôi" shows only when the account has a business profile.
import Link from 'next/link'
import React from 'react'
import './auth-v3.css'

export default function AccountSidebar({ active, businessHref }: { active: 'info' | 'password'; businessHref?: string | null }) {
  return <nav className="av3-side" aria-label="Tài khoản của tôi">
    <Link href="/account" className={active === 'info' ? 'av3-side--on' : ''} aria-current={active === 'info' ? 'page' : undefined}>Thông tin cá nhân</Link>
    <Link href="/account/change-password" className={active === 'password' ? 'av3-side--on' : ''} aria-current={active === 'password' ? 'page' : undefined}>Đổi mật khẩu</Link>
    {businessHref && <Link href={businessHref}>Doanh nghiệp của tôi</Link>}
  </nav>
}
