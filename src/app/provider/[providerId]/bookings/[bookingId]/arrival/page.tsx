import React from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { demoRepository } from '@/lib/db/application-store'
import { arrivalLockReason } from '@/lib/booking/booking-actions'
import { bookingView, completionRows } from '@/lib/booking/booking-view'
import { loadProviderBooking } from '../load-provider-booking'
import ConfirmArrival from './ConfirmArrival'
import '@/app/agency/[agencyId]/bookings/[bookingId]/agency-booking-v3.css'

export const dynamic = 'force-dynamic'

// Screens BKG136 / 10d. Booked: the confirmation (F-SCHED-06). Completed: "Tour đã hoàn thành!" (mockup XuongTourHoanThanh).
export default async function ConfirmArrivalPage({ params }: { params: { providerId: string; bookingId: string } }) {
  const detail = await loadProviderBooking(params.providerId, params.bookingId)
  if (!detail) {
    return <main className="v3a"><h1 className="v3a-name">Xác nhận đoàn đã đến</h1><p className="v3a-sm">Chỉ xưởng sở hữu đặt chỗ này mới xác nhận được.</p><Link href="/login">Đăng nhập</Link></main>
  }
  const repository = demoRepository()
  const booking = (await repository.find('bookings', row => row.booking_id === params.bookingId))!
  const experience = await repository.find('experiences', row => row.experience_id === booking.experience_id)
  const agency = await repository.find('agency_profiles', row => row.agency_id === booking.agency_id)
  const view = bookingView({ booking, experience, providerName: '', agencyName: agency?.company_name ?? '', now: new Date() })
  const back = `/provider/${params.providerId}/bookings/${params.bookingId}`
  const list = `/provider/${params.providerId}/bookings`

  if (booking.status === 'Completed') {
    return <main className="v3a" style={{ maxWidth: 640 }}>
      <div className="v3a-card" style={{ textAlign: 'center' }}>
        <CheckCircle2 size={48} color="#165235" aria-hidden="true" />
        <h1 className="v3a-name" style={{ margin: '12px 0 8px' }}>Tour đã hoàn thành!</h1>
        <p className="v3a-sm">Bạn đã xác nhận đoàn của {view.agencyName} đã đến xưởng. Đặt chỗ chuyển sang “Hoàn thành tour” và công ty lữ hành nhận được thông báo.</p>
        <div style={{ textAlign: 'left', margin: '20px 0' }}>{completionRows(view, booking).map(([label, value]) => <div key={label} className="v3a-sp" style={{ padding: '12px 0', borderTop: '1px solid #F0EDE4' }}><span>{label}</span><b>{value}</b></div>)}</div>
        <div className="v3a-actions" style={{ justifyContent: 'center' }}><Link className="v3a-btn v3a-btn--s" href={list}>Về lịch sử đặt chỗ</Link><Link className="v3a-btn v3a-btn--p" href={back}>Xem chi tiết đặt chỗ</Link></div>
      </div>
    </main>
  }
  return <main className="v3a" style={{ maxWidth: 640 }}>
    <Link href={back} className="v3a-back">‹ Chi tiết đặt chỗ</Link>
    <h1 className="v3a-name" style={{ margin: '12px 0', fontSize: 30 }}>Xác nhận đoàn đã đến</h1>
    <div className="v3a-card">
      <p className="v3a-ct">{view.experienceName}</p>
      <div className="v3a-sp"><span>Mã đặt chỗ</span><b>{view.code}</b></div>
      <div className="v3a-sp"><span>Bắt đầu</span><b>{view.range.slice(0, 5)}, {view.dateLong}</b></div>
      <div className="v3a-sp"><span>Số khách</span><b>{view.price.guests} khách</b></div>
    </div>
    <p className="v3a-sm" style={{ margin: '16px 0' }}>Xác nhận đoàn đã đến sẽ chuyển đặt chỗ sang “Hoàn thành tour”. Chỉ làm được khi đặt chỗ đã đặt và đã tới giờ bắt đầu.</p>
    <ConfirmArrival bookingId={detail.booking_id} backHref={back} allowed={detail.actions.mark_arrival} lockReason={arrivalLockReason(detail.status, detail.actions)} />
  </main>
}
