/**
 * Screen 24 (/explore/providers/[id]), gallery (human request 2026-11-21): a workshop without images in
 * provider_version_media shows one image per live experience of its own (the first one), landscape first, at most 5;
 * with no image at all the whole gallery block is hidden.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { ExploreSeed } from '@/lib/explore/catalog'
import { providerView } from '@/lib/explore/v3-provider'

const NOW = new Date('2026-11-18T03:00:00.000Z')
const exp = (id: string, provider = 'p1', archived = '') => ({ experience_id: id, provider_id: provider, name: `Trải nghiệm ${id}`, category: 'Workshop/Hands-on', duration_minutes: '60', max_participants: '10', price_per_person: '100000', notice_period_hours: '24', archived_at: archived })
// photo = [file id, width, height]
type Photo = [string, number, number]
function seed(experiences: Record<string, Photo[]>, providerPhotos: Photo[] = [], archived: string[] = []): ExploreSeed {
  const files: Record<string, string>[] = [], media: Record<string, string>[] = [], versionMedia: Record<string, string>[] = []
  const add = (photo: Photo) => { if (!files.some(f => f.file_id === photo[0])) files.push({ file_id: photo[0], storage_key: `prf-media/${photo[0]}`, media_type: 'image/jpeg', file_size_bytes: '1000', width_px: String(photo[1]), height_px: String(photo[2]) }) }
  for (const [id, photos] of Object.entries(experiences)) photos.forEach((photo, order) => { add(photo); media.push({ profile_media_id: `${id}-${order}`, file_id: photo[0], experience_id: id, display_order: String(order) }) })
  providerPhotos.forEach((photo, order) => { add(photo); versionMedia.push({ provider_id: 'p1', version_no: '1', file_id: photo[0], display_order: String(order) }) })
  return {
    villages: [{ village_id: 'v1', name: 'Bát Tràng', district: 'Gia Lâm', city_province: 'Hà Nội', is_active: 'true' }],
    user_accounts: [{ user_id: 'u1', account_status: 'Active', full_name: 'Kiều Anh Thư' }],
    provider_profiles: [{ provider_id: 'p1', user_id: 'u1', village_id: 'v1', verification_status: 'Verified', published_version_no: '1' }],
    provider_profile_versions: [{ provider_id: 'p1', version_no: '1', version_status: 'Verified', business_name: 'Xưởng thử', craft_type: 'Ceramics', location_address: 'Bát Tràng' }],
    experiences: Object.keys(experiences).map(id => exp(id, 'p1', archived.includes(id) ? '2026-01-01' : '')),
    agency_profiles: [], agency_preference_profiles: [], experience_discount_rules: [], bookings: [], provider_operating_hours: [],
    profile_media: media, stored_files: files, provider_version_media: versionMedia,
  } as unknown as ExploreSeed
}
const land = (id: string): Photo => [id, 1600, 900], port = (id: string): Photo => [id, 900, 1600]
const urls = (view: { images: { url: string }[] }) => view.images.map(image => image.url.split('?')[0].split('/').pop())
const guest = { kind: 'guest' as const }

describe('providerView images (screen 24 gallery)', () => {
  it('without provider images: one image per live experience, the first of each, in the experiences\' order', () => {
    const view = providerView(seed({ e1: [land('a1'), land('a2')], e2: [land('b1'), land('b2')], e3: [land('c1')] }), 'p1', guest, NOW, false)!
    expect(urls(view)).toEqual(['a1', 'b1', 'c1'])
  })
  it('keeps landscape images first (stable) and at most 5, so portrait ones drop out when there are enough landscape ones', () => {
    const view = providerView(seed({ e1: [port('p1x')], e2: [land('l2')], e3: [land('l3')], e4: [port('p4x')], e5: [land('l5')], e6: [land('l6')], e7: [land('l7')] }), 'p1', guest, NOW, false)!
    expect(urls(view)).toEqual(['l2', 'l3', 'l5', 'l6', 'l7'])
    expect(view.images).toHaveLength(5)
  })
  it('fills with portrait images after the landscape ones when there are fewer than 5 landscape ones', () => {
    const view = providerView(seed({ e1: [port('p1x')], e2: [land('l2')], e3: [port('p3x')] }), 'p1', guest, NOW, false)!
    expect(urls(view)).toEqual(['l2', 'p1x', 'p3x'])
  })
  it('does not count archived experiences, and an experience without images adds none', () => {
    const view = providerView(seed({ e1: [land('a1')], e2: [land('b1')], e3: [] }, [], ['e2']), 'p1', guest, NOW, false)!
    expect(urls(view)).toEqual(['a1'])
  })
  it('shows each shared image once', () => {
    const view = providerView(seed({ e1: [land('same')], e2: [land('same')], e3: [land('c1')] }), 'p1', guest, NOW, false)!
    expect(urls(view)).toEqual(['same', 'c1'])
  })
  it('with provider_version_media images the gallery is unchanged: workshop images first, then the experiences\' images', () => {
    const view = providerView(seed({ e1: [land('a1'), land('a2')] }, [land('w1'), land('w2')]), 'p1', guest, NOW, false)!
    expect(urls(view)).toEqual(['w1', 'w2', 'a1', 'a2'])
  })
  it('no image anywhere: images is empty', () => {
    expect(providerView(seed({ e1: [], e2: [] }), 'p1', guest, NOW, false)!.images).toEqual([])
  })
})

describe('screen 24 page: no empty gallery block', () => {
  const page = readFileSync('src/app/explore/providers/[id]/page.tsx', 'utf8')
  const css = readFileSync('src/app/explore/v3/explore-v3.css', 'utf8')
  it('renders the Gallery only when there are images and lets the side column take the row otherwise', () => {
    expect(page).toMatch(/view\.images\.length > 0 && <Gallery /)
    expect(page).toContain('v3d-hero--nogal')
    expect(css).toMatch(/\.v3d-hero--nogal \.v3d-side \{[^}]*max-width: none/)
  })
})
