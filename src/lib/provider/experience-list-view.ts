// Screen 31 (EXP067): view-model of "Trải nghiệm của xưởng". Read-only; the booking logic is untouched.
import { imageRef, type ImageRef } from '@/lib/prf/media-urls'

type Row = Record<string, string | undefined>
export interface ExperienceListSeed { experiences: Row[]; bookings: Row[]; profile_media: Row[]; stored_files: Row[] }
export interface ExperienceRowView {
  id: string; name: string; priceText: string; durationMinutes: number; maxParticipants: number; cancelText: string | null
  upcomingBookings: number; updatedText: string; archived: boolean; image: ImageRef | null
  /** What the delete button does (same rule as deleteExperience): blocked by an active booking, archived when it has history, else removed. */
  deletion: 'blocked' | 'archive' | 'delete'
}

export const EXPERIENCE_PAGE_SIZE = 5

const vnDate = (iso: string | undefined) => {
  const time = iso ? Date.parse(iso) : NaN
  return Number.isNaN(time) ? '' : new Date(time).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function cancelClause(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const policy = JSON.parse(raw) as { before_hours?: number; refund_percent?: number }
    return policy.before_hours === undefined || policy.refund_percent === undefined ? null : `huỷ trước ${policy.before_hours} giờ hoàn ${policy.refund_percent}%`
  } catch { return null }
}

export function providerExperienceRows(seed: ExperienceListSeed, providerId: string, options: { now?: number; includeArchived?: boolean } = {}): ExperienceRowView[] {
  const now = options.now ?? Date.now()
  const files = new Map(seed.stored_files.map(file => [file.file_id, file]))
  return seed.experiences
    .filter(row => row.provider_id === providerId && (options.includeArchived || !row.archived_at))
    .map(row => {
      const id = row.experience_id as string
      const media = seed.profile_media.filter(item => item.experience_id === id && files.get(item.file_id as string)?.media_type?.startsWith('image/'))
        .sort((a, b) => Number(a.display_order) - Number(b.display_order))[0]
      const file = media ? files.get(media.file_id as string) : undefined
      const image = file ? imageRef({ storage_key: file.storage_key as string, file_id: file.file_id, file_size_bytes: file.file_size_bytes as string, width_px: file.width_px, height_px: file.height_px }) : null
      const upcoming = seed.bookings.filter(b => b.experience_id === id && (b.status === 'On hold' || b.status === 'Booked') && Date.parse(b.start_at as string) >= now).length
      return {
        id, name: row.name as string, priceText: `${Number(row.price_per_person).toLocaleString('vi-VN')} ₫/khách`, durationMinutes: Number(row.duration_minutes),
        maxParticipants: Number(row.max_participants), cancelText: cancelClause(row.cancellation_policy), upcomingBookings: upcoming,
        updatedText: vnDate(row.updated_at), archived: Boolean(row.archived_at), image, deletion: deletionOutcome(seed.bookings, id),
      }
    })
}

export function deletionOutcome(bookings: Row[], experienceId: string): 'blocked' | 'archive' | 'delete' {
  const own = bookings.filter(b => b.experience_id === experienceId)
  if (own.some(b => b.status === 'On hold' || b.status === 'Booked')) return 'blocked'
  return own.length > 0 ? 'archive' : 'delete'
}
