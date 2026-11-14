/**
 * TC08 — Heuristic fallback parses unaccented (no-diacritic) Vietnamese input
 * Covers: FR-003, BR-004, BR-017
 *
 * This test must FAIL on the commit before 8ee5d2f7 and PASS after.
 * Root cause: group_size regex only matched khách/người (accented).
 * Fix: PR on feat/ait-conversational-llm, commit 8ee5d2f7.
 *
 * NOTE: extractTourContext uses the heuristic fallback when
 * CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_API_TOKEN are absent (isConfigured()=false)
 * or when the LLM is in cooldown. In the hosted deploy the LLM is live; the
 * fallback is the safety net for quota exhaustion. Both paths must handle
 * unaccented input correctly — these tests cover the fallback path directly.
 */
import { describe, it, expect } from 'vitest'
import { ConversationalAiService } from '@/lib/ai/llm-service'

// Access the fallback parser directly — bypass LLM so we test the regex we patched.
// ConversationalAiService.fallbackAnalysis is private; we call it via the public
// analyse() surface by temporarily removing the Cloudflare env vars.
// Instead, import the internal helper used by fallbackAnalysis through the module
// boundary that is already unit-tested in clarification.test.ts.
// We can test indirectly: extractTourContext calls llm-service which calls fallback
// when client is not configured. In the vitest environment Cloudflare creds are
// not set (no .env loaded), so isConfigured() returns false → fallback runs.

import { extractTourContext } from '@/lib/ai/extractor'

describe('TC08 | Heuristic fallback: unaccented Vietnamese (FR-003, BR-004)', () => {
  const P7 = 'Nhom 10 khach, ngan sach 200000 VND, di ngay 20/11/2026, muon trai nghiem gom su, trong vong 30 km tu trung tam Ha Noi.'

  it('BR-004 / TC08-group: extracts group_size from "Nhom 10 khach"', async () => {
    const result = await extractTourContext([{ sender: 'Agency', text: P7 }])
    // group_size must be 10 regardless of whether LLM or fallback ran
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
