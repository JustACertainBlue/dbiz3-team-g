// Navigation per role (design wave 3). Content follows the screen specs: "Agency main navigation uses
// EXP017/AIT121/BKG137/SCH141/COM048; Provider uses DSH018/EXP067/BKG133/SCH139/COM065; Admin uses ADM079/ADM095.
// Guest has EXP120 and AUT009/REG003, with no AI navigation." Avatar menu: My Account → ACC129,
// My Business → PRF019 (Agency) / PRF127 (Provider), Logout → AUT026. Labels follow the Figma navigation frames.
import type { SessionContext } from '@/lib/auth/session'

export type NavIcon = 'compass' | 'sparkles' | 'clipboard' | 'calendar' | 'message' | 'grid' | 'star' | 'building' | 'check' | 'users' | 'key'
export interface NavItem { href: string; label: string; short?: string; icon: NavIcon; unread?: boolean }
export interface AccountLink { href: string; label: string; icon: 'user' | 'building' }

export type Shell = 'guest' | 'portal' | 'admin'

export function shellFor(session: SessionContext | null): Shell {
  if (!session?.authenticated) return 'guest'
  return session.role === 'ADMIN' && !session.mustChangePassword ? 'admin' : 'portal'
}

export function homeHref(session: SessionContext | null): string {
  if (!session?.authenticated) return '/explore'
  if (session.mustChangePassword) return '/account/change-password'
  if (session.role === 'Local_Provider' && session.providerId) return `/provider/${session.providerId}/dashboard`
  if (session.role === 'ADMIN') return session.adminType === 'UBND' ? '/admin/providers' : '/admin'
  return '/explore'
}

/** Portal tagline under the logo (Figma). */
export function tagline(session: SessionContext | null): string {
  if (session?.role === 'Local_Provider') return 'Cổng nhà cung cấp địa phương'
  if (session?.role === 'ADMIN') return 'Cổng quản trị viên'
  return 'Cổng đại lý du lịch B2B'
}

export function navItems(session: SessionContext | null): NavItem[] {
  if (!session?.authenticated) return [{ href: '/explore', label: 'Khám phá', icon: 'compass' }]
  if (session.mustChangePassword) return [{ href: '/account/change-password', label: 'Đổi mật khẩu tạm', icon: 'key' }]
  if (session.role === 'Tour_Agency' && session.agencyId) {
    const base = `/agency/${session.agencyId}`
    return [
      { href: '/explore', label: 'Khám phá', icon: 'compass' },
      { href: '/ai-matching', label: 'Ghép tour AI', short: 'Ghép tour', icon: 'sparkles' },
      { href: `${base}/bookings`, label: 'Đặt chỗ', icon: 'clipboard' },
      { href: `${base}/schedule`, label: 'Lịch', icon: 'calendar' },
      { href: '/messages', label: 'Tin nhắn', icon: 'message', unread: true },
    ]
  }
  if (session.role === 'Local_Provider' && session.providerId) {
    const base = `/provider/${session.providerId}`
    return [
      { href: `${base}/dashboard`, label: 'Tổng quan', icon: 'grid' },
      { href: `${base}/experiences`, label: 'Quản lý trải nghiệm', short: 'Trải nghiệm', icon: 'star' },
      { href: `${base}/bookings`, label: 'Đặt chỗ', icon: 'clipboard' },
      { href: `${base}/schedule`, label: 'Lịch', icon: 'calendar' },
      { href: '/messages', label: 'Tin nhắn', icon: 'message', unread: true },
    ]
  }
  if (session.role === 'ADMIN') {
    // ADM079 dashboard and ADM095 account management, plus the review screens that already have routes.
    if (session.adminType === 'UBND') return [
      { href: '/admin', label: 'Dashboard làng', short: 'Dashboard', icon: 'grid' },
      { href: '/admin/users', label: 'Tài khoản xưởng', short: 'Xưởng', icon: 'building' },
      { href: '/admin/providers', label: 'Duyệt hồ sơ', icon: 'check' },
    ]
    return [
      { href: '/admin', label: 'Dashboard toàn thành phố', short: 'Dashboard', icon: 'grid' },
      { href: '/admin/agencies', label: 'Duyệt Agency', icon: 'check' },
      { href: '/admin/providers', label: 'Hồ sơ xưởng', short: 'Xưởng', icon: 'building' },
      { href: '/admin/users', label: 'Quản lý tài khoản', short: 'Tài khoản', icon: 'users' },
    ]
  }
  return []
}

export function accountLinks(session: SessionContext | null): AccountLink[] {
  if (!session?.authenticated) return []
  const links: AccountLink[] = [{ href: '/account', label: 'Tài khoản cá nhân', icon: 'user' }]
  if (session.mustChangePassword) return links
  if (session.role === 'Tour_Agency' && session.agencyId) links.push({ href: `/agency/${session.agencyId}`, label: 'Hồ sơ doanh nghiệp', icon: 'building' })
  if (session.role === 'Local_Provider' && session.providerId) links.push({ href: `/provider/${session.providerId}`, label: 'Hồ sơ xưởng', icon: 'building' })
  return links
}

/** The nav item that owns the current path (longest matching prefix). */
export function activeHref(items: NavItem[], pathname: string): string | undefined {
  return items.filter(item => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href
}

export function initials(text: string): string {
  const words = text.replace(/[^\p{L}\p{N}\s]/gu, ' ').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  return (words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[words.length - 1][0]).toUpperCase()
}
