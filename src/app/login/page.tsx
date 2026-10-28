'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { setCurrentRole, type CurrentUserRole } from '@/lib/prf/client-session'

const accounts: Array<{ role: CurrentUserRole; title: string; description: string; destination: string }> = [
  { role: 'TourAgency', title: 'Tour Agency', description: 'Khám phá trải nghiệm, xem giá B2B, yêu cầu báo giá và Chat.', destination: '/explore' },
  { role: 'LocalProvider', title: 'Local Provider', description: 'Quản lý hồ sơ xưởng và danh mục trải nghiệm.', destination: '/provider/50f2c8fc-3f94-5c6e-b3e3-a1bfb13c5374' },
  { role: 'UBND', title: 'UBND Admin', description: 'Xem các Provider thuộc làng nghề được phân công và thẩm định.', destination: '/admin/providers' },
  { role: 'HDT', title: 'HDT Admin', description: 'Theo dõi và quản trị danh mục ở cấp Sở Du lịch.', destination: '/admin/providers' },
  { role: 'Guest', title: 'Guest', description: 'Xem danh mục công khai, không thấy giá và thông tin liên hệ riêng.', destination: '/explore' },
]

export default function LoginPage() {
  return <Suspense fallback={<main className="demo-login">Đang tải tài khoản demo…</main>}><LoginContent /></Suspense>
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [busy, setBusy] = useState<CurrentUserRole | null>(null)
  const [error, setError] = useState('')

  async function choose(role: CurrentUserRole, destination: string) {
    setBusy(role)
    setError('')
    try {
      await setCurrentRole(role)
      const next = searchParams.get('next')
      router.push(next?.startsWith('/') ? next : destination)
      router.refresh()
    } catch {
      setError('Không thể đổi tài khoản demo. Hãy thử lại.')
      setBusy(null)
    }
  }

  return <main className="demo-login">
    <section className="demo-login__panel"><p className="demo-login__eyebrow">Hanoi Artisan Bridge · Functional prototype</p><h1>Chọn tài khoản để chạy luồng demo</h1><p>Đây là phiên demo bằng dữ liệu giả, chưa phải hệ thống đăng nhập thật. Một cookie nội bộ giúp tất cả module nhận cùng role và ID.</p>
      {error && <p role="alert" className="demo-login__error">{error}</p>}
      <div className="demo-account-grid">{accounts.map(account => <button key={account.role} disabled={busy !== null} onClick={() => choose(account.role, account.destination)}><strong>{account.title}</strong><span>{account.description}</span><small>{busy === account.role ? 'Đang mở…' : 'Tiếp tục →'}</small></button>)}</div>
    </section>
    <style jsx>{`
      .demo-login{min-height:calc(100vh - 48px);display:grid;place-items:center;padding:36px;background:radial-gradient(circle at top,#31483c,#101d17 70%);color:#f8f4e9}.demo-login__panel{width:min(900px,100%)}.demo-login__eyebrow{text-transform:uppercase;letter-spacing:.14em;color:#e9a47d;font-weight:800;font-size:11px}.demo-login h1{font:600 clamp(34px,5vw,58px)/1.05 Georgia,serif;margin:10px 0 16px}.demo-login__panel>p{max-width:700px;line-height:1.7;color:#c9d4cd}.demo-account-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin-top:30px}.demo-account-grid button{min-height:150px;text-align:left;display:flex;flex-direction:column;gap:10px;padding:20px;border:1px solid #ffffff28;border-radius:16px;background:#ffffff0d;color:white;cursor:pointer}.demo-account-grid button:hover{border-color:#e18a60;background:#ffffff16;transform:translateY(-2px)}.demo-account-grid strong{font-size:19px}.demo-account-grid span{flex:1;color:#b9c8bf;line-height:1.5}.demo-account-grid small{color:#efaa85;font-weight:800}.demo-login__error{color:#fecaca!important}
    `}</style>
  </main>
}
