import Link from 'next/link'
import { cookies } from 'next/headers'
import { DEMO_SESSION_COOKIE, demoSessionFor } from '@/lib/auth/demo-session'
import { demoRepository } from '@/lib/demo/json-repository'
import { bookingConditionsFromExperience, canOpenCreateBooking } from '@/lib/booking/create-booking'
import CreateBookingForm, { type AgencyOption, type ExperienceOption } from './CreateBookingForm'

export const dynamic = 'force-dynamic'

// Screen BKG134 Create Booking (F-SCHED-03).
export default function CreateBookingPage({ params }: { params: { providerId: string } }) {
  const session = demoSessionFor(cookies().get(DEMO_SESSION_COOKIE)?.value)
  if (!canOpenCreateBooking(session, params.providerId)) {
    return <main className="bkg-state"><h1>Create Booking</h1><p>Chỉ Local Provider sở hữu hồ sơ này mới tạo được Booking.</p><Link href="/login">Chọn tài khoản demo</Link><style>{bookingStyles}</style></main>
  }

  const repository = demoRepository()
  const experiences: ExperienceOption[] = repository.all('experiences')
    .filter(row => row.provider_id === params.providerId && !row.archived_at)
    .map(row => ({
      experience_id: row.experience_id,
      name: row.name,
      duration_minutes: Number(row.duration_minutes),
      max_participants: Number(row.max_participants),
      price_per_person: Number(row.price_per_person),
      conditions: bookingConditionsFromExperience(row),
    }))
  const approvedUsers = new Set(repository.all('user_accounts').filter(row => row.account_status === 'Approved').map(row => row.user_id))
  const agencies: AgencyOption[] = repository.all('agency_profiles')
    .filter(row => approvedUsers.has(row.user_id))
    .map(row => ({ agency_id: row.agency_id, company_name: row.company_name }))
    .sort((a, b) => a.company_name.localeCompare(b.company_name))

  return <main className="bkg-create">
    <header><p>HANOI ARTISAN BRIDGE · BKG134</p><h1>Create Booking</h1><span>{session.displayName} · Booking mới luôn ở trạng thái On hold trong 72 giờ</span></header>
    <CreateBookingForm providerId={params.providerId} experiences={experiences} agencies={agencies} />
    <style>{bookingStyles}</style>
  </main>
}

const bookingStyles = `.bkg-create,.bkg-state{max-width:880px;margin:auto;padding:42px 24px 80px;color:#1e2f27}.bkg-create header p{font-size:11px;letter-spacing:.14em;color:#9a4a2a;font-weight:800}.bkg-create h1,.bkg-state h1{font:600 40px Georgia,serif;margin:8px 0}.bkg-create header span{color:#66746d}.bkg-form{display:grid;gap:16px;margin-top:28px;padding:24px;background:#f4efe5;border-radius:14px}.bkg-form label{display:grid;gap:6px;font-weight:700;font-size:14px}.bkg-form input,.bkg-form select,.bkg-form textarea{padding:10px 12px;border:1px solid #ddd6ca;border-radius:10px;font:inherit;background:white}.bkg-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px}.bkg-panel{padding:14px 16px;background:white;border-radius:10px;font-size:14px;color:#3d4b44}.bkg-actions{display:flex;gap:12px;align-items:center}.bkg-actions button{padding:12px 20px;border:0;border-radius:999px;background:#243b30;color:white;font-weight:800;cursor:pointer}.bkg-actions button:disabled{opacity:.6;cursor:wait}.bkg-actions a{color:#9a4a2a;font-weight:800}.bkg-error{padding:12px 16px;border-radius:10px;background:#fbe4e1;color:#8a1f11}.bkg-result{padding:18px;border-radius:14px;background:#e3f1e8}.bkg-result dl{display:grid;grid-template-columns:auto 1fr;gap:6px 14px;margin:10px 0 0}.bkg-result dt{font-weight:700}.bkg-state{text-align:center}@media(max-width:720px){.bkg-grid{grid-template-columns:1fr}}`
