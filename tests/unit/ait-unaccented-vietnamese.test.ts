/**
 * TC08 — Extractor parses unaccented Vietnamese with a deterministic mock LLM.
 * The mock returns no extracted slots, so these assertions cover local text parsing.
 */
import { afterEach, beforeEach, describe, it, expect } from 'vitest'
import { installAitLlmMock, restoreAitLlmMock } from '../helpers/ait-ai-mocks'
import { extractTourContext } from '@/lib/ai/extractor'

describe('TC08 | Extractor: unaccented Vietnamese (FR-003, BR-004)', () => {
  beforeEach(() => installAitLlmMock())
  afterEach(() => restoreAitLlmMock())

  const P7 = 'Nhom 10 khach, ngan sach 200000 VND, di ngay 20/11/2026, muon trai nghiem gom su, trong vong 30 km tu trung tam Ha Noi.'

  it('BR-004 / TC08-group: extracts group_size from "Nhom 10 khach"', async () => {
    const result = await extractTourContext([{ sender: 'Agency', text: P7 }])
    // The test LLM returns no slots; the extractor parses this value from the input.
    expect(result.tour_context.group_size).toBe(10)
  })

  it('BR-004 / TC08-budget: extracts budget from "ngan sach 200000 VND"', async () => {
    const result = await extractTourContext([{ sender: 'Agency', text: P7 }])
    // budget must be 200000 (not undefined)
    expect(result.tour_context.budget?.max_per_person).toBe(200000)
  })

  it('BR-004 / TC08-craft: detects craft "gom su" as pottery', async () => {
    const result = await extractTourContext([{ sender: 'Agency', text: P7 }])
    expect(result.tour_context.craft_preference).toBe('pottery')
  })

  it('BR-004 / TC08-origin: detects origin from "Ha Noi"', async () => {
    const result = await extractTourContext([{ sender: 'Agency', text: P7 }])
    expect(result.tour_context.origin_or_route?.origin_address).toBeTruthy()
  })

  // Extra boundary: variants that were broken before the fix
  it('BR-004 / TC08-nhom: "nhom 5 nguoi" parses group_size=5', async () => {
    const result = await extractTourContext([{ sender: 'Agency', text: 'nhom 5 nguoi, di ngay 25/11/2026, lam gom bat trang, tu hoan kiem' }])
    expect(result.tour_context.group_size).toBe(5)
  })

  it('BR-004 / TC08-duoi: "duoi 150000" parses budget max_per_person=150000', async () => {
    const result = await extractTourContext([{ sender: 'Agency', text: '10 khach, duoi 150000 VND, di ngay 25/11/2026, lam gom bat trang, tu hoan kiem' }])
    expect(result.tour_context.budget?.max_per_person).toBe(150000)
  })
})

