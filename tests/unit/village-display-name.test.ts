import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { formatVillageName } from '@/lib/village-name'
import { resolveActivityCards, resolveProviderCards, resolveVillageCards } from '@/lib/matching/card-resolver'

const villages = [
  'Bát Tràng',
  'Vạn Phúc',
  'Phú Vinh',
  'Chuông',
  'Quất Động',
  'Sơn Đồng',
  'Đào Thục',
  'Hạ Thái',
  'Kim Lan',
  'Xuân La',
  'Yên Thái',
  'Chàng Sơn',
  'Bá Dương Nội',
  'Ngũ Xã',
  'Phùng Xá',
]

describe('formatVillageName', () => {
  it('renders all 15 village names without duplicating the village prefix', () => {
    const markup = renderToStaticMarkup(createElement(
      'ul',
      null,
      villages.map(name => createElement('li', { key: name }, formatVillageName(name)))
    ))

    expect(markup.match(/<li>/g)).toHaveLength(15)
    expect(markup.toLocaleLowerCase()).not.toContain('làng làng')
  })

  it('preserves an existing prefix regardless of casing and trims whitespace', () => {
    expect(formatVillageName('  LÀNG nón Chuông  ')).toBe('LÀNG nón Chuông')
    expect(formatVillageName(' bát tràng ')).toBe('Làng bát tràng')
  })

  it('uses the normalized name in village, provider, and activity cards', () => {
    expect(resolveVillageCards('làng gốm Bát Tràng')[0].name).toBe('Làng gốm Bát Tràng')
    expect(resolveProviderCards('xưởng gốm Bát Tràng')[0].village_name).toBe('Làng Bát Tràng')
    expect(resolveActivityCards('nặn gốm Bát Tràng')[0].village_name).toBe('Làng Bát Tràng')
  })

  it('does not render the unsupported cultural-affinity badge', () => {
    const component = readFileSync('src/app/ai-matching/AiMatchingClient.tsx', 'utf8')
    expect(component).not.toContain('GẮN VỚI VĂN HOÁ CAO')
  })
})
