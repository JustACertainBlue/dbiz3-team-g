import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { createElement } from 'react'
import { statusLabel, statusLook, STATUS_LOOKS } from '@/lib/status-labels'
import StatusBadge from '@/app/components/StatusBadge'

// Design wave 2 (Design System v9 §2, Figma "Status Badge"; spec-BKG #49 and screen-spec-DSH018 §8 amended
// 2026-11-08): one shared table turns canonical statuses into Vietnamese labels; stored/API values stay canonical.
describe('Status labels and badge (design wave 2)', () => {
  it('BKG #49 / DSH018 (normal): every canonical Booking status has its Figma label', () => {
    expect(['On hold', 'Booked', 'Completed', 'Cancelled'].map(s => statusLabel('booking', s))).toEqual(['Tạm giữ', 'Đã đặt', 'Hoàn tất', 'Đã huỷ'])
  })

  it('schema enums (normal): every canonical value of each family (data/schema.sql) has a Vietnamese label', () => {
    const enums: Record<string, string[]> = {
      provider: ['Draft', 'Pending Verification', 'Verified', 'Revision Required', 'Superseded'],
      agency: ['Pending Approval', 'Approved', 'Rejected', 'Disabled'],
      account: ['Active', 'Disabled'],
      legal: ['Pending Review', 'Approved', 'Rejected'],
      calendar: ['Available', 'On hold', 'Booked', 'Unavailable'],
      chat: ['Active', 'Closed'],
    }
    for (const [family, values] of Object.entries(enums)) {
      for (const value of values) {
        const label = statusLabel(family as keyof typeof STATUS_LOOKS, value)
        expect(label, `${family}/${value}`).not.toBe(value)
        expect(label, `${family}/${value}`).toMatch(/[ạ-ỹđĐàáảãâầấẩẫậăằắẳẵặèéẻẽêềếểễệìíỉĩòóỏõôồốổỗộơờớởỡợùúủũưừứửữựỳýỷỹ]/i)
      }
    }
    expect(statusLabel('provider', 'Pending Verification')).toBe('Chờ xác minh')
    expect(statusLabel('chat', 'Closed')).toBe('Đã đóng')
  })

  it('boundary: an unknown value keeps its own text with a neutral tone, never a guessed meaning', () => {
    expect(statusLook('legal', 'Request More Information')).toMatchObject({ label: 'Request More Information', tone: 'neutral' })
    expect(statusLabel('booking', undefined)).toBe('')
  })

  it('badge (normal): icon + label, canonical value kept in data-status, v9 status tokens; Booked is outlined, On hold is not', () => {
    const booked = renderToStaticMarkup(createElement(StatusBadge, { family: 'booking', status: 'Booked' }))
    expect(booked).toContain('Đã đặt')
    expect(booked).toContain('<svg')
    expect(booked).toContain('aria-hidden="true"')
    expect(booked).toContain('data-status="Booked"')
    expect(booked).toContain('var(--color-status-booking-booked-fg)')
    expect(booked).toContain('inset 0 0 0 2px var(--color-status-booking-booked-border)')
    const onHold = renderToStaticMarkup(createElement(StatusBadge, { family: 'booking', status: 'On hold' }))
    expect(onHold).toContain('Tạm giữ')
    expect(onHold).not.toContain('inset')
    expect(renderToStaticMarkup(createElement(StatusBadge, { family: 'flag', status: 'Needs action' }))).toContain('Cần xử lý')
  })
})
