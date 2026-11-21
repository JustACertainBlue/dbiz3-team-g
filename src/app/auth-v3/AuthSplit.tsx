// Screen 15 (png/15): full-screen sign-in layout, textile photo with the two role cards on the left, form on the right.
// The shared header is hidden on /login by SessionHeader, so the brand link lives here.
import Link from 'next/link'
import React from 'react'
import './auth-v3.css'

export function AgencyIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12.5h18" /></svg>
}
export function WorkshopIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 10.5 12 4l9 6.5" /><path d="M5 9.5V20h14V9.5" /><path d="M10 20v-5h4v5" /></svg>
}

export default function AuthSplit({ children }: { children: React.ReactNode }) {
  return <div className="av3-split">
    <section className="av3-split__brand" aria-label="Hanoi Artisan Bridge">
      <img className="av3-split__img" src="/auth/login-hero.webp" alt="Tấm vải thêu tay hoa văn đỏ" />
      <div className="av3-split__shade" aria-hidden="true" />
      <div className="av3-split__in">
        <Link href="/explore" className="av3-split__logo">Hanoi Artisan Bridge</Link>
        <div className="av3-split__copy">
          <p className="av3-split__h">Kết nối đoàn khách<br />với <span>nghệ nhân làng nghề</span></p>
          <p className="av3-split__sub">Đặt thẳng với xưởng, có nghệ nhân hướng dẫn đoàn từ đầu đến cuối.</p>
          <div className="av3-split__cards">
            <div className="av3-split__card"><span className="av3-split__ic"><AgencyIcon /></span><div><p className="av3-split__ct">Công ty lữ hành</p><p className="av3-split__cd">Tìm trải nghiệm, giữ chỗ và thanh toán cho đoàn.</p></div></div>
            <div className="av3-split__card"><span className="av3-split__ic"><WorkshopIcon /></span><div><p className="av3-split__ct">Xưởng nghề</p><p className="av3-split__cd">Nhận đặt chỗ, quản lý lịch và trải nghiệm của xưởng.</p></div></div>
          </div>
        </div>
      </div>
    </section>
    <section className="av3-split__form">{children}</section>
  </div>
}
