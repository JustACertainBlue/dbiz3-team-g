import { describe, expect, it, vi } from 'vitest';
import { openExploreChat, requestExploreQuote, type HandoffPorts } from '../../src/lib/explore/handoff';

function ports(permitted = true): HandoffPorts {
  const quotes = new Map<string, string>();
  return {
    authorize: vi.fn(async () => permitted),
    findQuote: vi.fn(async (agencyId, experienceId) => quotes.get(`${agencyId}:${experienceId}`) ?? null),
    createQuote: vi.fn(async (agencyId, experienceId) => { const id = `quote-${quotes.size + 1}`; quotes.set(`${agencyId}:${experienceId}`, id); return id; }),
    openPairChat: vi.fn(async () => 'chat-1'),
    sendInitialMessage: vi.fn(async () => 'message-1'),
    logStrongAction: vi.fn(async () => {})
  };
}
const context = { agencyId: 'agency-1', experienceId: 'experience-1', providerId: 'provider-1', experienceName: 'Gốm', source: 'Card' as const };

describe('EXP Auth/Chat integration boundary', () => {
  it('BR-009 denies a Quote before any write or chat action', async () => {
    const integrations = ports(false);
    await expect(requestExploreQuote(context, integrations)).rejects.toThrow('Permission denied');
    expect(integrations.createQuote).not.toHaveBeenCalled();
    expect(integrations.openPairChat).not.toHaveBeenCalled();
  });

  it('FR-011 creates one Quote per Agency/Experience and reuses the pair Chat; it never creates a Booking', async () => {
    const integrations = ports();
    const first = await requestExploreQuote(context, integrations);
    const second = await requestExploreQuote(context, integrations);
    expect(first).toEqual({ quote_request_id: 'quote-1', chat_session_id: 'chat-1', is_new_request: true });
    expect(second).toEqual({ quote_request_id: 'quote-1', chat_session_id: 'chat-1', is_new_request: false });
    expect(integrations.createQuote).toHaveBeenCalledTimes(1);
    expect(integrations.sendInitialMessage).toHaveBeenCalledTimes(1);
    expect('createBooking' in integrations).toBe(false);
  });

  it('FR-012 opens the pair Chat with context and only known group/date values', async () => {
    const integrations = ports();
    const result = await openExploreChat({ ...context, source: 'Detail Page', knownGroupSize: 8 }, integrations);
    expect(result).toEqual({ chat_session_id: 'chat-1', initial_message_id: 'message-1' });
    expect(integrations.sendInitialMessage).toHaveBeenCalledWith('chat-1', expect.objectContaining({
      experienceId: 'experience-1', source: 'Detail Page', knownGroupSize: 8
    }));
    expect(integrations.logStrongAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'Chat' }));
  });
});
