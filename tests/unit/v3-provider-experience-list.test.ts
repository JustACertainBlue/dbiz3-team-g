// Screen 31 (EXP067): rows of "Trải nghiệm của xưởng" built from the seed rows (view-model, no UI).
import { describe, expect, it } from 'vitest'
import { providerExperienceRows, EXPERIENCE_PAGE_SIZE } from '@/lib/provider/experience-list-view'

const NOW = Date.parse('2026-11-21T00:00:00+07:00')
const exp = (id: string, extra: Record<string, string> = {}) => ({ experience_id: id, provider_id: 'p1', name: `Exp ${id}`, duration_minutes: '60', price_per_person: '150000.00', max_participants: '12',
  notice_period_hours: '24', cancellation_policy: '{"before_hours":24,"refund_percent":80}', archived_at: '', updated_at: '2026-09-22T08:00:00+07:00', ...extra })
const base = () => ({
  experiences: [exp('e1'), exp('e2', { cancellation_policy: '' }), exp('e3', { provider_id: 'p2' }), exp('e4', { archived_at: '2026-10-01T00:00:00+07:00' })],
  bookings: [
    { experience_id: 'e1', status: 'Booked', start_at: '2026-11-25T09:00:00+07:00' },
    { experience_id: 'e1', status: 'On hold', start_at: '2026-12-02T09:00:00+07:00' },
    { experience_id: 'e1', status: 'Cancelled', start_at: '2026-12-05T09:00:00+07:00' },
    { experience_id: 'e1', status: 'Booked', start_at: '2026-10-01T09:00:00+07:00' },
  ],
  profile_media: [{ experience_id: 'e1', file_id: '1b9f0c34-77a5-4b61-8d0f-0a1b2c3d4e5f', display_order: '2' }, { experience_id: 'e1', file_id: '0b9f0c34-77a5-4b61-8d0f-0a1b2c3d4e5f', display_order: '1' }],
  stored_files: [
    { file_id: '0b9f0c34-77a5-4b61-8d0f-0a1b2c3d4e5f', storage_key: 'prf-media/0b9f0c34-77a5-4b61-8d0f-0a1b2c3d4e5f', media_type: 'image/webp', file_size_bytes: '100', width_px: '1280', height_px: '960' },
    { file_id: '1b9f0c34-77a5-4b61-8d0f-0a1b2c3d4e5f', storage_key: 'prf-media/1b9f0c34-77a5-4b61-8d0f-0a1b2c3d4e5f', media_type: 'image/webp', file_size_bytes: '200', width_px: '1280', height_px: '960' },
  ],
})

describe('providerExperienceRows', () => {
  it('keeps only this provider, hides archived ones unless asked, and uses the first image by display order', () => {
    const rows = providerExperienceRows(base(), 'p1', { now: NOW })
    expect(rows.map(row => row.id)).toEqual(['e1', 'e2'])
    expect(rows[0].image?.url).toContain('0b9f0c34')
    expect(rows[1].image).toBeNull()
  })
  it('counts only upcoming On hold / Booked bookings', () => {
    const rows = providerExperienceRows(base(), 'p1', { now: NOW })
    expect(rows[0].upcomingBookings).toBe(2)
    expect(rows[1].upcomingBookings).toBe(0)
    expect([rows[0].totalBookings, rows[1].totalBookings]).toEqual([4, 0])
  })
  it('formats the cancellation clause only when a policy exists', () => {
    const rows = providerExperienceRows(base(), 'p1', { now: NOW })
    expect(rows[0].cancelText).toBe('huỷ trước 24 giờ hoàn 80%')
    expect(rows[1].cancelText).toBeNull()
  })
  it('includes archived rows when asked and marks them', () => {
    const rows = providerExperienceRows(base(), 'p1', { now: NOW, includeArchived: true })
    expect(rows.find(row => row.id === 'e4')?.archived).toBe(true)
  })
  it('exposes the update date (dd/mm/yyyy, Hanoi time)', () => {
    expect(providerExperienceRows(base(), 'p1', { now: NOW })[0].updatedText).toBe('22/09/2026')
  })
  it('says what delete does: blocked by an active booking, archive with history only, else delete', () => {
    const seed = base(); seed.bookings.push({ experience_id: 'e2', status: 'Completed', start_at: '2026-08-01T09:00:00+07:00' })
    const rows = providerExperienceRows(seed, 'p1', { now: NOW })
    expect(rows.map(row => row.deletion)).toEqual(['blocked', 'archive'])
    expect(providerExperienceRows({ ...base(), bookings: [] }, 'p1', { now: NOW })[0].deletion).toBe('delete')
  })
  it('paginates by EXPERIENCE_PAGE_SIZE', () => {
    expect(EXPERIENCE_PAGE_SIZE).toBe(5)
  })
})
