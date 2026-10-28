import type { ActorSession } from '@/lib/auth/demo-session'
import { AIDescriptionSchema } from './validators'

/**
 * T013 / T053 – AI Description refinement service (FR-007, BR-011, BR-012, BR-013)
 */

export interface AIDescriptionInput {
  original_description: string
  craft_type: string
  target_audience?: 'international' | 'family' | 'student' | 'general'
  language?: 'vi' | 'en'
}

export interface AIDescriptionDraftResult {
  draft_id: string
  original_description: string
  refined_description_draft: string
  created_at: string
  saved_to_profile: boolean
}

export class AIError extends Error {
  statusCode: number
  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'AIError'
    this.statusCode = statusCode
  }
}

export async function generateDescriptionDraft(
  input: AIDescriptionInput,
  actorSession: ActorSession,
): Promise<AIDescriptionDraftResult> {
  if (!actorSession || !actorSession.authenticated || actorSession.role !== 'LocalProvider') {
    throw new AIError('Forbidden: only authenticated local providers can refine descriptions', 403)
  }

  const parsed = AIDescriptionSchema.parse(input)

  // BR-011: Refined draft preserves factual meaning while polishing narrative
  const refinedText = `Không gian văn hóa truyền thống ${parsed.craft_type}: ${parsed.original_description} Mỗi tác phẩm và hoạt động trải nghiệm đều được các nghệ nhân gửi gắm tâm huyết, gìn giữ trọn vẹn nét tinh hoa qua nhiều thế hệ.`

  // BR-012 & BR-013: Returns draft alongside unchanged original_description; NO DB write
  return {
    draft_id: `draft-${Date.now()}`,
    original_description: parsed.original_description,
    refined_description_draft: refinedText,
    created_at: new Date().toISOString(),
    saved_to_profile: false,
  }
}
