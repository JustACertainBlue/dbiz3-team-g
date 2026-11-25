import { describe, expect, it } from 'vitest'
import { formatVillageName } from '@/lib/village-name'
import { craftLine } from '@/lib/provider/craft-line'
import { loadExploreRuntime } from '@/lib/explore/seed-repository'
import { villageView } from '@/lib/explore/v3-village'
import { resolveViewer } from '@/lib/explore/catalog'

const NAMES = ['Bát Tràng', 'Vạn Phúc', 'Phú Vinh', 'Chuông', 'Quất Động', 'Sơn Đồng', 'Đào Thục', 'Hạ Thái', 'Kim Lan', 'Xuân La', 'Yên Thái', 'Chàng Sơn', 'Bá Dương Nội', 'Ngũ Xã', 'Phùng Xá']

describe('formatVillageName', () => {
  it('adds the village prefix once, for every village name of the catalog', () => {
    for (const name of NAMES) {
      expect(formatVillageName(name)).toBe(`Làng ${name}`)
      expect(formatVillageName(`Làng ${name}`)).toBe(`Làng ${name}`)
    }
  })

  it('keeps an existing prefix whatever its casing, trims, and never doubles it', () => {
    expect(formatVillageName('  LÀNG nón Chuông  ')).toBe('LÀNG nón Chuông')
    expect(formatVillageName(' bát tràng ')).toBe('Làng bát tràng')
    expect(formatVillageName('Làng gốm Bát Tràng').toLocaleLowerCase('vi')).not.toContain('làng làng')
  })

  it('uses another prefix when asked, and a neutral name when there is none', () => {
    expect(formatVillageName('Chuông', 'Làng nghề')).toBe('Làng nghề Chuông')
    expect(formatVillageName('Làng nghề Chuông', 'Làng nghề')).toBe('Làng nghề Chuông')
    expect(formatVillageName(null)).toBe('Làng nghề truyền thống')
    expect(formatVillageName('   ')).toBe('Làng nghề truyền thống')
  })
})

describe('screens use it, so a name that already starts with "Làng" is not doubled', () => {
  it('the craft line of the Provider screens', () => {
    expect(craftLine('Ceramics', { name: 'Làng gốm Bát Tràng' })).not.toMatch(/Làng Làng/i)
    expect(craftLine('Ceramics', { name: 'Bát Tràng' })).toContain('Làng Bát Tràng')
  })

  it('the village page title', async () => {
    const seed = await loadExploreRuntime()
    const village = seed.villages[0]
    const original = village.name
    village.name = `Làng gốm ${original}`
    try {
      const view = villageView(seed, village.village_id, resolveViewer(seed, null, true), { date: '', guests: null, ex: '' })
      expect(view?.title).not.toMatch(/Làng Làng/i)
      expect(view?.title).toBe(`Làng gốm ${original}`)
    } finally {
      village.name = original
    }
  })
})
