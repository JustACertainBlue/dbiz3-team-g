export interface QuoteRequestParams {
  agencyId: string
  experienceId: string
  sessionId?: string
}

export interface QuoteRequestResult {
  quote_request_id: string
  is_new_request: boolean
  agency_id: string
  experience_id: string
  created_at: string
}

export interface ChatHandoffParams {
  agencyId: string
  providerId: string
  contextMessage?: string
}

export interface ChatHandoffResult {
  chat_session_id: string
  is_new_session: boolean
  agency_id: string
  provider_id: string
  messages: string[]
}

const quoteRequestsByPair = new Map<string, QuoteRequestResult>()
const chatSessionsByPair = new Map<string, ChatHandoffResult>()
const agencyBookings = new Map<string, number>()

export async function createOrReuseQuoteRequest(
  params: QuoteRequestParams
): Promise<QuoteRequestResult> {
  const pairKey = `${params.agencyId}:::${params.experienceId}`

  const existing = quoteRequestsByPair.get(pairKey)
  if (existing) {
    return {
      ...existing,
      is_new_request: false,
    }
  }

  const newQuote: QuoteRequestResult = {
    quote_request_id: `quote-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    is_new_request: true,
    agency_id: params.agencyId,
    experience_id: params.experienceId,
    created_at: new Date().toISOString(),
  }

  quoteRequestsByPair.set(pairKey, newQuote)
  return newQuote
}

export async function openOrReuseChat(
  params: ChatHandoffParams
): Promise<ChatHandoffResult> {
  const pairKey = `${params.agencyId}:::${params.providerId}`

  const existing = chatSessionsByPair.get(pairKey)
  if (existing) {
    if (params.contextMessage) {
      existing.messages.push(params.contextMessage)
    }
    return {
      ...existing,
      is_new_session: false,
    }
  }

  const newChat: ChatHandoffResult = {
    chat_session_id: `chat-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    is_new_session: true,
    agency_id: params.agencyId,
    provider_id: params.providerId,
    messages: params.contextMessage ? [params.contextMessage] : [],
  }

  chatSessionsByPair.set(pairKey, newChat)
  return newChat
}

export async function countBookingsForAgency(agencyId: string): Promise<number> {
  // BR-009 / BR-010: AI Tour Matching does NOT create bookings
  return agencyBookings.get(agencyId) || 0
}
