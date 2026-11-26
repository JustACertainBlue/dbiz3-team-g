import { describe, expect, it } from 'vitest'
import { dashboardTitle } from '@/lib/adm/dashboard-view'

// A village name that already starts with "Làng" must not get the prefix a second time.
describe('dashboardTitle never shows "Làng Làng …"', () => {
  it.each([
    ['Làng gốm Bát Tràng', 'Dashboard Làng gốm Bát Tràng'],
    ['làng Chuông', 'Dashboard làng Chuông'],
    ['LÀNG nón Chuông', 'Dashboard LÀNG nón Chuông'],
  ])('%s → %s', (name, title) => {
    expect(dashboardTitle(name)).toBe(title)
    expect(dashboardTitle(name).toLocaleLowerCase('vi')).not.toContain('làng làng')
  })

  it('a plain name still gets the prefix once, and the city scope is unchanged', () => {
    expect(dashboardTitle('Bát Tràng')).toBe('Dashboard làng Bát Tràng')
    expect(dashboardTitle(null)).toBe('Dashboard toàn thành phố')
  })
})
