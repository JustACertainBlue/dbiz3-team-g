import type { ConversationMessage } from '@/lib/matching/session-service'
import type { TourContext, TourPreferenceProfile } from '@/lib/matching/types'
import { systemClock } from '@/lib/booking/clock'
import { loadVillages } from '@/lib/db/seed-loader'
import { applyConversationDelta } from '@/lib/ait/conversation-delta'
import {
  type AitConversationState,
  applyConversationState,
  emptyConversationState,
  sanitizeUnsupportedFollowUpQuestions,
  isCompleteConversationState,
  mergeConversationState,
  missingQuestions,
} from '@/lib/ait/conversation-state'
import { buildTourPreferenceProfile } from './extractor'
import { loadConversationState, saveConversationState } from './conversation-store'
import { ConversationalAiService } from './llm-service'
import { postCheckReply } from './postcheck'
import { preCheckTurn } from './turn-validators'
import { craftLabelVi, craftSuggestionTargets, pastDateNotice } from './turn-guards'

export interface CraftProfile {
  craft: string
  label: string
  profile: TourPreferenceProfile
}

export interface LlmTurn {
  extraction: {
    is_complete: boolean
    processing_status: 'Success'
    retry_available: false
    follow_up_questions: string[]
    tour_context: TourContext
    conversational_reply: string
    intent: string
    missing_primary: string[]
  }
  tour_preference_profile: TourPreferenceProfile | null
  tour_preference_profiles: CraftProfile[]
}

/**
 * Analyses one turn with the language model. It throws AiServiceUnavailableError when no provider can
 * answer: the caller returns 503 and never falls back to rules. Matching itself is not done here; the
 * profiles returned feed the existing /api/ait/matching pipeline.
 */
const exclusionsOf = (state: AitConversationState) => ({ villages: state.exclusions.villages, crafts: state.exclusions.crafts })

/** Model reply after the checks: no question about topics the platform does not handle, no leak or booking claim. */
function finalReply(reply: string): string {
  const cleaned = sanitizeUnsupportedFollowUpQuestions(reply).trim()
  return postCheckReply(cleaned || 'Mình đã ghi nhận yêu cầu của đoàn.').message
}

export async function runLlmTurn(
  sessionId: string,
  messages: ConversationMessage[],
  options: { isRetry?: boolean } = {}
): Promise<LlmTurn> {
  const now = systemClock
  const userTurns = messages.filter(message => message.sender?.toLowerCase() !== 'assistant')
  const latest = userTurns.at(-1)?.text ?? ''
  const current = await loadConversationState(sessionId)

  // Invalid or unsupported requests are answered here, without calling the model.
  const pre = options.isRetry ? null : preCheckTurn(latest)
  if (pre) {
    if (pre.kind === 'reset') await saveConversationState(sessionId, emptyConversationState())
    const kept = pre.kind === 'reset' ? emptyConversationState() : current
    return {
      extraction: {
        is_complete: false,
        processing_status: 'Success',
        retry_available: false,
        follow_up_questions: [],
        tour_context: applyConversationState({}, kept),
        conversational_reply: pre.reply,
        intent: 'platform_guidance',
        missing_primary: [],
      },
      tour_preference_profile: null,
      tour_preference_profiles: [],
    }
  }

  const result = await ConversationalAiService.processConversation(messages, { now, state: current, recentTurns: messages })

  // A question about the platform is answered and nothing else: the criteria stay as they are and no
  // matching runs again.
  if (result.intent === 'platform_guidance') {
    return {
      extraction: {
        is_complete: false,
        processing_status: 'Success',
        retry_available: false,
        follow_up_questions: [],
        tour_context: applyConversationState({}, current),
        conversational_reply: finalReply(result.conversational_reply),
        intent: result.intent,
        missing_primary: result.missing_primary,
      },
      tour_preference_profile: null,
      tour_preference_profiles: [],
    }
  }

  const villages = await loadVillages()
  let state = Object.keys(result.tour_context).length > 0
    ? mergeConversationState(current, latest, result.tour_context, now(), undefined, villages)
    : result.delta_validation
      ? applyConversationDelta(current, result.delta_validation, now())
      : current

  // A date already behind us is named as such; it is not kept, so the next turn asks for a new one.
  const pastNotice = pastDateNotice(latest, now())
  if (pastNotice && state.date) {
    state = { ...state, slots: { ...state.slots } }
    delete state.date
    delete state.slots.date
  }

  await saveConversationState(sessionId, state)

  const questions = missingQuestions(state).map(question => question.text)
  const isComplete = !pastNotice && isCompleteConversationState(state)
  const tourContext = applyConversationState({}, state)

  // One profile per craft the Agency named: crafts are suggested separately, never merged.
  const profiles: CraftProfile[] = []
  if (isComplete) {
    for (const craft of craftSuggestionTargets(state)) {
      const context: TourContext = { ...tourContext, craft_preference: craft }
      delete context.craft_preferences
      profiles.push({ craft, label: craftLabelVi(craft), profile: await buildTourPreferenceProfile(context, exclusionsOf(state)) })
    }
    if (profiles.length === 0) profiles.push({ craft: '', label: '', profile: await buildTourPreferenceProfile(tourContext, exclusionsOf(state)) })
  }

  return {
    extraction: {
      is_complete: isComplete,
      processing_status: 'Success',
      retry_available: false,
      follow_up_questions: pastNotice ? ['Bạn muốn đi vào ngày nào?'] : questions,
      tour_context: tourContext,
      conversational_reply: pastNotice ?? finalReply(result.conversational_reply),
      intent: result.intent,
      missing_primary: result.missing_primary,
    },
    tour_preference_profile: profiles[0]?.profile ?? null,
    tour_preference_profiles: profiles,
  }
}
