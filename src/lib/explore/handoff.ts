export type HandoffSource = 'Card' | 'Detail Page';
export interface HandoffContext {
  agencyId: string;
  experienceId: string;
  providerId: string;
  experienceName: string;
  source: HandoffSource;
  knownGroupSize?: number;
  knownDates?: { from?: string; to?: string };
}

/** Auth and Chat module implementations must supply these ports using the authenticated session. */
export interface HandoffPorts {
  authorize: (agencyId: string, action: 'Request Quote' | 'Chat') => Promise<boolean>;
  findQuote: (agencyId: string, experienceId: string) => Promise<string | null>;
  // The adapter must enforce UNIQUE(agency_id, experience_id) atomically, including concurrent retries.
  createQuote: (agencyId: string, experienceId: string) => Promise<string>;
  // The adapter must reuse one active conversation for each Agency–Provider pair.
  openPairChat: (agencyId: string, providerId: string) => Promise<string>;
  sendInitialMessage: (chatId: string, context: HandoffContext & { quoteRequestId?: string }) => Promise<string>;
  logStrongAction: (event: HandoffContext & { action: 'Request Quote' | 'Chat' }) => Promise<void>;
}

function requireContext(context: HandoffContext) {
  if (!context.agencyId || !context.experienceId || !context.providerId || !context.experienceName) throw new Error('Incomplete Explore handoff context');
  if (context.knownGroupSize !== undefined && (!Number.isInteger(context.knownGroupSize) || context.knownGroupSize < 1)) throw new Error('Invalid known group size');
}

export async function requestExploreQuote(context: HandoffContext, ports: HandoffPorts) {
  requireContext(context);
  if (!await ports.authorize(context.agencyId, 'Request Quote')) throw new Error('Permission denied');
  const existing = await ports.findQuote(context.agencyId, context.experienceId);
  const quote_request_id = existing ?? await ports.createQuote(context.agencyId, context.experienceId);
  const chat_session_id = await ports.openPairChat(context.agencyId, context.providerId);
  if (!existing) {
    await ports.sendInitialMessage(chat_session_id, { ...context, quoteRequestId: quote_request_id });
    await ports.logStrongAction({ ...context, action: 'Request Quote' });
  }
  return { quote_request_id, chat_session_id, is_new_request: !existing };
}

export async function openExploreChat(context: HandoffContext, ports: HandoffPorts) {
  requireContext(context);
  if (!await ports.authorize(context.agencyId, 'Chat')) throw new Error('Permission denied');
  const chat_session_id = await ports.openPairChat(context.agencyId, context.providerId);
  const initial_message_id = await ports.sendInitialMessage(chat_session_id, context);
  await ports.logStrongAction({ ...context, action: 'Chat' });
  return { chat_session_id, initial_message_id };
}
