// Screen 17 (mockup DangKyDaiLy): a plain 68 px bar, logo on the left and "Đã có tài khoản? Đăng nhập" on the right, no nav items.
import Link from 'next/link'
import React from 'react'

export const usesSimpleAuthBar = (pathname: string) => pathname === '/register'

export default function SimpleAuthBar() {
  return <header className="hab-nav hab-nav--green hab-nav--simple">
    <Link href="/explore" className="hab-nav__brand">Hanoi Artisan Bridge</Link>
    <span className="hab-nav__ask">Đã có tài khoản? <Link href="/login">Đăng nhập</Link></span>
  </header>
}
