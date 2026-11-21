import Link from 'next/link'
import { currentServerSession } from '@/lib/auth/server-session'
import { demoRepository } from '@/lib/db/application-store'
import { bookingConditionsFromExperience, canOpenCreateBooking } from '@/lib/booking/create-booking'
import { chattedAgencies } from '@/lib/booking/chatted-agencies'
import CreateBookingForm, { type ExperienceOption, type SlotOption } from './CreateBookingForm'
import './create-v3.css'

export const dynamic = 'force-dynamic'

// Screen 35 (BKG134) Tạo đặt chỗ (F-SCHED-03), mockup 19/11. Only Tour Agencies that already chatted with the Provider
// are offered (UI v3 decision #1). The default values come from the chat request card when `?yeu_cau=` is not used: none.
export default async function CreateBookingPage({ params, searchParams }: { params: { providerId: string }; searchParams: { agency_id?: string } }) {
  const session = (await currentServerSession())
  if (!(await canOpenCreateBooking(session, params.providerId))) {
    return <main className="v3b-wrap"><h1 className="v3b-h1">Tạo đặt chỗ</h1><p>Chỉ xưởng sở hữu hồ sơ này mới tạo được đặt chỗ.</p><Link href="/login" className="v3b-btn v3b-btn--p">Đăng nhập</Link></main>
  }
  const repository = demoRepository()
  const experiences: ExperienceOption[] = (await repository.all('experiences'))
    .filter(row => row.provider_id === params.providerId && !row.archived_at)
    .map(row => ({
      experience_id: row.experience_id, name: row.name, duration_minutes: Number(row.duration_minutes), max_participants: Number(row.max_participants),
      price_per_person: Number(row.price_per_person), conditions: bookingConditionsFromExperience(row),
    }))
  const ids = new Set(experiences.map(row => row.experience_id))
  let slots: SlotOption[] = []
  try {
    slots = (await repository.all('experience_slots')).filter(row => ids.has(row.experience_id))
      .map(row => ({ experience_id: row.experience_id, start: String(row.start_time).slice(0, 5), end: String(row.end_time).slice(0, 5), label: row.label }))
  } catch { slots = [] }
  const agencies = await chattedAgencies(params.providerId)
  return <main className="v3b-wrap">
    <Link href={`/provider/${params.providerId}/bookings`} className="v3b-back">‹ Đặt chỗ</Link>
    <h1 className="v3b-h1">Tạo đặt chỗ</h1>
    <p className="v3b-sub">Sau khi đã thống nhất với công ty lữ hành trong tin nhắn.</p>
    <CreateBookingForm providerId={params.providerId} experiences={experiences} agencies={agencies} slots={slots} initialAgencyId={searchParams.agency_id} />
  </main>
}
