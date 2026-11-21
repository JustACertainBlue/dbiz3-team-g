// Screen 31 (EXP067): "Trải nghiệm của xưởng". Mockup hab-mockup-v3/png/31. Server page; delete (EXP132) is a popup.
import Link from 'next/link'
import { currentServerSession } from '@/lib/auth/server-session'
import { demoRepository } from '@/lib/db/application-store'
import { providerExperienceRows, EXPERIENCE_PAGE_SIZE } from '@/lib/provider/experience-list-view'
import CoverImage from '@/app/explore/v3/CoverImage'
import { Button, Pagination } from '@/app/components/ui'
import ExperienceRowActions from './ExperienceRowActions'
import '../../v3/provider-v3.css'

export const dynamic = 'force-dynamic'
const SIZES = '(min-width: 768px) 220px, 112px'

export default async function ExperienceManagementPage({ params, searchParams }: { params: { providerId: string }; searchParams: { page?: string } }) {
  const session = await currentServerSession()
  if (!session.authenticated || session.role !== 'Local_Provider' || session.providerId !== params.providerId) {
    return <main className="pv3-page"><h1 className="pv3-h1">Trải nghiệm của xưởng</h1><p>Chỉ chủ xưởng sở hữu hồ sơ này mới quản lý được trải nghiệm.</p><Button href="/login">Đăng nhập</Button></main>
  }
  const repository = demoRepository()
  const [experiences, bookings, profile_media, stored_files] = await Promise.all(['experiences', 'bookings', 'profile_media', 'stored_files'].map(name => repository.all(name as 'experiences')))
  const rows = providerExperienceRows({ experiences, bookings, profile_media, stored_files }, params.providerId)
  const pages = Math.max(1, Math.ceil(rows.length / EXPERIENCE_PAGE_SIZE))
  const page = Math.min(pages, Math.max(1, Number(searchParams.page) || 1))
  const shown = rows.slice((page - 1) * EXPERIENCE_PAGE_SIZE, page * EXPERIENCE_PAGE_SIZE)
  const base = `/provider/${params.providerId}/experiences`
  return <main className="pv3-page">
    <div className="pv3-head"><h1 className="pv3-h1">Trải nghiệm của xưởng</h1><Button href={`${base}/new`}>Thêm trải nghiệm</Button></div>
    {shown.length === 0 && <p className="pv3-empty">Xưởng chưa có trải nghiệm nào. Bấm “Thêm trải nghiệm” để bắt đầu.</p>}
    <ul className="pv3-list">{shown.map(row => <li key={row.id} className="pv3-xrow">
      <Link href={`${base}/${row.id}`} className="pv3-xrow__img" aria-label={`Xem ${row.name}`}>
        {row.image ? <CoverImage image={row.image} alt="" sizes={SIZES} /> : <span className="pv3-xrow__noimg">Chưa có ảnh</span>}
      </Link>
      <div className="pv3-xrow__body">
        <h2 className="pv3-xrow__name"><Link href={`${base}/${row.id}`}>{row.name}</Link></h2>
        <p className="pv3-xrow__meta">{[row.priceText, `${row.durationMinutes} phút`, `tối đa ${row.maxParticipants} khách/ca`, row.cancelText].filter(Boolean).join(' · ')}</p>
        <p className={row.upcomingBookings > 0 ? 'pv3-xrow__note pv3-xrow__note--on' : 'pv3-xrow__note'}>
          {row.totalBookings === 0 ? 'Chưa có đặt chỗ nào' : `${row.upcomingBookings > 0 ? `${row.upcomingBookings} đặt chỗ sắp tới` : 'Chưa có đặt chỗ sắp tới'}${row.updatedText ? ` · cập nhật ${row.updatedText}` : ''}`}
        </p>
      </div>
      <ExperienceRowActions providerId={params.providerId} experienceId={row.id} name={row.name} deletion={row.deletion} />
    </li>)}</ul>
    <Pagination from={(page - 1) * EXPERIENCE_PAGE_SIZE + 1} to={Math.min(rows.length, page * EXPERIENCE_PAGE_SIZE)} total={rows.length} unit="trải nghiệm"
      prev={page > 1 ? { href: `${base}?page=${page - 1}` } : undefined} next={page < pages ? { href: `${base}?page=${page + 1}` } : undefined} />
  </main>
}
