import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { statusLabel } from '@/lib/status-labels'

// Review decision (Khánh Linh, 27/11): the Approved status reads "Đã duyệt" everywhere, from one shared table.
describe('Approved status wording', () => {
  it('the shared table says "Đã duyệt" for Agency and legal Approved', () => {
    expect(statusLabel('agency', 'Approved')).toBe('Đã duyệt')
    expect(statusLabel('legal', 'Approved')).toBe('Đã duyệt')
  })
  it('the account info page (screen 40) reads the label from the shared table, with no own "Được duyệt"', () => {
    const page = readFileSync('src/app/admin/users/[userId]/page.tsx', 'utf8')
    expect(page).not.toContain('Được duyệt')
    expect(page).toMatch(/statusLabel\('agency', 'Approved'\)/)
  })
  it('the account screen (19) reads the label from the shared table', () => {
    expect(readFileSync('src/app/auth-v3/AccountView.tsx', 'utf8')).toMatch(/statusLabel\('agency', 'Approved'\)/)
  })
})
