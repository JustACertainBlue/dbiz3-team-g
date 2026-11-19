/**
 * UI v3 Đợt 1, screens 03 (VIL030 /village/[id]) and 03a (/villages), mockup pack 19/11/2026. Human decisions 2026-11-19:
 * village image = villages.cover_image_id, else the first experience image of the village; a village without any image
 * is left out of the lists (01/21/03a); "Vì sao nên đưa đoàn đến…" = suitable_for of the village's live experiences,
 * deduplicated, in vocabulary order; "Hoạt động nổi bật" = up to 3 experience names joined with ", "; "Điểm nổi bật
 * của làng" = villages.highlights (≤ 4) with the computed counter card always second; empty distance_km hides the
 * distance line (03 and 03a).
 */
import { describe, expect, it } from 'vitest'
import { seed } from './v3-village-fixtures'
import { villageTiles } from '@/lib/explore/v3-home'
import { VILLAGE_PAGE_SIZE, villageCards, villageImage, villageList, villageView, villagesWithoutImage } from '@/lib/explore/v3-village'

describe('villageImage', () => {
  it('uses the cover image first, then the first experience image of the village, else null', () => {
    expect(villageImage(seed(), 'v2')).toBe('/api/prf/media/fc')
    expect(villageImage(seed(), 'v1')).toBe('/api/prf/media/f1')
    expect(villageImage(seed(), 'v3')).toBeNull()
  })
  it('drives the 01/21 village grid too (no workshop-image fallback, no imageless village)', () => {
    expect(villageTiles(seed()).map(tile => [tile.village_id, tile.image])).toEqual([['v1', '/api/prf/media/f1'], ['v2', '/api/prf/media/fc']])
  })
})

describe('villageCards / villagesWithoutImage (03a)', () => {
  it('lists active villages with an image: craft · area, workshop and experience counts, distance only when known', () => {
    expect(villageCards(seed())).toEqual([
      { village_id: 'v1', name: 'Bát Tràng', craft: 'Làm gốm', craftKey: 'Ceramics', area: 'Gia Lâm, Hà Nội', providers: 2, experiences: 4, distance: 'Cách trung tâm khoảng 13 km', image: '/api/prf/media/f1' },
      { village_id: 'v2', name: 'Vạn Phúc', craft: 'Dệt lụa', craftKey: 'Silk/Textile', area: 'Hà Đông, Hà Nội', providers: 1, experiences: 1, distance: '', image: '/api/prf/media/fc' },
    ])
  })
  it('names the active villages left out for lack of an image', () => {
    expect(villagesWithoutImage(seed())).toEqual([{ village_id: 'v3', name: 'Chuông' }])
  })
})

describe('villageList (03a filter and pages)', () => {
  it('filters by craft with counts per craft and pages of 9', () => {
    expect(VILLAGE_PAGE_SIZE).toBe(9)
    const all = villageList(seed(), {})
    expect(all).toMatchObject({ total: 2, page: 1, craft: '' })
    expect(all.facets).toEqual([{ value: 'Dệt lụa', label: 'Dệt lụa', n: 1 }, { value: 'Làm gốm', label: 'Làm gốm', n: 1 }])
    const silk = villageList(seed(), { nghe: 'Dệt lụa' })
    expect(silk.items.map(item => item.village_id)).toEqual(['v2'])
    expect(silk).toMatchObject({ total: 1, craft: 'Dệt lụa' })
    expect(villageList(seed(), { nghe: 'Unknown' }).total).toBe(2)
    expect(villageList(seed(), { page: '9' }).page).toBe(1)
  })
})

describe('villageView (03)', () => {
  const view = villageView(seed(), 'v1', { kind: 'guest' }, { date: '', guests: null, ex: '' })!
  it('is null for an unknown or inactive village', () => {
    expect(villageView(seed(), 'v4', { kind: 'guest' }, { date: '', guests: null, ex: '' })).toBeNull()
    expect(villageView(seed(), 'nope', { kind: 'guest' }, { date: '', guests: null, ex: '' })).toBeNull()
  })
  it('heads the page with craft, name, place and distance; gallery = cover/experience images without empty frames', () => {
    expect(view).toMatchObject({ eyebrow: 'LÀNG NGHỀ LÀM GỐM', title: 'Làng Bát Tràng', place: 'Bát Tràng, Gia Lâm, Hà Nội · Cách trung tâm khoảng 13 km' })
    expect(view.images).toEqual(['/api/prf/media/f1', '/api/prf/media/f3', '/api/prf/media/f2'])
    expect(villageView(seed(), 'v3', { kind: 'guest' }, { date: '', guests: null, ex: '' })!.images).toEqual([])
    expect(villageView(seed(), 'v2', { kind: 'guest' }, { date: '', guests: null, ex: '' })!.place).toBe('Vạn Phúc, Hà Đông, Hà Nội')
  })
  it('puts the computed counter card second among the village highlights (at most 4 cards)', () => {
    expect(view.highlights).toEqual([
      { title: 'Làng gốm lâu đời', sub: 'Nhiều gia đình làm gốm', counter: false },
      { title: '4 trải nghiệm ở 2 xưởng', sub: '', counter: true },
      { title: 'Xem nghệ nhân làm việc', sub: 'Từ vuốt hình đến nung lò', counter: false },
      { title: 'Mua quà gốm', sub: 'Chợ gốm quanh làng', counter: false },
    ])
    expect(villageView(seed(), 'v2', { kind: 'guest' }, { date: '', guests: null, ex: '' })!.highlights).toEqual([{ title: '1 trải nghiệm ở 1 xưởng', sub: '', counter: true }])
  })
  it('"Vì sao nên đưa đoàn đến…" merges suitable_for in vocabulary order without duplicates', () => {
    expect(view.why).toEqual(['Đoàn học sinh', 'Khách quốc tế', 'Tour nửa ngày'])
  })
  it('"Hoạt động nổi bật" joins up to 3 experience names, lower-case after the first', () => {
    expect(view.info).toEqual([
      { label: 'Địa chỉ', value: 'Bát Tràng, Gia Lâm, Hà Nội' },
      { label: 'Hoạt động nổi bật', value: 'In hoa văn lên đĩa gốm, nặn gốm thủ công, nặn tượng nhỏ' },
    ])
  })
  it('lists the workshops (most experiences first, then by name) with owner, experience count and largest group', () => {
    expect(view.providers).toEqual([
      { id: 'p3', name: 'Xưởng gốm Gia Phúc', initials: 'GP', owner: 'Đỗ Minh Khoa', line: '2 trải nghiệm · Nhận đoàn tới 25 khách/ca', firstExperienceId: 'e3' },
      { id: 'p1', name: 'Xưởng thủ công Bát Tràng', initials: 'BT', owner: 'Kiều Anh Thư', line: '2 trải nghiệm · Nhận đoàn tới 12 khách/ca', firstExperienceId: 'e1' },
    ])
  })
  it('shows 3 experience cards, the rest behind "Xem thêm", and narrows to the chosen experience', () => {
    expect(view.results.map(item => item.id)).toHaveLength(3)
    expect(view.experienceCount).toBe(4)
    expect(view.moreHref).toBe('/explore/search?lang=v1')
    expect(view.options).toEqual([{ id: 'e3', name: 'In hoa văn lên đĩa gốm' }, { id: 'e1', name: 'Nặn gốm thủ công' }, { id: 'e4', name: 'Nặn tượng nhỏ' }, { id: 'e2', name: 'Vẽ men lam trên bát' }])
    const one = villageView(seed(), 'v1', { kind: 'guest' }, { date: '', guests: null, ex: 'e2' })!
    expect(one.results.map(item => item.id)).toEqual(['e2'])
    expect(one.moreHref).toBe('')
  })
  it('notes: filled visit_notes rows plus the days no workshop of the village opens; tour suggestion box', () => {
    expect(view.notes).toEqual([
      { key: 'trang_phuc', label: 'Trang phục', text: 'Mặc đồ dễ giặt.' },
      { key: 'gio_den', label: 'Giờ đến', text: 'Báo giờ đến trước một ngày.' },
      { key: 'ngay_nghi', label: 'Ngày nghỉ', text: 'Xưởng nghỉ Thứ 7, Chủ nhật.' },
    ])
    expect(view.tour).toEqual({ title: 'Hợp cho tour nửa ngày!', lines: ['Gần trung tâm'], extras: ['Mỗi khách mang về một sản phẩm'] })
    expect(view.about).toEqual(['Làng gốm bên sông Hồng.', 'Nhiều gia đình làm gốm.'])
  })
})
