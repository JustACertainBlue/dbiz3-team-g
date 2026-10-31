import { findAgencyByUserId, findProviderByUserId, findUserById } from './seed-accessor'

export interface AuthContext {
  userId: string
  role: 'TourAgency' | 'LocalProvider' | 'Admin' | 'Guest'
  agencyId?: string
  providerId?: string
}

export class ChatAuthError extends Error {
  constructor(message: string, public statusCode = 403) {
    super(message)
    this.name = 'ChatAuthError'
  }
}

/**
 * Validates that the caller has an active authenticated session
 * and is either a Tour Agency or a Local Provider (BR-001, BR-003).
 */
export function assertChatParticipantRole(context: AuthContext): void {
  if (!context || !context.userId) {
    throw new ChatAuthError('Authentication required', 401)
  }

  if (context.role !== 'TourAgency' && context.role !== 'LocalProvider') {
    throw new ChatAuthError(
      `Role ${context.role} is not permitted to participate in Agency-Provider chat (BR-001)`,
      403
    )
  }

  const user = findUserById(context.userId)
  if (!user || (user.account_status !== 'Approved' && user.account_status !== 'Active')) {
    throw new ChatAuthError('User account is inactive or disabled', 403)
  }
}

/**
 * Validates that an Agency and Provider pair is being formed (BR-001, BR-016).
 */
export function validatePairRoles(
  initiator: AuthContext,
  recipientUserIdOrProfileId: string
): { agencyId: string; providerId: string } {
  assertChatParticipantRole(initiator)

  let agencyId: string | undefined
  let providerId: string | undefined

  if (initiator.role === 'TourAgency') {
    agencyId = initiator.agencyId || findAgencyByUserId(initiator.userId)?.agency_id
    // Recipient can be provider_id or provider user_id
    const provByProfile = findProviderByUserId(recipientUserIdOrProfileId)
    providerId = provByProfile?.provider_id || recipientUserIdOrProfileId
  } else if (initiator.role === 'LocalProvider') {
    providerId = initiator.providerId || findProviderByUserId(initiator.userId)?.provider_id
    // Recipient can be agency_id or agency user_id
    const agencyByProfile = findAgencyByUserId(recipientUserIdOrProfileId)
    agencyId = agencyByProfile?.agency_id || recipientUserIdOrProfileId
  }

  if (!agencyId || !providerId) {
    throw new ChatAuthError(
      'Chat is available only between a Tour Agency and a Local Provider (BR-001)',
      403
    )
  }

  return { agencyId, providerId }
}

