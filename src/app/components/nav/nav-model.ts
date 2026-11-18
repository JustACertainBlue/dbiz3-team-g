// Navigation per role, mockup v3 (hab-mockup-v3 png/01 Guest, png/21 Tour Agency, png/29 Local Provider,
// png/38 Admin, png/20 account menu). Human decisions 2026-11-18: the bar shows exactly the mockup items; 2026-11-19
// (new pack, png/05 and png/27): Tour Agency gets "Lịch" (SCH141 /agency/<id>/schedule) after "Lịch sử đặt chỗ"; HDT "Duyệt hồ sơ" → /admin/agencies and stays selected
// on /admin/providers; UBND "Duyệt hồ sơ" → /admin/providers.
import type { SessionContext } from '@/lib/auth/session'

export interface NavItem { href: string; label: string; /** Extra path prefixes that also select this item. */ alsoActive?: string[] }
export interface AccountLink { href: string; label: string }

export type HeaderVariant = 'guest' | 'agency' | 'provider' | 'admin'

export function headerVariant(session: SessionContext | null): HeaderVariant {
  if (!session?.authenticated) return 'guest'
  if (session.role === 'ADMIN') return 'admin'
  if (session.role === 'Local_Provider') return 'provider'
  return 'agency'
}

export function homeHref(session: SessionContext | null): string {
  if (!session?.authenticated) return '/explore'
  if (session.mustChangePassword) return '/account/change-password'
  if (session.role === 'Local_Provider' && session.providerId) return `/provider/${session.providerId}/dashboard`
  if (session.role === 'ADMIN') return session.adminType === 'UBND' ? '/admin/providers' : '/admin'
  return '/explore'
}

/** Guest navigation of the sign-in pages (AuthShell, #253): "Guest has EXP120 and AUT009/REG003, with no AI navigation". */
export function guestNavLinks(): Array<{ href: string; label: string }> {
  return [
    { href: '/explore', label: 'Khám phá' },
    { href: '/login', label: 'Đăng nhập' },
    { href: '/register', label: 'Đăng ký Agency' },
  ]
}

export function navItems(session: SessionContext | null): NavItem[] {
  if (!session?.authenticated) return [{ href: '/explore', label: 'Khám phá' }]
  if (session.mustChangePassword) return [{ href: '/account/change-password', label: 'Đổi mật khẩu tạm' }]
  if (session.role === 'Tour_Agency' && session.agencyId) return [
    { href: '/explore', label: 'Khám phá' },
    { href: `/agency/${session.agencyId}/bookings`, label: 'Lịch sử đặt chỗ' },
    { href: `/agency/${session.agencyId}/schedule`, label: 'Lịch' },
    { href: '/ai-matching', label: 'Ghép tour AI' },
  ]
  if (session.role === 'Local_Provider' && session.providerId) {
    const base = `/provider/${session.providerId}`
    return [
      { href: `${base}/dashboard`, label: 'Tổng quan' },
      { href: `${base}/experiences`, label: 'Trải nghiệm' },
      { href: `${base}/bookings`, label: 'Lịch sử đặt chỗ' },
    ]
  }
  if (session.role === 'ADMIN') return [
    { href: '/admin', label: 'Tổng quan' },
    session.adminType === 'UBND'
      ? { href: '/admin/providers', label: 'Duyệt hồ sơ' }
      : { href: '/admin/agencies', label: 'Duyệt hồ sơ', alsoActive: ['/admin/providers'] },
    { href: '/admin/users', label: 'Quản lý tài khoản' },
  ]
  return []
}

/** Account menu (png/20): Tài khoản của tôi · Doanh nghiệp của tôi; Đăng xuất is rendered by the header.
 *  Admin (human decision 2026-11-18): only Tài khoản của tôi, plus Đăng xuất. */
export function accountLinks(session: SessionContext | null): AccountLink[] {
  if (!session?.authenticated) return []
  const links: AccountLink[] = [{ href: '/account', label: 'Tài khoản của tôi' }]
  if (session.mustChangePassword || session.role === 'ADMIN') return links
  if (session.role === 'Tour_Agency' && session.agencyId) links.push({ href: `/agency/${session.agencyId}`, label: 'Doanh nghiệp của tôi' })
  if (session.role === 'Local_Provider' && session.providerId) links.push({ href: `/provider/${session.providerId}`, label: 'Doanh nghiệp của tôi' })
  return links
}

/** Footer (human decision 2026-11-18): only on /explore, and only for Guest and Tour Agency. */
export function footerVisible(session: SessionContext | null, pathname: string): boolean {
  const variant = headerVariant(session)
  return pathname === '/explore' && (variant === 'guest' || variant === 'agency')
}

const matches = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`)

/** The nav item that owns the current path (longest matching prefix, including alsoActive prefixes). */
export function activeHref(items: NavItem[], pathname: string): string | undefined {
  let best: { href: string; length: number } | undefined
  for (const item of items) {
    for (const prefix of [item.href, ...(item.alsoActive ?? [])]) {
      if (matches(pathname, prefix) && (!best || prefix.length > best.length)) best = { href: item.href, length: prefix.length }
    }
  }
  return best?.href
}

/** Avatar letters as in the mockup chip: the first letters of the last two words ("Du lịch Tràng An" → "TA"). */
export function initials(text: string): string {
  const words = text.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[words.length - 2][0] + words[words.length - 1][0]).toUpperCase()
}
