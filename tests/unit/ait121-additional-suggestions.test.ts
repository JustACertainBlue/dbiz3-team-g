/**
 * Issue #188 — AIT121 AI Tour Matching.
 * - spec-AIT FR-008 (`docs/spec/specs/spec-AIT.md:239`, Must): "Generate and display the highest-ranked Experience
 *   recommendations and additional suitable suggestions"; §5.1 (:260) `additional_suggestions (Array<Object>; Optional —
 *   up to 5 additional eligible Experiences after the Top 5)`. The API already returns them; the screen must show them.
 * - screen-spec-AIT121 §3 #1 heading "AI Tour Matching": the page renders inside the shared app shell, so its own
 *   "Hanoi Artisan Bridge" top bar (a second header over the shell) and the fixed 100vh frame are removed.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { matchResultsView } from '@/app/ai-matching/matching-view'

const item = (n: number) => ({ experience_id: `e${n}`, provider_id: `p${n}`, name: `Exp ${n}`, provider_name: `Prov ${n}`, village_name: 'Bát Tràng',
  rank: n, match_score: 90 - n, price_per_person: 100000, max_participants: 20, explanation: `why ${n}` })

describe('#188 | AIT121 shows additional suggestions (FR-008)', () => {
  it('maps top_matches and up to five additional_suggestions with the same card fields', () => {
    const view = matchResultsView({ top_matches: [item(1), item(2)], additional_suggestions: [6, 7, 8, 9, 10, 11].map(item) })
    expect(view.top.map(r => r.experience_id)).toEqual(['e1', 'e2'])
    expect(view.additional.map(r => r.experience_id)).toEqual(['e6', 'e7', 'e8', 'e9', 'e10'])
    expect(view.additional[0]).toEqual({ experience_id: 'e6', provider_id: 'p6', experience_name: 'Exp 6', provider_name: 'Prov 6', village_name: 'Bát Tràng',
      rank: 6, match_score: 84, price_per_person: 100000, max_participants: 20, explanation: 'why 6' })
  })

  it('no additional_suggestions → an empty list', () => {
    expect(matchResultsView({ top_matches: [item(1)] }).additional).toEqual([])
  })

  it('the page renders full cards only for top matches and the additional ones as text actions under "Gợi ý thêm"', () => {
    const page = readFileSync('src/app/ai-matching/page.tsx', 'utf8')
    expect(page).toContain('const { top: topMatches, additional } = matchResultsView(result.body)')
    expect(page).toContain('additionalSuggestions: additional,')
    expect(page).toContain('msg.recommendations.map((rec) => {')
    expect(page).toContain('msg.additionalSuggestions.map((rec) => (')
    expect(page).not.toContain('[...msg.recommendations, ...(msg.additionalSuggestions ?? [])]')
    expect(page).toContain('Gợi ý thêm')
  })

  it('choosing one sends its prompt through the composer path (same send function, same user bubble, disabled while busy)', () => {
    const page = readFileSync('src/app/ai-matching/page.tsx', 'utf8')
    expect(page).toContain("import { additionalSuggestionPrompt } from './suggestion-prompt'")
    expect(page).toMatch(/onClick=\{\(\) => handleSendMessage\(additionalSuggestionPrompt\(rec\)\)\}/)
    expect(page).toMatch(/className="aim__suggestion"[\s\S]{0,200}disabled=\{loading\}/)
    // The composer's own send path: it adds the Agency bubble, then analyzes through the same API call as typed text.
    expect(page).toMatch(/const handleSendMessage = async \(customPrompt\?: string\)/)
    expect(page).toContain("await analyze({ sender: 'Agency', text: textToSend })")
    expect(page).toContain("if (!customPrompt) setInputText('')")
  })
})

describe('#188 | AIT121 sits inside the app shell (one header)', () => {
  it('has no own top bar and no fixed 100vh frame; the heading reads "Ghép tour AI"', () => {
    const page = readFileSync('src/app/ai-matching/page.tsx', 'utf8')
    expect(page).not.toContain('Screen AIT121 — Conversational AI Tour Matching')
    expect(page).not.toMatch(/height: '100vh'/)
    expect(page).toMatch(/<h1[^>]*>\s*Ghép tour AI\s*<\/h1>/)
  })
})
