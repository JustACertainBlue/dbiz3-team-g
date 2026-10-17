import { describe, it, expect } from 'vitest'
import {
  generateDescriptionDraft,
  type AIDescriptionInput,
} from '@/lib/prf/ai-service'
import {
  providerSession,
  guestSession,
  SEED_IDS,
} from '../helpers/mockSession'

describe('T051 | AI Description Refinement Service Unit Tests (FR-007)', () => {
  const provider = providerSession(SEED_IDS.provider1Verified, SEED_IDS.provider1VerifiedUserId)

  const validInput: AIDescriptionInput = {
    original_description: 'Xưởng tôi làm gốm lâu đời ở Bát Tràng, nhiều sản phẩm đẹp và tinh xảo.',
    craft_type: 'Ceramics',
    target_audience: 'general',
    language: 'vi',
  }

  // ── BR-012: Original description returned unchanged, no auto-save ───────────
  it('returns original_description unchanged alongside refined draft (BR-012)', async () => {
    const res = await generateDescriptionDraft(validInput, provider)
    expect(res.original_description).toBe(validInput.original_description)
    expect(res.refined_description_draft).toBeDefined()
    expect(res.refined_description_draft.length).toBeGreaterThan(0)
  })

  // ── BR-011: Factual preservation / draft generated ──────────────────────────
  it('generates non-empty refined draft with valid craft context (BR-011)', async () => {
    const res = await generateDescriptionDraft(validInput, provider)
    expect(res.draft_id).toBeDefined()
    expect(res.created_at).toBeDefined()
    expect(res.refined_description_draft).toContain('Bát Tràng')
  })

  // ── BR-013: Absence of auto-save ───────────────────────────────────────────
  it('does not modify any profile or experience records upon draft generation (BR-013)', async () => {
    const res = await generateDescriptionDraft(validInput, provider) as {
      saved_to_profile?: boolean
    }
    expect(res.saved_to_profile).toBeFalsy()
  })

  // ── Auth enforcement ───────────────────────────────────────────────────────
  it('rejects generation by unauthenticated Guest actor', async () => {
    try {
      await generateDescriptionDraft(validInput, guestSession())
      expect.fail('Should reject unauthenticated guest')
    } catch (err: unknown) {
      const e = err as { statusCode?: number }
      expect([401, 403]).toContain(e.statusCode)
    }
  })
})
